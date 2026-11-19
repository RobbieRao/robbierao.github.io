import {galleryPoseEnvelope,sequenceSample} from './face-sequence-time.js';

const width=480, height=600;
let sharedPromise=null, users=0;

async function packet(name,revision,signal) {
  const url='/assets/face-study/gallery/warps/'+name+'.gz'+(revision?'?v='+encodeURIComponent(revision):'');
  const response=await fetch(url,{signal,cache:revision?'force-cache':'default'});
  if (!response.ok) throw Error('Unavailable portrait motion grid');
  let data=await response.arrayBuffer();
  if (new DataView(data).getUint16(0)===0x1f8b)
    data=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  signal?.throwIfAborted();
  return data;
}

function readMesh(data) {
  const d=new DataView(data), n=d.getUint16(4,true);
  const count=d.getUint16(6,true)*3, small=d.getUint16(8,true)*3, dental=d.getUint16(10,true)*7;
  if (d.getUint32(0)!==0x46504d33 || !n || data.byteLength!==12+5*n+2*(count+small+dental+dental/7)) throw Error('Invalid portrait grid');
  return {n,xy:Float32Array.from(new Int16Array(data,12,2*n),v=>v/16),
    tris:new Uint16Array(data,12+4*n,count),lite:new Uint16Array(data,12+4*n+2*count,small),
    dental:new Uint16Array(data,12+4*n+2*(count+small),dental),
    restGaps:new Int16Array(data,12+4*n+2*(count+small+dental),dental/7),
    eyes:new Uint8Array(data,12+4*n+2*(count+small+dental+dental/7),n)};
}
function readFlow(data,mesh) {
  const n=mesh.n;
  const d=new DataView(data),rank=d.getUint16(6,true), frames=d.getUint16(8,true);
  if (d.getUint32(0)!==0x46505732 || d.getUint16(10,true)!==mesh.restGaps.length || d.getUint16(4,true)!==n || !rank || !frames ||
      data.byteLength!==12+rank*(4+2*frames+2*n)+2*frames*mesh.restGaps.length) throw Error('Invalid projected displacement');
  return {rank,frames,scales:new Float32Array(data,12,rank),weights:new Int16Array(data,12+4*rank,frames*rank),
    gaps:new Int16Array(data,12+4*rank+2*frames*rank,frames*mesh.restGaps.length),
    basis:new Int8Array(data,12+4*rank+2*frames*(rank+mesh.restGaps.length))};
}

function sample(flow,action,progress,offset) {
  const t=sequenceSample(action,progress),i=Math.floor(t),j=Math.min(flow.frames-1,i+1),f=t-i;
  const envelope=galleryPoseEnvelope(action,progress)/32767;
  offset.fill(0);
  for (let k=0;k<flow.rank;k++) {
    const a=flow.weights[i*flow.rank+k], b=flow.weights[j*flow.rank+k];
    const w=(a+(b-a)*f)*flow.scales[k]*envelope;
    if (!w) continue;
    const at=k*offset.length;
    for(let v=0;v<offset.length;v++) offset[v]+=flow.basis[at+v]*w;
  }
}

function exposure(gap) {
  const t=Math.max(0,Math.min(1,(gap-.006)/.015));
  return t*t*(3-2*t);
}

// Project the separately opening inner seal on both the texture frame and
// the target frame. The middle columns are the same anatomical lip
// intersections used by the full 3D stencil, including asymmetric closure.
function mapDentition(mesh,flow,action,progress,delta,gain,sourceGain,correction,reference=null) {
  const sample=sequenceSample(action,progress),i=Math.floor(sample),j=Math.min(flow.frames-1,i+1);
  const nr=mesh.restGaps.length, envelope=galleryPoseEnvelope(action,progress);
  for(let c=0;c<nr;c++) {
    const col=c*7, lo=mesh.dental[col]*2, hi=mesh.dental[col+6]*2;
    const rest=mesh.restGaps[c]/32767;
    const moving=(flow.gaps[i*nr+c]+(sample-i)*(flow.gaps[j*nr+c]-flow.gaps[i*nr+c]))*envelope/32767;
    const src=exposure(rest+sourceGain*moving),dst=exposure(rest+gain*moving);
    const rx=mesh.xy[hi]-mesh.xy[lo], ry=mesh.xy[hi+1]-mesh.xy[lo+1];
    const dx=delta[hi]-delta[lo],dy=delta[hi+1]-delta[lo+1];
    const sx=rx+sourceGain*dx,sy=ry+sourceGain*dy, tx=rx+gain*dx,ty=ry+gain*dy;
    const sourceHeight=Math.max(0,src*sy), targetHeight=Math.max(0,dst*ty);
    const travel=Math.min(Math.max(targetHeight-sourceHeight,-sourceHeight*.8),sourceHeight*.78);
    // A subject with an open neutral seal exposes more of the upper teeth.
    // Reserve the flexible strip for the dark space between the dental arches.
    const gapCentre=.48+.21*Math.min(1,Math.max(0,ry)/9);
    for(let row=1;row<6;row++) {
      const f=(row-1)/4, id=4*mesh.dental[col+row];
      const srcOffset=.5+(f-.5)*src-row/6;
      const dstOffset=.5+(f-.5)*dst-row/6;
      const centre=Math.max(0,Math.min(1,(f-gapCentre+.2)/.4));
      correction[id]=tx*dstOffset;correction[id+1]=ty*dstOffset;
      correction[id+2]=sx*srcOffset;
      correction[id+3]=sy*srcOffset+travel*(f-centre*centre*(3-2*centre));
      if(reference) {
        const v=mesh.dental[col+row],uv=v*2;
        reference[id]=mesh.xy[uv]+sourceGain*delta[uv]+correction[id+2];
        reference[id+1]=mesh.xy[uv+1]+sourceGain*delta[uv+1]+correction[id+3];
        reference[id+2]=1.;
        // A closed neutral lip has no dental sample behind it. The high
        // plate can reveal enamel missed in the narrow capture-strength slit.
        reference[id+3]=sourceGain===0 ? Math.max(0,Math.min(1,(rest-.012)/.035))
          : Math.max(0,Math.min(1,sourceHeight/2.));
      }
    }
  }
}

async function createShared() {
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,depth:false,stencil:false});
  if (!gl) return null;
  function shader(type,source) {
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    return s;
  }
  const program=gl.createProgram();
  const vert=shader(gl.VERTEX_SHADER,`
    attribute vec2 neutral,delta;
    attribute float eye;
    attribute vec4 apertureShift,dentalReference;
    uniform float gain,sourceGain;
    varying vec2 uv,rest;
    varying float eyeRegion;
    varying vec4 dentalSample;
    void main() {
      vec2 size=vec2(480.,600.);
      rest=neutral/size;
      uv=(neutral+sourceGain*delta)/size;
      uv+=apertureShift.zw/size;
      vec2 p=(neutral+gain*delta+apertureShift.xy)/size;
      gl_Position=vec4(2.*p.x-1.,1.-2.*p.y,0.,1.);
      eyeRegion=eye;
      dentalSample=dentalReference;
    }`);
  const frag=shader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    uniform sampler2D frame,poster,oralPlate;
    uniform vec4 oralUV;
    uniform float oralMix;
    uniform float restAmount;
    varying vec2 uv,rest;
    varying float eyeRegion;
    varying vec4 dentalSample;
    void main() {
      vec4 colour=texture2D(frame,uv);
      // At tiny gain the neutral portrait retains the undistorted skin and
      // brow. Keep reading the moving iris inside its now registered lid.
      float neutralMix=restAmount*(1.-smoothstep(.94,1.,eyeRegion));
      if (neutralMix>0.) colour=mix(colour,texture2D(poster,rest),neutralMix);
      float oralWeight=smoothstep(.98,1.,dentalSample.z)*dentalSample.w*oralMix;
      if(oralWeight>0.) {
        vec2 projected=dentalSample.xy*oralUV.xy+oralUV.zw;
        colour=mix(colour,texture2D(oralPlate,projected),oralWeight);
      }
      gl_FragColor=colour;
    }`);
  gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);
  const parallel=gl.getExtension('KHR_parallel_shader_compile');
  while(parallel && !gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)) {
    if(gl.isContextLost())return null;
    await new Promise(resolve=>setTimeout(resolve,8));
  }
  gl.deleteShader(vert);gl.deleteShader(frag);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const loc=name=>gl.getUniformLocation(program,name);
  const attrs=['neutral','delta','eye','apertureShift','dentalReference'].map(name=>gl.getAttribLocation(program,name));
  attrs.forEach(a=>gl.enableVertexAttribArray(a));
  gl.uniform1i(loc('frame'),0);gl.uniform1i(loc('poster'),1);gl.uniform1i(loc('oralPlate'),2);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  function tex() {
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    for (const k of [gl.TEXTURE_MAG_FILTER,gl.TEXTURE_MIN_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
    for (const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));return t;
  }
  function buffer(target,values,usage=gl.STATIC_DRAW) {
    const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,values,usage);return b;
  }
  const targetGain=loc('gain'),imageGain=loc('sourceGain'),restAmount=loc('restAmount');
  function bind(mesh) {
    const base=buffer(gl.ARRAY_BUFFER,mesh.xy),offset=buffer(gl.ARRAY_BUFFER,mesh.xy.byteLength,gl.DYNAMIC_DRAW);
    const eyes=buffer(gl.ARRAY_BUFFER,mesh.eyes),index=buffer(gl.ELEMENT_ARRAY_BUFFER,mesh.tris);
    const dental=buffer(gl.ARRAY_BUFFER,mesh.n*16,gl.DYNAMIC_DRAW);
    const film=tex(),neutral=tex(),oral=tex();
    const reference=buffer(gl.ARRAY_BUFFER,mesh.n*16,gl.DYNAMIC_DRAW);
    let lastOral=null;
    let lastPoster=null, filmW=0,filmH=0;
    return {
      draw(source,poster,deltas,correction,gain,sourceGain,w,h,layer,coords) {
        if(gl.isContextLost())return false;
        if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
        gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,film);
        const fw=source.videoWidth||source.naturalWidth||source.width,fh=source.videoHeight||source.naturalHeight||source.height;
        if (fw===filmW && fh===filmH)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
        else { gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);filmW=fw;filmH=fh; }
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,neutral);
        if(poster && poster!==lastPoster) {
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,poster);lastPoster=poster;
        }
        gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,oral);
        if(layer && lastOral!==layer.image) {
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,layer.image);lastOral=layer.image;
        }
        if(layer)gl.uniform4f(loc('oralUV'),1/layer.w,1/layer.h,layer.x/layer.w,layer.y/layer.h);
        gl.uniform1f(loc('oralMix'),layer?.mix||0);
        gl.uniform1f(targetGain,gain);gl.uniform1f(imageGain,sourceGain);
        const t=Math.max(0,1-gain/.52);
        gl.uniform1f(restAmount,poster?t*t:0);
        gl.bindBuffer(gl.ARRAY_BUFFER,base);gl.vertexAttribPointer(attrs[0],2,gl.FLOAT,false,0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,offset);gl.bufferSubData(gl.ARRAY_BUFFER,0,deltas);
        gl.vertexAttribPointer(attrs[1],2,gl.FLOAT,false,0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,eyes);gl.vertexAttribPointer(attrs[2],1,gl.UNSIGNED_BYTE,false,0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,dental);gl.bufferSubData(gl.ARRAY_BUFFER,0,correction);
        gl.vertexAttribPointer(attrs[3],4,gl.FLOAT,false,0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,reference);if(layer)gl.bufferSubData(gl.ARRAY_BUFFER,0,coords);
        gl.vertexAttribPointer(attrs[4],4,gl.FLOAT,false,0,0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.drawElements(gl.TRIANGLES,mesh.tris.length,gl.UNSIGNED_SHORT,0);
        return true;
      },
      dispose() { [base,offset,eyes,index,dental,reference].forEach(b=>gl.deleteBuffer(b));[film,neutral,oral].forEach(t=>gl.deleteTexture(t)); }
    };
  }
  return {canvas,bind,dispose(){gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}

// Browsers without a WebGL context use a coarser subset of the same controls.
// Each destination triangle maps to one source patch, including at gain > 1.
function paint2D(ctx,mesh,delta,correction,gain,sourceGain,source,w,h,layer,coords) {
  const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;
  const {xy,lite}=mesh, sx=sw/width,sy=sh/height, dx=w/width,dy=h/height;
  for(let i=0;i<lite.length;i+=3) {
    const a=2*lite[i],b=2*lite[i+1],c=2*lite[i+2];
    const sourceX=k=>(xy[k]+delta[k]*sourceGain+correction[2*k+2])*sx, sourceY=k=>(xy[k+1]+delta[k+1]*sourceGain+correction[2*k+3])*sy;
    const targetX=k=>(xy[k]+delta[k]*gain+correction[2*k])*dx, targetY=k=>(xy[k+1]+delta[k+1]*gain+correction[2*k+1])*dy;
    const x=sourceX(a),y=sourceY(a),u=sourceX(b)-x,v=sourceY(b)-y,r=sourceX(c)-x,s=sourceY(c)-y;
    const ox=targetX(a),oy=targetY(a),U=targetX(b)-ox,V=targetY(b)-oy,R=targetX(c)-ox,S=targetY(c)-oy;
    const det=u*s-r*v;if(Math.abs(det)<.001)continue;
    let A=(U*s-R*v)/det,B=(V*s-S*v)/det,C=(R*u-U*r)/det,D=(S*u-V*r)/det;
    ctx.save();ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+U,oy+V);ctx.lineTo(ox+R,oy+S);ctx.closePath();ctx.clip();
    ctx.setTransform(A,B,C,D,ox-A*x-C*y,oy-B*x-D*y);ctx.drawImage(source,0,0);
    if(layer && Math.min(coords[a*2+2],coords[b*2+2],coords[c*2+2])>.99){
      const wx=k=>coords[k*2]+layer.x, wy=k=>coords[k*2+1]+layer.y;
      const xx=wx(a),yy=wy(a),du=wx(b)-xx,dv=wy(b)-yy,dr=wx(c)-xx,ds=wy(c)-yy;
      const dd=du*ds-dr*dv;
      if(Math.abs(dd)>.001) {
        A=(U*ds-R*dv)/dd;B=(V*ds-S*dv)/dd;C=(R*du-U*dr)/dd;D=(S*du-V*dr)/dd;
        ctx.globalAlpha=layer.mix*(coords[a*2+3]+coords[b*2+3]+coords[c*2+3])/3;
        ctx.setTransform(A,B,C,D,ox-A*xx-C*yy,oy-B*xx-D*yy);ctx.drawImage(layer.image,0,0,layer.w,layer.h);
      }
    }
    ctx.restore();
  }
}

export function createPlateWarp(node,model) {
  const plate=document.createElement('canvas');plate.className='face-plate-warp';plate.setAttribute('aria-hidden','true');
  Object.assign(plate.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'2',pointerEvents:'none'});
  plate.hidden=true;node.append(plate);
  const ctx=plate.getContext('2d',{alpha:false}),lifetime=new AbortController();
  const clipCache=new Map();
  let mesh=null,meshPromise=null,offset=null,correction=null,refCorrection=null,refCoords=null,gpu=null,pool=null,lastAction=null,lastPaint=null,disposed=false,graphicsReady=null,graphicsPrepared=false;
  async function prepare(action,signal) {
    if(disposed || signal?.aborted)return false;
    meshPromise ||= packet(model.id+'.mesh',model.warpRevision,lifetime.signal).then(readMesh)
      .catch(error=>{meshPromise=null;throw error;});
    mesh=await meshPromise;signal?.throwIfAborted();lifetime.signal.throwIfAborted();
    offset ||= new Float32Array(mesh.n*2);
    correction ||= new Float32Array(mesh.n*4);
    refCorrection ||= new Float32Array(mesh.n*4);refCoords ||= new Float32Array(mesh.n*4);
    if(!graphicsReady) {
      users++;
      // Keep the already decoded movie visible while the GPU compiles. No
      // context or shader is allocated on a visit that stays at native gain.
      sharedPromise ||= new Promise(resolve=>setTimeout(resolve,0)).then(createShared).catch(()=>null);
      graphicsReady=sharedPromise.then(result=>{
        if(disposed)return;
        if(result){pool=result;gpu=result.bind(mesh);}
        graphicsPrepared=true;
      });
    }
    let entry=clipCache.get(action.id);
    if(!entry || (!entry.flow && entry.signal?.aborted)) {
      entry={signal};clipCache.set(action.id,entry);
      entry.promise=packet(model.id+'-'+action.id+'.flow',action.warpRevision,signal||lifetime.signal)
        .then(bytes=>{
          entry.flow=readFlow(bytes,mesh);
          if(entry.flow.frames!==action.frames)throw Error('Portrait motion clock mismatch');
          while(clipCache.size>4) {
            const key=[...clipCache.keys()].find(k=>k!==lastAction && k!==action.id && clipCache.get(k).flow);
            if(!key)break;
            releaseEntry(clipCache.get(key));clipCache.delete(key);
          }
        }).catch(error=>{if(clipCache.get(action.id)===entry)clipCache.delete(action.id);throw error;});
    }
    await Promise.all([entry.promise,graphicsReady]);signal?.throwIfAborted();return !disposed;
  }
  function releaseEntry(entry) {
    entry?.oralLoad?.abort();entry?.oralImage?.close?.();
  }
  function requestOralPlate(entry,action) {
    const spec=action.mouthPlate;
    if(!spec || entry.oralLoad || entry.oralFailed)return;
    const request=entry.oralLoad=new AbortController();
    const url='/assets/face-study/gallery/warps/'+model.id+'-'+action.id+'.mouth.webp?v='+encodeURIComponent(spec.revision);
    fetch(url,{signal:request.signal,cache:'force-cache',priority:'auto'}).then(async response=>{
      if(!response.ok)throw Error('Missing dental reference');
      const blob=await response.blob();
      let image;
      if(typeof createImageBitmap==='function')image=await createImageBitmap(blob);
      else {
        const url=URL.createObjectURL(blob);
        try {image=new Image();image.src=url;await image.decode();}
        finally {URL.revokeObjectURL(url);}
      }
      if(request.signal.aborted || disposed){image.close?.();return;}
      entry.oralImage=image;
      if(lastPaint?.action===action && !plate.hidden && lastPaint.source.paused!==false)paint(lastPaint);
    }).catch(()=>{if(!request.signal.aborted)entry.oralFailed=true;});
  }
  function hide(){plate.hidden=true;lastPaint=null;}
  function paint(info) {
    let {action,progress,gain,sourceGain,source,poster}=info;
    const entry=clipCache.get(action?.id),flow=entry?.flow;
    if(disposed || !graphicsPrepared || !ctx || !flow || !source || !Number.isFinite(gain) || !Number.isFinite(progress) ||
        !Number.isFinite(sourceGain) || ('readyState' in source && source.readyState<2))return false;
    if(poster instanceof HTMLImageElement && (!poster.complete || !poster.naturalWidth))poster=null;
    if(source instanceof HTMLImageElement && (!source.complete || !source.naturalWidth))return false;
    lastAction=action.id;
    const w=Math.max(1,Math.min(width,Math.round(node.clientWidth*Math.min(2,devicePixelRatio||1))));
    const h=Math.round(w*height/width);
    if(plate.width!==w)plate.width=w;if(plate.height!==h)plate.height=h;
    sample(flow,action,progress,offset);
    mapDentition(mesh,flow,action,progress,offset,gain,sourceGain,correction);
    let layer=null,referenceGain=0;
    if(gain<.85 && sourceGain>0 && poster) {
      const t=Math.max(0,Math.min(1,(.85-gain)/.53));
      layer={image:poster,x:0,y:0,w:width,h:height,mix:t*t*(3-2*t)};
    } else if(gain>1.05 && sourceGain===1 && action.mouthPlate) {
      requestOralPlate(entry,action);
      if(entry.oralImage){
        const spec=action.mouthPlate,f=Math.round(sequenceSample(action,progress));
        const t=Math.max(0,Math.min(1,(gain-1.05)/.44));
        layer={image:entry.oralImage,x:(f%spec.cols)*spec.w-spec.x,y:Math.floor(f/spec.cols)*spec.h-spec.y,
          w:entry.oralImage.width,h:entry.oralImage.height,mix:t*t*(3-2*t)};
        referenceGain=2;
      }
    }
    if(layer)mapDentition(mesh,flow,action,progress,offset,gain,referenceGain,refCorrection,refCoords);
    ctx.fillStyle='white';ctx.fillRect(0,0,w,h);
    if(!gpu && gain===0 && poster)ctx.drawImage(poster,0,0,w,h);
    else if(gpu?.draw(source,poster,offset,correction,gain,sourceGain,w,h,layer,refCoords))ctx.drawImage(pool.canvas,0,0);
    else paint2D(ctx,mesh,offset,correction,gain,sourceGain,source,w,h,layer,refCoords);
    plate.hidden=false;lastPaint=info;return true;
  }
  return {prepare,paint,hide,has:action=>graphicsPrepared && !!clipCache.get(action?.id)?.flow,dispose(){
    if(disposed)return;
    disposed=true;lastPaint=null;lifetime.abort();for(const entry of clipCache.values())releaseEntry(entry);clipCache.clear();gpu?.dispose();plate.remove();
    if(graphicsReady && --users===0){sharedPromise.then(result=>result?.dispose());sharedPromise=null;}
  }};
}
