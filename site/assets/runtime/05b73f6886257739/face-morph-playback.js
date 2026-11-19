import * as THREE from '/assets/vendor/three-0.185.0/three.module.min.js';
import {MORPH_WIDTH,packMorphs} from './face-morph-worker.js';
import {sequenceSample} from './face-sequence-time.js';

const CAPACITY=24;
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));

function packer(anchors,amounts) {
  let worker, pending=null, serial=0, disposed=false;
  function unavailable() {
    worker?.terminate();
    worker=null;
    pending?.reject(new Error('Worker unavailable'));
    pending=null;
  }
  return {
    async pack(motion,signal) {
      const samples={rank:motion.rank,vertices:motion.vertices,basis:motion.basis,normalBasis:motion.normalBasis};
      if (worker===undefined && typeof Worker!=='undefined') {
        try {
          worker=new Worker(new URL('./face-morph-worker.js',import.meta.url),{type:'module'});
          worker.onerror=unavailable;
          worker.onmessage=({data})=>{
            if (pending?.id!==data.id) return;
            const item=pending; pending=null;
            if (data.error) item.reject(new Error(data.error)); else item.resolve(data.packed);
          };
          worker.postMessage({type:'rig',anchors:anchors?.slice(),amounts:amounts?.slice()});
        } catch { unavailable(); }
      }
      if (worker) {
        try {
          return await new Promise((resolve,reject)=>{
            pending?.reject(new DOMException('Superseded','AbortError'));
            pending={id:++serial,resolve,reject};
            worker.postMessage({type:'pack',id:serial,motion:samples});
          });
        } catch (error) {
          if (disposed || signal.aborted || worker) throw error;
        }
      }
      return packMorphs(samples,anchors,amounts,async()=>{await yieldTask(); signal.throwIfAborted();});
    },
    dispose() { disposed=true; unavailable(); }
  };
}

function texture(array,width,height,depth) {
  const tex=new THREE.DataArrayTexture(array,width,height,depth);
  tex.format=THREE.RGBAIntegerFormat;
  tex.type=array instanceof Int8Array ? THREE.ByteType : THREE.ShortType;
  tex.internalFormat=array instanceof Int8Array ? 'RGBA8I' : 'RGBA16I';
  tex.needsUpdate=true;
  return tex;
}

function bindMaterial(material, state, groom) {
  const oldCompile=material.onBeforeCompile.bind(material);
  const key=material.customProgramCacheKey();
  material.customProgramCacheKey=()=>key+(groom?'-groom-playback-v1':'-skin-playback-v1');
  material.onBeforeCompile=(shader,renderer)=>{
    oldCompile(shader,renderer);
    Object.assign(shader.uniforms,state);
    const texel=groom?'gl_VertexID':'gl_VertexID*2';
    shader.vertexShader=shader.vertexShader.replace('#include <morphtarget_pars_vertex>',`
      uniform highp isampler2DArray playbackBasis;
      uniform int playbackRank;
      uniform float playbackPosition[${CAPACITY}];
      uniform float playbackNormal[${CAPACITY}];
      uniform float playbackBias;
      vec3 playbackVector(int id, int k) {
        return vec3(texelFetch(playbackBasis,ivec3(id%${MORPH_WIDTH},id/${MORPH_WIDTH},k),0).xyz);
      }`).replace('#include <morphtarget_vertex>',`
      for (int k=0; k<playbackRank; k++)
        transformed+=playbackVector(${texel},k)*playbackPosition[k];`);
    if (!groom) shader.vertexShader=shader.vertexShader.replace('#include <morphnormal_vertex>',`
      if (playbackBias!=0.) objectNormal+=playbackVector(gl_VertexID*2+1,playbackRank)*playbackBias;
      for (int k=0; k<playbackRank; k++)
        objectNormal+=playbackVector(gl_VertexID*2+1,k)*playbackNormal[k];`);
  };
  material.needsUpdate=true;
}

// Only the active and next clip occupy GPU memory. Loading a successor leaves
// the current geometry, crease normals, hair roots and aperture masks intact.
export function createMotionPlayback(mesh,groom,features,renderer) {
  const anchors=groom?.geometry.getAttribute('_groom_anchor')?.array;
  const amounts=groom?.geometry.getAttribute('_groom_weight')?.array;
  const packs=packer(anchors,amounts);
  const empty=texture(new Int8Array(4),1,1,1);
  function uniforms() {
    return {playbackBasis:{value:empty},playbackRank:{value:0},playbackPosition:{value:new Float32Array(CAPACITY)},
      playbackNormal:{value:new Float32Array(CAPACITY)},playbackBias:{value:0}};
  }
  const faceState=uniforms(),groomState=uniforms();
  const base=mesh.geometry.getAttribute('position');
  const groomUnit=anchors ? 1/(255*groom.scale.x) : 0;
  for (const [object,state,isGroom] of [[mesh,faceState,false],[groom,groomState,true]]) {
    if (!object || (isGroom && !anchors)) continue;
    object.customDepthMaterial ||= new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
    for (const mat of [...new Set([].concat(object.material,object.customDepthMaterial))])
      bindMaterial(mat,state,isGroom);
  }
  let active=null, queued=null;
  mesh.getVertexPosition=(index,target)=>{
    target.fromBufferAttribute(base,index);
    if (!active) return target;
    const {basis,vertices,rank}=active.motion, weights=faceState.playbackPosition.value;
    for (let k=0, j=index*3; k<rank; k++,j+=vertices*3) {
      const w=weights[k];
      target.x+=w*basis[j]; target.y+=w*basis[j+1]; target.z+=w*basis[j+2];
    }
    return target;
  };
  function free(clip) {clip?.skin.dispose(); clip?.hair?.dispose();}
  async function prepare(motion,action,signal) {
    if (motion.vertices!==base.count || motion.frames!==action.frames || motion.fps!==action.fps || motion.rank>CAPACITY)
      throw new Error('Incompatible expression samples');
    const batch=await packs.pack(motion,signal);
    signal.throwIfAborted();
    const skin=texture(batch.face,MORPH_WIDTH,batch.faceRows,motion.rank+1);
    const hair=anchors ? texture(batch.groom,MORPH_WIDTH,batch.groomRows,motion.rank) : null;
    const clip={motion,skin,hair};
    try {
      renderer.initTexture(skin);
      if (hair) { await yieldTask(); signal.throwIfAborted(); renderer.initTexture(hair); }
      signal.throwIfAborted();
    } catch(error) { free(clip); throw error; }
    free(queued); queued=clip;
    let previous=null, previousGain=null;
    function pose(progress,gain=1) {
      const sample=progress===null ? -1 : sequenceSample(action,progress);
      if (sample===previous && gain===previousGain) return false;
      previous=sample; previousGain=gain;
      const k0=Math.max(0,Math.floor(sample)), k1=Math.min(k0+1,motion.frames-1), f=sample<0?0:sample-k0;
      const signedGain=sample<0 ? 0 : gain;
      for (let k=0; k<motion.rank; k++) {
        const w0=motion.weights[k0*motion.rank+k], w1=motion.weights[k1*motion.rank+k];
        const w=(w0+(w1-w0)*f)*signedGain;
        faceState.playbackPosition.value[k]=w*motion.scale[k];
        faceState.playbackNormal.value[k]=w*motion.normalScale[k+1];
        groomState.playbackPosition.value[k]=w*motion.scale[k]*groomUnit;
      }
      faceState.playbackBias.value=signedGain*motion.normalScale[0];
      features(sample<0?null:motion.transforms,k0,action,k1,f,signedGain);
      return true;
    }
    return ()=>{
      signal.throwIfAborted();
      free(active); active=clip; queued=null;
      faceState.playbackBasis.value=skin; faceState.playbackRank.value=motion.rank;
      if (hair) { groomState.playbackBasis.value=hair; groomState.playbackRank.value=motion.rank; }
      return pose;
    };
  }
  return {prepare,dispose(){packs.dispose();free(active);free(queued);empty.dispose();}};
}
