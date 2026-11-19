import * as THREE from '/assets/vendor/three-0.185.0/three.module.min.js';
import {GLTFLoader} from '/assets/vendor/three-0.185.0/loaders/GLTFLoader.js';
import {createLashes} from './face-lashes.js';
import {alignDentalRig,createLipAperture} from './face-lip-aperture.js';
import {galleryPoseEnvelope,sequenceFrame} from './face-sequence-time.js';
import {faceAlignment} from './face-gpa.js';
import {createMotionPlayback} from './face-morph-playback.js';
import {prepareGroomMotion,ScaledMorphAttribute} from './face-groom-motion.js';
import {applyFaceSurface,loadFaceSurface} from './face-surface.js';

const clamp = THREE.MathUtils.clamp;

async function fetchBytes(url, signal, priority = 'auto') {
  const response = await fetch(url, {signal,priority,cache:url.searchParams.has('v')?'force-cache':'default'});
  if (!response.ok) throw new Error(`Could not load ${url.pathname} (${response.status})`);
  let bytes = await response.arrayBuffer();
  // Some hosts send a gzip file as data; others decode Content-Encoding.
  if (bytes.byteLength >= 2 && new DataView(bytes).getUint16(0) === 0x1f8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = await new Response(stream).arrayBuffer();
  }
  signal.throwIfAborted();
  return bytes;
}

async function readMotion(url, signal, priority) {
  const bytes = await fetchBytes(url,signal,priority);
  const h = new DataView(bytes);
  if (h.byteLength < 24 || h.getUint32(0) !== 0x52524631) throw new Error('Invalid face motion');
  const vertices = h.getUint32(4,true), rank = h.getUint32(8,true), frames = h.getUint32(12,true);
  const weightsAt = 24 + 4 * rank, basisAt = weightsAt + 4 * rank * frames;
  const transformsAt = basisAt + vertices * 3 * rank;
  const normalScalesAt=transformsAt+36*frames*4;
  const normalBasisAt=normalScalesAt+4*(rank+1);
  if (!vertices || !rank || !frames || h.getUint32(20,true)!==3 || normalBasisAt+3*vertices*(rank+1)!==bytes.byteLength)
    throw new Error('Incomplete face motion');
  return {
    vertices, rank, frames, fps:h.getFloat32(16,true),
    scale:new Float32Array(bytes,24,rank),
    weights:new Float32Array(bytes,weightsAt,frames * rank),
    basis:new Int8Array(bytes,basisAt,vertices * 3 * rank),
    transforms:new Float32Array(bytes.slice(transformsAt,normalScalesAt)),
    normalScale:new Float32Array(bytes.slice(normalScalesAt,normalBasisAt)),
    normalBasis:new Int8Array(bytes,normalBasisAt)
  };
}

// A stencil follows the actual deforming lip or eyelid loop. The scanned
// display proxies behind these openings must never project onto the skin.
function makeAperture(face, rim, bit, updateLid, capacity=rim.length) {
  const centerIndex=capacity+1;
  const coordinates = new THREE.BufferAttribute(new Float32Array((capacity+2)*3),3).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',coordinates);
  const triangles = [];
  for (let i = 0; i < capacity; i++) triangles.push(centerIndex,i,i+1);
  geometry.setIndex(triangles);
  const stencil = new THREE.MeshBasicMaterial({
    colorWrite:false, depthTest:false, depthWrite:false, side:THREE.DoubleSide,
    stencilWrite:true, stencilRef:bit, stencilWriteMask:bit, stencilFunc:THREE.AlwaysStencilFunc,
    stencilZPass:THREE.ReplaceStencilOp
  });
  const mask = new THREE.Mesh(geometry,stencil);
  mask.renderOrder = -1;
  mask.frustumCulled = false;
  face.add(mask);

  const center = new THREE.Vector3(), point = new THREE.Vector3();
  const start=new THREE.Vector3(), axis=new THREE.Vector3(), offset=new THREE.Vector3();
  return function pose(weight, indices=rim, chord=null) {
    mask.visible = weight>1e-6;
    if (!mask.visible) return;
    if (chord) {
      face.getVertexPosition(chord[0],start);
      face.getVertexPosition(chord[1],axis).sub(start);
    }
    const denominator=Math.max(axis.lengthSq(),1e-12);
    center.set(0,0,0);
    for (let i = 0; i < indices.length; i++) {
      face.getVertexPosition(indices[i],point);
      if (chord && weight<1) {
        const along=offset.copy(point).sub(start).dot(axis)/denominator;
        offset.copy(start).addScaledVector(axis,along);
        point.lerp(offset,1-weight);
      }
      coordinates.setXYZ(i,point.x,point.y,point.z);
      center.add(point);
    }
    coordinates.setXYZ(indices.length,coordinates.getX(0),coordinates.getY(0),coordinates.getZ(0));
    center.multiplyScalar(1/indices.length);
    coordinates.setXYZ(centerIndex,center.x,center.y,center.z);
    geometry.setDrawRange(0,indices.length*3);
    coordinates.needsUpdate = true;
    updateLid?.(coordinates.array,indices.length);
  };
}

function restrict(material,bit,compare = THREE.EqualStencilFunc) {
  material.stencilWrite = true;
  material.stencilRef = material.stencilFuncMask = bit;
  material.stencilFunc = compare;
}

function mouthAperture(face, oral) {
  const rim = face.userData.mouthRim, capStart = face.userData.mouthOpenIndexCount;
  if (!rim?.length || !Number.isInteger(capStart)) return null;
  const skin = face.material, cap = skin.clone();
  restrict(cap,1,THREE.NotEqualStencilFunc);
  face.material = [skin,cap];
  face.geometry.clearGroups();
  face.geometry.addGroup(0,capStart,0);
  face.geometry.addGroup(capStart,face.geometry.index.count-capStart,1);
  const seen = new Set();
  for (const part of oral) {
    // The glTF shares a material across the two moving jaws, tongue and cavity.
    if (seen.has(part.material)) part.material = part.material.clone();
    seen.add(part.material);
    for (const material of [].concat(part.material)) restrict(material,1);
    part.castShadow = false;
    part.receiveShadow = false;
  }
  return createLipAperture(face,rim,measureOpening(oral,face));
}

// Measure the moving lids or lips once in face space. Each rigid part follows
// its own recorded transform while sampling the same opening.
function measureOpening(parts,face) {
  const sections=Array.from({length:9},()=>new THREE.Vector2());
  const bounds=new THREE.Vector2(), inverseFace=new THREE.Matrix4();
  for (const part of parts)
    part.userData.opening={sections,bounds,toFace:new THREE.Matrix4()};
  return (points,count)=>{
    let min=Infinity,max=-Infinity;
    for (let i=0;i<count;i++) { min=Math.min(min,points[i*3]); max=Math.max(max,points[i*3]); }
    const width=Math.max(max-min,.00001);
    bounds.set(min,width);
    sections.forEach(s=>s.set(Infinity,-Infinity));
    for (let i=0;i<count;i++) {
      const j=(i+1)%count, x=(points[i*3]-min)*8/width, end=(points[j*3]-min)*8/width;
      if (Math.abs(end-x)<.000001) continue;
      const from=Math.max(0,Math.ceil(Math.min(x,end)-.00001)), to=Math.min(8,Math.floor(Math.max(x,end)+.00001));
      for (let k=from;k<=to;k++) {
        const t=clamp((k-x)/(end-x),0,1), y=THREE.MathUtils.lerp(points[i*3+1],points[j*3+1],t);
        sections[k].x=Math.min(sections[k].x,y); sections[k].y=Math.max(sections[k].y,y);
      }
    }
    face.updateMatrix();
    inverseFace.copy(face.matrix).invert();
    for (const part of parts) {
      part.updateMatrix();
      part.userData.opening.toFace.multiplyMatrices(inverseFace,part.matrix);
    }
  };
}

function bindEyesAndMouth(scene, face, upperDefinition) {
  const parts = ['EyeLeft','EyeRight','OralUpper','OralLower','OralTongue'].map(name => scene.getObjectByName(name));
  const neutral = parts.map(part => part && {position:part.position.clone(),rotation:part.quaternion.clone()});
  const cavity = scene.getObjectByName('OralCavity');
  const oral = [...parts.slice(2),cavity].filter(Boolean);
  const aperture=mouthAperture(face,oral);
  const alignDentition=alignDentalRig(face,parts[2],oral,aperture);
  const eyelids = [];
  const usedIrisMaterials=new Set();
  for (const eye of parts.slice(0,2)) {
    const rim = eye && face.userData.eyeRims?.[eye.name];
    if (!rim?.length) continue;
    if (usedIrisMaterials.has(eye.material)) eye.material=eye.material.clone();
    usedIrisMaterials.add(eye.material);
    for (const material of [].concat(eye.material)) restrict(material,2);
    eye.castShadow = false;
    const measure=measureOpening([eye],face), lashes=createLashes(face,rim,upperDefinition);
    eyelids.push(makeAperture(face,rim,2,(points,count)=>{
      measure(points,count);
      lashes(points);
    }));
  }
  const nextRotation=new THREE.Quaternion(), nextPosition=new THREE.Vector3();
  return (transforms,frame=0,action=null,nextFrame=frame,mix=0,gain=1) => {
    const open=aperture?.sample(gain) ?? false;
    const extra=transforms && gain>1 && aperture ? aperture.centre : null;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (transforms) {
        const a=frame*36+i*7;
        part.quaternion.fromArray(transforms,a);
        part.position.fromArray(transforms,a+4);
        if (mix) {
          const b=nextFrame*36+i*7;
          part.quaternion.slerp(nextRotation.fromArray(transforms,b),mix);
          part.position.lerp(nextPosition.fromArray(transforms,b+4),mix);
        }
        const rigidGain=i>=2 && extra ? 1 : gain;
        if (rigidGain!==1) {
          nextRotation.copy(part.quaternion);
          part.quaternion.copy(neutral[i].rotation).slerp(nextRotation,rigidGain);
          part.position.sub(neutral[i].position).multiplyScalar(rigidGain).add(neutral[i].position);
        }
        const follow=i>=2 && extra?.[i===2?0:1];
        if (follow) {
          part.position.add(follow.extra);
          // The lower lip everts as the mouth opens. Carrying the mandible
          // through its full extra travel would bury the lower incisors.
          if (gain>1.1 && extra[0] && extra[1]) {
            const gap=Math.max(0,extra[0].extra.y-extra[1].extra.y);
            const exaggeration=THREE.MathUtils.smoothstep(gain,1.1,2);
            part.position.y+=gap*exaggeration*(i===2?-.055:.17);
          }
        }
      } else {
        part.quaternion.copy(neutral[i].rotation);
        part.position.copy(neutral[i].position);
      }
    }
    if (cavity && parts[2]) {
      cavity.position.copy(parts[2].position);
      cavity.quaternion.copy(parts[2].quaternion);
    }
    for (const part of oral) part.visible=open;
    if (open) {
      alignDentition();
      aperture.updateMaterials();
    }
    for (const update of eyelids) update(true);
  };
}

// Geometry and Unity's mapped surface normals share the recorded frame weights.
async function prepareMotion(mesh, motion, action, updateFeatures, signal, groom, restNormals) {
  const {rank, frames, vertices, scale, basis, weights} = motion;
  if (frames!==action.frames || motion.fps!==action.fps) throw new Error('Unity sequence timebase mismatch');
  const source = mesh.geometry, base = source.getAttribute('position');
  if (base.count !== vertices) throw new Error('Face and motion have different vertex counts');
  const stride=3*vertices, positions=[], normalDeltas=[];
  const biased=new Float32Array(stride);
  for (let v=0; v<vertices; v++) {
    const j=v*3, scale=motion.normalScale[0], bias=motion.normalBasis;
    biased[j]=restNormals.getX(v)+scale*bias[j];
    biased[j+1]=restNormals.getY(v)+scale*bias[j+1];
    biased[j+2]=restNormals.getZ(v)+scale*bias[j+2];
  }
  const posedNormals=new THREE.BufferAttribute(biased,3);
  for (let k=0;k<rank;k++) {
    signal.throwIfAborted();
    const positionStart=k*stride, normalStart=(k+1)*stride;
    positions.push(new ScaledMorphAttribute(basis.subarray(positionStart,positionStart+stride),scale[k]));
    normalDeltas.push(new ScaledMorphAttribute(motion.normalBasis.subarray(normalStart,normalStart+stride),motion.normalScale[k+1]));
  }
  const commitGroom=await prepareGroomMotion(groom,positions,signal);
  // Install the new targets together: Three caches the morph texture by geometry.
  // Do not mutate the currently drawn action while its successor is being decoded.
  signal.throwIfAborted();
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name,attribute);
  geometry.setIndex(source.index);
  for (const group of source.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
  geometry.boundingBox = source.boundingBox;
  geometry.boundingSphere = source.boundingSphere;
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = positions;
  geometry.morphAttributes.normal = normalDeltas;
  let previous=null;
  function pose(progress) {
    const frame=progress===null ? -1 : sequenceFrame(action,progress);
    if (frame===previous) return false;
    if (previous===null || (frame<0)!==(previous<0))
      geometry.setAttribute('normal',frame<0 ? restNormals : posedNormals);
    previous=frame;
    for (let k = 0; k < rank; k++) {
      mesh.morphTargetInfluences[k] = frame<0 ? 0 : weights[frame*rank+k];
    }
    updateFeatures(frame<0 ? null : motion.transforms,frame,action);
    return true;
  }
  return () => {
    signal.throwIfAborted();
    mesh.geometry = geometry;
    source.dispose();
    mesh.updateMorphTargets();
    commitGroom?.(mesh.morphTargetInfluences);
    return pose;
  };
}

function releaseModel(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    if (node.customDepthMaterial) materials.add(node.customDepthMaterial);
    for (const m of [].concat(node.material)) materials.add(m);
  });
  for (const material of materials) {
    for (const slot of Object.values(material)) if (slot?.isTexture) textures.add(slot);
    material.dispose();
  }
  for (const texture of textures) {
    texture.dispose();
    texture.image?.close?.();
  }
  for (const geometry of geometries) geometry.dispose();
}

async function loadIdentity(record, baseURL, signal, includeSurface=false) {
  const modelURL = new URL(record.model,baseURL);
  const modelBytes = await fetchBytes(modelURL,signal);
  signal.throwIfAborted();
  const [asset, opticalDetail] = await Promise.allSettled([
    new GLTFLoader().parseAsync(modelBytes,new URL('.',modelURL).href),
    includeSurface ? loadFaceSurface(record,baseURL,signal) : null
  ]);
  const surface = opticalDetail.status === 'fulfilled' ? opticalDetail.value : null;
  if (asset.status === 'rejected') { surface?.dispose(); throw asset.reason; }
  const {scene} = asset.value;
  try {
    signal.throwIfAborted();
    const face = scene.getObjectByName('Face');
    if (!face?.isMesh) throw new Error('The portrait has no Face mesh');
    scene.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true;
      if (node.name==='GroomFibers') {
        // Give the dense part of a lock a contact shadow. The clear space
        // between strands does not contribute depth to the light's view.
        const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
        depth.onBeforeCompile=shader=>{
          shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',
            'if (diffuseColor.a < .38) discard;');
        };
        node.customDepthMaterial=depth;
      }
      node.receiveShadow = true;
      for (const m of [].concat(node.material)) {
        m.dithering = true;
        if (m.isMeshStandardMaterial) {
          m.metalness = 0;
          if (node === face) m.roughness = 0.70;
          else if (node.name.startsWith('Eye')) m.roughness = 0.20;
        }
      }
    });
    // One neutral registration for the entire identity. Unity's expression
    // samples, eye / dental transforms and groom remain in their source space.
    const root = new THREE.Group();
    root.matrixAutoUpdate = false;
    root.matrix.fromArray(record.alignment || faceAlignment[record.id]);
    root.add(scene);
    const features = bindEyesAndMouth(scene,face,record.presentation?.upperLashDefinition);
    const groom=scene.getObjectByName('GroomFibers');
    const restNormals=face.geometry.getAttribute('normal');
    features(null);
    let playback=null;
    const gazeRotation=new THREE.Vector4(1,0,1,0);
    return {
      root,surface,presentation:record.presentation,gazeRotation,
      setGaze(yaw,pitch) {
        const h=THREE.MathUtils.degToRad(yaw), v=THREE.MathUtils.degToRad(pitch);
        gazeRotation.set(Math.cos(h),Math.sin(h),Math.cos(v),Math.sin(v));
      },
      enableGalleryPlayback(renderer) { playback=createMotionPlayback(face,groom,features,renderer); },
      prepareMotion: (motion,action,signal) => playback ? playback.prepare(motion,action,signal)
        : prepareMotion(face,motion,action,features,signal,groom,restNormals),
      dispose: () => { playback?.dispose(); surface?.dispose(); releaseModel(scene); }
    };
  } catch (error) {
    surface?.dispose();
    releaseModel(scene);
    throw error;
  }
}

async function loadPortrait(record,action,baseURL,signal) {
  const portrait = await loadIdentity(record,baseURL,signal);
  try {
    const motion = await readMotion(new URL(action.file,baseURL),signal);
    const activate = await portrait.prepareMotion(motion,action,signal);
    const pose = activate();
    return {...portrait,pose};
  } catch (error) {
    portrait.dispose();
    throw error;
  }
}

// A transparent, on-demand portrait studio. Model selection and the playback
// clock belong to the host so the stimulus and its event marker share one time.
export async function createFaceStage(canvas, {onContextLost, assetBase='/assets/face-study/'} = {}) {
  const baseURL = new URL(assetBase,document.baseURI);
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias:true, alpha:true, stencil:true, powerPreference:'low-power'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,16);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);
  const pivot = new THREE.Group();
  scene.add(pivot);

  scene.add(new THREE.HemisphereLight(0xf9fbff, 0xe2d8cb, 1.10));
  function light(color, intensity, x, y, z) {
    const lamp = new THREE.DirectionalLight(color, intensity);
    lamp.position.set(x,y,z);
    scene.add(lamp);
    return lamp;
  }
  const key = light(0xfff8ef, 2.12, -3.1, 4, 4.3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera, {left:-1.75,right:1.75,top:1.75,bottom:-1.75,near:2,far:10});
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.00028;
  key.shadow.normalBias = 0.006;
  key.shadow.radius = 7;
  key.shadow.intensity = 0.33;
  light(0xe5edff, 0.69, 3.3, 0.9, 2.6);
  light(0xfbfdff, 1.18, 2.7, 3.0, -2.3);

  let active = null, controller = null, revision = 0;
  let visible = true, alive = true, lost = false, scheduled = 0;
  let pointerX = 0, pointerY = 0, lastDraw = 0, progress = 0;
  const portraits = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.8, Math.sqrt(1100000 / (w * h)));
    renderer.setDrawingBufferSize(w, h, pixelRatio);
    const aspect = w/h;
    // Frame the eyes, leaving the scanned shoulders to continue below the stage.
    const halfHeight = Math.max(0.91, 0.76/aspect);
    camera.left = -halfHeight * aspect;
    camera.right = -camera.left;
    camera.top = 0.20 + halfHeight;
    camera.bottom = 0.20 - halfHeight;
    camera.updateProjectionMatrix();
    queueDraw();
  }

  function draw(now) {
    scheduled = 0;
    if (!active || !alive || lost || document.hidden || !visible) return;
    const elapsed = Math.min(80, Math.max(1, now - lastDraw));
    lastDraw = now;
    const ease = 1 - Math.exp(-elapsed / 65);
    const yaw = pointerX * 0.18, pitch = pointerY * 0.08;
    pivot.rotation.y += (yaw - pivot.rotation.y) * ease;
    pivot.rotation.x += (pitch - pivot.rotation.x) * ease;
    renderer.render(scene, camera);
    if (Math.abs(yaw-pivot.rotation.y) + Math.abs(pitch-pivot.rotation.x) > 0.001) queueDraw();
  }

  function queueDraw() {
    if (active && alive && visible && !lost && !document.hidden && !scheduled)
      scheduled = requestAnimationFrame(draw);
  }
  function stopDraw() {
    cancelAnimationFrame(scheduled);
    scheduled = 0;
  }
  function setProgress(value) {
    const next = clamp(Number(value) || 0, 0, 1);
    if (next === progress) return;
    progress = next;
    active?.pose(progress);
    // The host already calls this inside its stimulus/EEG animation frame.
    // Rendering here keeps the moving face on that same display refresh.
    if (active && visible && alive && !lost && !document.hidden) {
      stopDraw();
      draw(performance.now());
    }
  }
  function setPointer(x,y) {
    pointerX = reduced.matches ? 0 : clamp(x, -1, 1);
    pointerY = reduced.matches ? 0 : clamp(y, -1, 1);
    queueDraw();
  }

  async function setModel(record, action = record.actions.find(a => a.id === record.defaultAction) || record.actions[0]) {
    const ticket = ++revision;
    controller?.abort();
    controller = null;
    if (!alive || lost) return false;
    const cacheKey = record.id + '/' + action.id;
    let portrait = portraits.get(cacheKey);
    if (!portrait) {
      controller = new AbortController();
      try {
        portrait = await loadPortrait(record, action, baseURL, controller.signal);
      } catch (error) {
        if (ticket !== revision || error.name === 'AbortError') return false;
        throw error;
      }
      if (!alive || lost || ticket !== revision) {
        portrait.dispose();
        return false;
      }
    }
    controller = null;
    if (active) pivot.remove(active.root);
    active = portrait;
    // Keep the adjacent identity warm for ordinary back-and-forth comparison.
    portraits.delete(cacheKey);
    portraits.set(cacheKey, portrait);
    if (portraits.size > 2) {
      const oldest = portraits.keys().next().value;
      portraits.get(oldest).dispose();
      portraits.delete(oldest);
    }
    pivot.add(active.root);
    pivot.rotation.set(0, 0, 0);
    active.pose(0);
    progress = 0;
    resize();
    renderer.render(scene,camera);
    return true;
  }

  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(canvas);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) queueDraw(); else stopDraw();
  });
  visibility.observe(canvas);
  function tabChanged() { if (document.hidden) stopDraw(); else queueDraw(); }
  function motionChanged() { setPointer(0,0); }
  function contextLost(event) {
    event.preventDefault();
    lost = true;
    controller?.abort();
    stopDraw();
    onContextLost?.();
  }
  document.addEventListener('visibilitychange', tabChanged);
  reduced.addEventListener('change', motionChanged);
  canvas.addEventListener('webglcontextlost', contextLost);
  resize();
  return {
    setModel, setProgress, setPointer,
    snapshot() {
      if (!active || lost || !alive) return null;
      renderer.render(scene,camera);
      return canvas.toDataURL('image/png');
    },
    dispose() {
      alive = false; revision++; stopDraw(); controller?.abort();
      sizeObserver.disconnect(); visibility.disconnect();
      reduced.removeEventListener('change', motionChanged);
      document.removeEventListener('visibilitychange', tabChanged);
      canvas.removeEventListener('webglcontextlost', contextLost);
      for (const entry of portraits.values()) entry.dispose();
      portraits.clear(); key.shadow.dispose(); renderer.dispose();
    }
  };
}

// The reflection environment is baked once. Large white cards produce broad
// skin and hair highlights without showing any of the lighting rig in the frame.
function softboxes(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color().setRGB(.065,.074,.09);
  const disk = new THREE.CircleGeometry(1,48);
  const sources = [];
  for (const [x,y,z,w,h,power] of [
    [-3.8,4.0,4.2,2.5,2.8,6.8], [3.8,1.8,2.8,2.5,2.1,2.6],
    [2.5,3.8,-2.6,1.9,2.8,5.8]
  ]) {
    const material = new THREE.MeshBasicMaterial({
      color:new THREE.Color().setRGB(power,power,power),side:THREE.DoubleSide
    });
    const card = new THREE.Mesh(disk,material);
    card.position.set(x,y,z); card.scale.set(w,h,1); card.lookAt(0,0,0);
    studio.add(card); sources.push(material);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromScene(studio,0,.1,30,{size:64});
  generator.dispose(); disk.dispose(); sources.forEach(source=>source.dispose());
  return environment;
}

// Deep3DMM/hifi3dpp.py stores three rows of nine real SH coefficients and
// adds .8 to DC. Fold its Lambertian basis factors into RGB uniforms once.
function sourceIllumination(rgb) {
  if (!rgb) return null;
  const a2c2=(2*Math.PI/Math.sqrt(8))*(3*Math.sqrt(5)/Math.sqrt(12*Math.PI));
  const factors=[Math.sqrt(Math.PI)/2,Math.sqrt(Math.PI),Math.sqrt(Math.PI),Math.sqrt(Math.PI),
    a2c2,a2c2,a2c2/(2*Math.sqrt(3)),a2c2,a2c2/2];
  return factors.map((factor,i)=>new THREE.Vector3(...rgb.map(row=>(row[i]+(i===0?.8:0))*factor)));
}

// All materials, including the aperture stencil, share the portrait's camera crop.
function finishPortrait(portrait,slot) {
  const face = portrait.root.getObjectByName('Face'), geometry = face.geometry;
  const illumination = sourceIllumination(portrait.presentation?.lightSH);
  const irisRGB=portrait.presentation?.irisSRGB;
  const irisPigment=irisRGB && new THREE.Color().setRGB(...irisRGB.map(v=>v/255),THREE.SRGBColorSpace);
  const uvs=geometry.getAttribute('uv'), rim=face.userData.mouthRim;
  const mouthUV=new THREE.Box2();
  for (const index of rim || []) mouthUV.expandByPoint(new THREE.Vector2(uvs.getX(index),uvs.getY(index)));
  const lipCentre=mouthUV.isEmpty()?new THREE.Vector2(.5,.58):mouthUV.getCenter(new THREE.Vector2());
  const lipSize=mouthUV.isEmpty()?new THREE.Vector2(.15,.04):mouthUV.getSize(new THREE.Vector2());
  // The lip aperture only describes the inner seam; include the photographed vermilion.
  const featureUV=new THREE.Vector4(lipCentre.x,lipCentre.y,Math.max(.055,lipSize.x*.58),Math.max(.016,lipSize.y*.85));
  portrait.root.traverse(node=>{
    if (!node.isMesh) return;
    const isSkin = node===face, isFibre=node.name==='GroomFibers';
    const hasFibreAxis=isFibre && node.geometry.hasAttribute('_fibre_tangent');
    const opening=node.userData.opening, eye=opening && node.name.startsWith('Eye');
    const cavity=node.name==='OralCavity';
    for (const mat of [].concat(node.material)) {
      mat.clippingPlanes = slot.crop;
      if (!mat.colorWrite) continue;
      const materialKey = isSkin ? (portrait.surface ? 'skin-surface-v1' : 'print-skin-v2') : eye ? 'ocular-v9-gaze' : opening ? (cavity ? 'oral-cavity' : 'oral-anatomy') : isFibre ? (hasFibreAxis ? 'fibre-flow-v1' : 'fibre-reflection-v1') : 'print-object-v1';
      mat.customProgramCacheKey = () => materialKey + (illumination ? '-capture-fill' : '')
        + (eye && irisPigment ? '-donor-iris' : '')
        + (isFibre && mat.userData.opacityVolume==='portrait' ? '-portrait-volume' : '');
      mat.onBeforeCompile = shader=>{
        if (isFibre) {
          if (mat.vertexColors && mat.userData.opacityVolume!=='portrait') {
            // The surface atlas begins after eight 48-pixel fibre swatches.
            // Real strands carry a grazing silhouette as the volume approaches
            // edge-on. Fade the coarser optical approximation at that contour.
            shader.uniforms.fibreAtlasStart={value:384/mat.map.image.width};
            shader.fragmentShader='uniform float fibreAtlasStart;\n'+shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
              if(vMapUv.x>fibreAtlasStart) {
                vec3 facet=cross(dFdx(vViewPosition),dFdy(vViewPosition));
                float facing=abs(dot(facet,normalize(vViewPosition)))/max(length(facet),1e-8);
                diffuseColor.a*=smoothstep(.10,.62,facing);
              }`);
          }
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',
            '#include <lights_physical_fragment>\nmaterial.specularColor*=.22; material.specularF90*=.62;');
          if (hasFibreAxis) {
            shader.vertexShader='attribute vec4 _fibre_tangent; varying vec3 fibreAxis;\n'+shader.vertexShader
              .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nfibreAxis=normalMatrix*_fibre_tangent.xyz;');
            shader.fragmentShader='varying vec3 fibreAxis;\n'+shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
              #if NUM_DIR_LIGHTS > 0
                // The cylinder reflection follows each lock as the head turns.
                // Its strength comes from the light that reached the fibres.
                vec3 tangent=normalize(fibreAxis+normal*.075);
                vec3 halfAngle=normalize(directionalLights[0].direction+normalize(vViewPosition));
                float inclination=dot(tangent,halfAngle);
                float angular=max(0.,1.-inclination*inclination);
                float lightAtLock=clamp(dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722))
                    /max(.012,dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),0.,1.);
                float sheen=.0035*pow(angular,7.)+.009*pow(angular,31.);
                reflectedLight.directSpecular+=lightAtLock*sheen*vec3(1.,.93,.85);
              #endif`);
          }
        }
        if (opening) {
          if (eye) {
            shader.uniforms.gazeRotation={value:portrait.gazeRotation};
            shader.fragmentShader='uniform vec4 gazeRotation;\n'+shader.fragmentShader;
          }
          if (eye && irisPigment) {
            shader.uniforms.irisPigment={value:irisPigment};
            shader.uniforms.irisProfile={value:new THREE.Vector2(
              portrait.presentation.irisScale,portrait.presentation.pupilFraction)};
          }
          shader.uniforms.toFace={value:opening.toFace};
          shader.uniforms.openingBounds={value:opening.bounds};
          shader.uniforms.sectionEdges={value:opening.sections};
          if (eye && irisPigment) shader.fragmentShader='uniform vec3 irisPigment; uniform vec2 irisProfile;\n'+shader.fragmentShader;
          shader.vertexShader='varying vec2 aperturePoint; uniform mat4 toFace;\n'+shader.vertexShader.replace(
            '#include <begin_vertex>','#include <begin_vertex>\naperturePoint=(toFace*vec4(position,1.)).xy;'
          );
          shader.fragmentShader='varying vec2 aperturePoint; uniform vec2 openingBounds; uniform vec2 sectionEdges[9];\n'+shader.fragmentShader.replace(
            '#include <map_fragment>', `#include <map_fragment>
            float width=max(openingBounds.y,.00001);
            float u=clamp((aperturePoint.x-openingBounds.x)/width,0.,1.);
            float column=u*8.;
            int k=int(min(floor(column),7.));
            vec2 edges=mix(sectionEdges[k],sectionEdges[k+1],column-float(k));
            float fromUpper=(edges.y-aperturePoint.y)/width;
            float fromLower=(aperturePoint.y-edges.x)/width;
            float corner=smoothstep(.48,.97,abs(u*2.-1.));` + (eye ? `
            // V9 maps the exposed anterior eye into a front-facing UV patch.
            // Inverse-rotate the optical hemisphere under the recorded lids;
            // the fitted socket and the corneal light reflection stay in place.
            const float globe=.40;
            vec2 disk=(vMapUv-.5)*vec2(1.,-1.)/globe;
            float depth=sqrt(max(0.,1.-dot(disk,disk)));
            float eyeZ=gazeRotation.y*disk.x+gazeRotation.x*depth;
            vec2 turned=vec2(gazeRotation.x*disk.x-gazeRotation.y*depth,
                             gazeRotation.z*disk.y-gazeRotation.w*eyeZ);
            vec2 opticalUV=vMapUv+(turned-disk)*vec2(globe,-globe)*(1.-smoothstep(.84,1.24,length(disk)));
            ${irisPigment ? `
            float taper=1.-smoothstep(.20,.34,length(opticalUV-.5));
            opticalUV=.5+(opticalUV-.5)/mix(1.,irisProfile.x,taper);
            ` : ''}
            diffuseColor.rgb=texture2D(map,opticalUV).rgb;
            float cornea=1.-smoothstep(.172,.205,length(opticalUV-.5));
            float lidShadow=1.-smoothstep(-.015,.17,fromUpper);
            float rimShadow=1.-smoothstep(-.01,.053,fromLower);
            float contact=clamp(lidShadow*.68+rimShadow*.19+corner*.35,0.,1.);
            vec3 whiteBalance=mix(vec3(.73,.70,.69),vec3(1.),cornea);
            ${irisPigment ? `
            // Transfer a photographed pigment onto the V9 fibres. Keep the
            // dark pupil, limbus and scleral vessels distinct at oblique angles.
            float radius=length(opticalUV-.5);
            float sourceTone=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
            float fibres=clamp(pow(max(sourceTone,.001)/.017,1.08),.34,1.95);
            float limbus=smoothstep(.135,.178,radius);
            vec3 stroma=irisPigment*fibres*mix(1.,.35,limbus);
            float iris=(1.-smoothstep(.173,.199,radius))*(1.-smoothstep(.039,.28,sourceTone));
            float pupilRadius=irisProfile.y*.182;
            float pupil=1.-smoothstep(pupilRadius-.007,pupilRadius+.007,radius);
            diffuseColor.rgb=mix(diffuseColor.rgb,mix(stroma,vec3(.0027),pupil),iris);
            // A thin upper-lid shadow seats the iris and sclera in the same
            // opening. It follows the recorded rim when the expression changes.
            float overhead=.32;
            #if NUM_DIR_LIGHTS > 0
              overhead+=.45*max(0.,directionalLights[0].direction.y);
            #endif
            float overhang=overhead*exp2(-8.5*max(0.,fromUpper))*(1.-.24*corner);
            diffuseColor.rgb*=mix(vec3(1.),vec3(.22,.18,.17),overhang);
            whiteBalance=mix(vec3(.61,.60,.59),vec3(1.),cornea);
            ` : ''}
            diffuseColor.rgb*=whiteBalance*mix(vec3(1.),vec3(.43,.36,.33),contact);
            ` : `
            // Light reaches incisors through the same deformed lip opening
            // that clips them. Closing lips and posterior teeth lose fill first.
            float clearance=smoothstep(-.008,.105,fromUpper)*smoothstep(-.02,.065,fromLower);
            float exposure=mix(.32,.84,clearance)*(1.-.50*corner);
            diffuseColor.rgb*=exposure;
            `)
          ).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n'+(
            eye ? 'roughnessFactor=mix(.21,.10,cornea);' : (cavity ? 'roughnessFactor=1.;' : 'roughnessFactor=.80;')
          )).replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n'+(
            eye ? (irisPigment
              ? 'material.specularColor*=mix(.075,.55,cornea)*(1.-.55*contact); material.specularF90*=.59;'
              : 'material.specularColor*=mix(.16,.22,cornea)*(1.-.65*contact); material.specularF90*=.43;')
              : (cavity ? 'material.specularColor=vec3(0.); material.specularF90=0.;'
                        : 'material.specularColor*=exposure*.62; material.specularF90*=exposure;')
          ));
        }
        if (isSkin) {
          shader.uniforms.featureUV={value:featureUV};
          shader.fragmentShader = 'uniform vec4 featureUV;\n'+shader.fragmentShader.replace(
            '#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            vec2 lip=(vMapUv-featureUV.xy)/featureUV.zw;
            vec2 nose=(vMapUv-featureUV.xy+vec2(0.,featureUV.z*.95))/(featureUV.z*vec2(.55,.77));
            roughnessFactor-=.22*(1.-smoothstep(.64,1.15,length(lip)))+.11*(1.-smoothstep(.50,1.13,length(nose)));`
          );
        }
        if (!isSkin) shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>', '#include <dithering_fragment>\n'
          + (opening ? '' : 'gl_FragColor.rgb=clamp((gl_FragColor.rgb-vec3(.55))*1.17+vec3(.55),0.,1.);\n')
          + 'gl_FragColor.rgb=mix(vec3(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722))),gl_FragColor.rgb,1.08);\n'
        );
        if (isSkin) applyFaceSurface(shader,portrait.surface);
        if (illumination && mat.isMeshStandardMaterial) {
          shader.uniforms.sourceSH = {value:illumination};
          shader.fragmentShader = 'uniform vec3 sourceSH[9];\n'+shader.fragmentShader.replace(
            '#include <lights_fragment_end>', `#include <lights_fragment_end>
            { vec3 n=normal;
            vec3 fill=sourceSH[0]-n.y*sourceSH[1]+n.z*sourceSH[2]-n.x*sourceSH[3]
              +n.x*n.y*sourceSH[4]-n.y*n.z*sourceSH[5]+(3.*n.z*n.z-1.)*sourceSH[6]
              -n.x*n.z*sourceSH[7]+(n.x*n.x-n.y*n.y)*sourceSH[8];
            ${isSkin ? 'fill=vec3(dot(fill,vec3(.2126,.7152,.0722)));' : ''}
            reflectedLight.indirectDiffuse=mix(reflectedLight.indirectDiffuse,
              material.diffuseContribution*clamp(fill,vec3(.05),vec3(2.2))*.48,.45); }`
          );
        }
      };
    }
  });
}

// A frontal camera gives every identity the same magnification in the contact
// sheet. White gutters mark the real crop at the base of each portrait.
export async function createEnsemble(canvas, models, {
  onReadyFace, onContextLost, assetBase='/assets/face-study/', reducedMotion=false
} = {}) {
  const baseURL = new URL(assetBase,document.baseURI);
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias:true, alpha:true, stencil:true, powerPreference:'high-performance'
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.setClearColor(0,0);
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,80);
  const fitToPlate = !!canvas.closest('.home-face-hero');
  camera.position.set(0,0,15);
  const environment = softboxes(renderer);
  scene.environment=environment.texture;
  scene.environmentIntensity=.43;
  scene.add(new THREE.HemisphereLight(0xf4f7ff,0xe2d2c5,.21));
  function light(color,intensity,x,y,z) {
    const source = new THREE.DirectionalLight(color,intensity);
    source.position.set(x,y,z);
    scene.add(source);
    return source;
  }
  const key = light(0xfff8ef,3.82,-6.3,4.15,4.55);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  key.castShadow = true;
  key.shadow.mapSize.set(1536,1536);
  Object.assign(key.shadow.camera,{left:-8.6,right:8.6,top:5.8,bottom:-5.8,near:.1,far:26});
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.intensity=.60; key.shadow.normalBias=.011; key.shadow.bias=-.0002; key.shadow.radius=4;
  light(0xdbe6ff,.24,5,.8,3.4);
  light(0xffeedf,1.05,3.4,2.8,-4.2);
  const slots = models.map(record=>{
    const anchor = new THREE.Group(), turn = new THREE.Group();
    // Retain a trace of the selected source pose around the GPA reference.
    const pose = new THREE.Vector3().fromArray(record.presentation?.poseRadians || [0,0,0]);
    const maxAngle = Math.max(Math.abs(pose.x),Math.abs(pose.y),Math.abs(pose.z),1e-6);
    pose.multiplyScalar(Math.min(.32,THREE.MathUtils.degToRad(1.5)/maxAngle));
    anchor.add(turn); scene.add(anchor);
    anchor.visible = false;
    const crop = [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)]
      .map(normal=>new THREE.Plane(normal));
    return {anchor,turn,crop,poseOffset:pose,progress:0,envelope:1,gain:1,gazeYaw:0,gazePitch:0,promise:null,
      actionId:null,pose:null,model:null,controller:null,entered:0,epoch:0,ready:false};
  });
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reducedMotion || media.matches;
  let alive = true, lost = false, visible = true, request = 0, nextEntrance = 0;
  let viewYaw=0, viewPitch=0, detailIndex=null, lastTime=0;
  let quality = 1, slowFrames = 0, shadowRefresh = true;
  let visibleFaces = null, lastShadowTime = -Infinity, shadowTimer = 0;
  const inView = i => detailIndex === null ? !visibleFaces || visibleFaces.has(i) : detailIndex === i;
  const lifetime = new AbortController();
  let building = 0;
  const buildQueue = [];

  // All faces fetch independently. Stagger CPU work when several clips
  // finish downloading together during the initial entrance.
  async function prepareTargets(slot,motion,action,signal) {
    if (building < 2) building++;
    else await new Promise(resolve=>buildQueue.push(resolve));
    try {
      signal.throwIfAborted();
      return await slot.model.prepareMotion(motion,action,signal);
    } finally {
      if (buildQueue.length) buildQueue.shift()();
      else building--;
    }
  }

  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!(width && height)) return;
    const ratio = width / height;
    const single = slots.length===1 || detailIndex!==null;
    const cssColumns = Number.parseInt(getComputedStyle(canvas).getPropertyValue('--gallery-columns'),10);
    const columns = single ? 1 : cssColumns || (ratio<1.45 ? 2 : slots.length);
    const rows = single ? 1 : Math.ceil(slots.length/columns);
    const fieldHeight = rows*2;
    const fieldWidth = fieldHeight*ratio;
    camera.left = -fieldWidth/2; camera.right = fieldWidth/2;
    camera.top = fieldHeight/2; camera.bottom = -fieldHeight/2;
    camera.updateProjectionMatrix();
    renderer.setDrawingBufferSize(width,height,Math.min(devicePixelRatio || 1,1.7,
      Math.sqrt(1150000 / (width*height))) * quality);
    shadowRefresh = true;
    const cellWidth = fieldWidth/columns;
    const cellHeight = fieldHeight/rows;
    // The full-window wall fits a 4:5 plate inside each variable-size cell.
    // Use that same plate for the live mesh during the film-to-WebGL handoff.
    const plateHeight = fitToPlate ? Math.min(cellHeight,cellWidth*5/4) : cellHeight;
    const plateWidth = fitToPlate ? plateHeight*4/5 : cellWidth;
    slots.forEach((slot,i)=>{
      const column = single ? 0 : i%columns, row = single ? 0 : Math.floor(i/columns);
      const x = camera.left+(column+.5)*cellWidth;
      const top = camera.top-row*cellHeight-(cellHeight-plateHeight)/2;
      // Enlarging a gallery plate preserves its framing. Only the separate
      // two-condition figure uses a tighter, wider crop.
      const comparison = slots.length===1;
      const scale = comparison ? 1.095 : 1.025;
      const crown = comparison ? .105 : .173;
      slot.anchor.position.set(x,top-plateHeight*(crown+.5*scale),0);
      slot.anchor.scale.setScalar(scale*plateHeight/2);
      const inset = comparison ? 0 : .019;
      slot.crop[0].constant = -(x-plateWidth*(.5-inset));
      slot.crop[1].constant = x+plateWidth*(.5-inset);
      slot.crop[2].constant = -(top-plateHeight*(1-inset));
      slot.crop[3].constant = top-plateHeight*inset;
    });
    schedule();
  }

  function assemble(now) {
    let moving = false;
    for (const slot of slots) {
      if (!slot.ready || !slot.anchor.visible) continue;
      const t = still() ? 1 : clamp((now-slot.entered)/650,0,1);
      const eased = 1-(1-t)**3;
      slot.turn.position.y = -.028*(1-eased);
      slot.turn.rotation.set(slot.poseOffset.x+viewPitch,slot.poseOffset.y+viewYaw,slot.poseOffset.z,'ZYX');
      if (t<1) moving=true;
      else if (!slot.shadowReady) { slot.shadowReady=true; shadowRefresh=true; }
    }
    // Only sustained slow draws can lower resolution. Long idle periods or
    // asynchronous decoding never count as dropped animation frames.
    if (request && lastTime && now-lastTime < 100 && now-lastTime > 39) slowFrames++;
    else slowFrames = Math.max(0,slowFrames-1);
    if (!reducedMotion && slowFrames >= 15 && quality > .72) {
      quality = Math.max(.72,quality-.14); slowFrames = 0; resize();
    }
    lastTime = now;
    return moving;
  }

  function draw(now) {
    if (!alive || lost || !visible || document.hidden) { request=0; return; }
    const moving = assemble(now);
    request=0;
    // The frontal key and the head pose change very little between samples.
    // Keep eyelids, lips and skin on the display clock; reuse the cast shadow
    // between updates while multiple portraits share the shadow pass.
    if (shadowRefresh && (detailIndex !== null || now-lastShadowTime >= 100)) {
      renderer.shadowMap.needsUpdate=true; shadowRefresh=false; lastShadowTime=now;
      clearTimeout(shadowTimer); shadowTimer=0;
    } else if (shadowRefresh && !shadowTimer) {
      shadowTimer=setTimeout(() => { shadowTimer=0; schedule(); },100-(now-lastShadowTime));
    }
    renderer.render(scene,camera);
    if (moving) schedule();
  }
  function schedule() {
    if (alive && !lost && visible && !document.hidden && !request)
      request=requestAnimationFrame(draw);
  }

  async function prepareFace(index) {
    const slot=slots[index];
    if (!slot || !alive || lost) return false;
    if (slot.promise) return slot.promise;
    const request=slot.modelRequest=new AbortController();
    const abort=()=>request.abort();
    lifetime.signal.addEventListener('abort',abort,{once:true});
    slot.promise = (async () => {
      const portrait=await loadIdentity(models[index],baseURL,request.signal,true);
      if (!alive || lost || request.signal.aborted) { portrait.dispose(); return false; }
      slot.model=portrait;
      portrait.setGaze(slot.gazeYaw,slot.gazePitch);
      slot.turn.add(portrait.root);
      finishPortrait(portrait,slot);
      portrait.enableGalleryPlayback(renderer);
      if (!still()) {
        const now=performance.now(), start=Math.max(nextEntrance,now);
        nextEntrance=start+200;
        if (start>now) await new Promise(resolve=>setTimeout(resolve,start-now));
      }
      if (!alive || lost || request.signal.aborted) return false;
      slot.entered=performance.now(); slot.ready=true;
      slot.anchor.visible=inView(index);
      onReadyFace?.(index);
      schedule();
      return true;
    })().catch(error => {
      if (slot.modelRequest===request) slot.promise=null;
      throw error;
    }).finally(()=>lifetime.signal.removeEventListener('abort',abort));
    return slot.promise;
  }

  async function prepareAction(index,action,priority) {
    const slot=slots[index];
    if (!slot || !action || !alive || lost) return false;
    const ticket=++slot.epoch;
    slot.controller?.abort();
    if (!await prepareFace(index) || ticket!==slot.epoch) return false;
    const controller=slot.controller=new AbortController();
    let activate;
    if (slot.actionId !== action.file) {
      const motion=await readMotion(new URL(action.file,baseURL),controller.signal,priority);
      if (ticket!==slot.epoch || !alive || lost) return false;
      activate=await prepareTargets(slot,motion,action,controller.signal);
    }
    if (ticket!==slot.epoch || !alive || lost) return false;
    return {play(progress=0,envelope=1) {
      if (ticket!==slot.epoch || !alive || lost) return false;
      if (activate) slot.pose=activate();
      slot.actionId=action.file; slot.progress=clamp(progress,0,1); slot.envelope=clamp(envelope,0,1);
      slot.pose(slot.progress,slot.gain*slot.envelope); shadowRefresh=true; schedule();
      return true;
    }};
  }

  async function setAction(index,action) {
    const prepared=await prepareAction(index,action);
    return !!prepared && prepared.play();
  }

  function setProgress(index,value,envelope=1) {
    const slot=slots[index];
    if (!slot?.pose) return;
    const next=clamp(Number(value)||0,0,1);
    if (slot.progress===next && slot.envelope===envelope) return;
    slot.progress=next; slot.envelope=envelope;
    if (slot.pose(next,slot.gain*envelope)) { shadowRefresh=true; schedule(); }
  }
  function setGalleryProgress(index,action,progress) {
    if (slots[index]?.actionId!==action.file) return;
    setProgress(index,progress,galleryPoseEnvelope(action,progress));
  }
  function rest(index) {
    const slot=slots[index];
    if (!slot?.pose) return;
    slot.progress=null; slot.pose(null,slot.gain); shadowRefresh=true; schedule();
  }
  function setGaze(index,yawDegrees=0,pitchDegrees=0) {
    const slot=slots[index];
    if (!slot || !alive || lost || !Number.isFinite(yawDegrees) || !Number.isFinite(pitchDegrees)) return;
    const yaw=clamp(yawDegrees,-16,16), pitch=clamp(pitchDegrees,-10,10);
    if (yaw===slot.gazeYaw && pitch===slot.gazePitch) return;
    slot.gazeYaw=yaw; slot.gazePitch=pitch;
    slot.model?.setGaze(yaw,pitch);
    schedule();
  }
  function setViewAngle(yawDegrees,pitchDegrees=0) {
    if (!alive || lost) return;
    const yaw=THREE.MathUtils.degToRad(clamp(yawDegrees,-18,18));
    const pitch=THREE.MathUtils.degToRad(clamp(pitchDegrees,-13.5,13.5));
    if (viewYaw===yaw && viewPitch===pitch) return;
    viewYaw=yaw; viewPitch=pitch;
    shadowRefresh = true;
    schedule();
  }
  function setDisplacementGain(gain) {
    if (!Number.isFinite(gain) || lost || !alive) return;
    const next = clamp(gain,0,2);
    for (const slot of slots) {
      if (slot.gain === next) continue;
      slot.gain = next;
      if (slot.ready && slot.pose) slot.pose(slot.progress,next*(slot.envelope??1));
    }
    shadowRefresh = true;
    schedule();
  }
  function setDetail(index) {
    if (!alive || lost) return;
    detailIndex = index;
    slots.forEach((slot,i) => { slot.anchor.visible=slot.ready && inView(i); });
    resize();
  }
  function setVisibleFaces(indices) {
    visibleFaces = new Set(indices);
    slots.forEach((slot,i) => { slot.anchor.visible=slot.ready && inView(i); });
    shadowRefresh=true;
    schedule();
  }
  function cancelPrepare(index) {
    const slot=slots[index];
    if (!slot) return;
    ++slot.epoch;
    slot.controller?.abort();
    if (!slot.ready) releaseFace(index);
  }
  function releaseFace(index) {
    const slot=slots[index];
    if (!slot) return;
    ++slot.epoch; slot.modelRequest?.abort(); slot.controller?.abort();
    if (slot.model) {
      slot.turn.remove(slot.model.root); slot.model.dispose();
    }
    Object.assign(slot,{model:null,modelRequest:null,controller:null,promise:null,pose:null,
      progress:null,envelope:1,actionId:null,ready:false,shadowReady:false});
    slot.anchor.visible=false; shadowRefresh=true; schedule();
  }

  // Capture a single portrait with the exact production lens, or capture the
  // empty field (-1) as transparent pixels for the no-WebGL composition.
  function drawLayer(index) {
    if (!alive || lost) return;
    assemble(performance.now());
    slots.forEach((slot,i) => { slot.anchor.visible=slot.ready && (index===undefined || i===index); });
    if (shadowRefresh) { renderer.shadowMap.needsUpdate=true; shadowRefresh=false; }
    renderer.render(scene,camera);
    slots.forEach((slot,i)=>{slot.anchor.visible=slot.ready && inView(i);});
    return canvas;
  }

  const sizeObserver=new ResizeObserver(resize);
  sizeObserver.observe(canvas);
  const observer=new IntersectionObserver(([entry]) => {
    visible=entry.isIntersecting;
    if (visible) schedule(); else { cancelAnimationFrame(request); request=0; }
  });
  observer.observe(canvas);
  function tabChanged() { if (!document.hidden) schedule(); }
  function motionChanged() { schedule(); }
  function contextLost(event) {
    event.preventDefault(); lost=true;
    lifetime.abort();
    for (const slot of slots) slot.controller?.abort();
    onContextLost?.();
  }
  document.addEventListener('visibilitychange',tabChanged);
  media.addEventListener('change',motionChanged);
  canvas.addEventListener('webglcontextlost',contextLost);
  resize();
  return {prepareFace,setAction,prepareAction,cancelPrepare,releaseFace,setProgress,setGalleryProgress,rest,setGaze,setViewAngle,setDetail,setVisibleFaces,setDisplacementGain,drawLayer,
    hideFace(index) {
      const slot=slots[index];
      slot.controller?.abort();
      slot.anchor.visible=slot.ready=false;
      shadowRefresh=true; schedule();
    },
    snapshotLayer(index) { return drawLayer(index)?.toDataURL('image/png'); },
    dispose() {
      alive=false; lifetime.abort(); cancelAnimationFrame(request); clearTimeout(shadowTimer);
      for (const slot of slots) {
        ++slot.epoch; slot.controller?.abort(); slot.model?.dispose();
      }
      sizeObserver.disconnect(); observer.disconnect();
      media.removeEventListener('change',motionChanged);
      document.removeEventListener('visibilitychange',tabChanged);
      canvas.removeEventListener('webglcontextlost',contextLost);
      environment.dispose(); key.shadow.dispose(); renderer.dispose();
    }
  };
}
