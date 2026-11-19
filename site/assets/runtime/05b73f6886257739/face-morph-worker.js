// WebGL consumes the original signed integers. Keep the three components
// together in one RGBA texel and pad only the last row of each array layer.
export const MORPH_WIDTH = 512;

export async function packMorphs(motion, anchors, amounts, yieldLayer) {
  const {rank, vertices, basis, normalBasis} = motion;
  const stride = vertices * 3;
  const faceRows = Math.ceil(2 * vertices / MORPH_WIDTH);
  const groomVertices = anchors ? anchors.length / 4 : 0;
  const groomRows = Math.ceil(groomVertices / MORPH_WIDTH);
  const faceLayer = MORPH_WIDTH * faceRows * 4;
  const groomLayer = MORPH_WIDTH * groomRows * 4;
  const face = new Int8Array(faceLayer * (rank+1));
  const groom = new Int16Array(groomLayer * rank);
  for (let k=0; k<rank; k++) {
    const start = k*stride;
    for (let v=0; v<vertices; v++) {
      const src = start+3*v, dst = k*faceLayer+8*v;
      face[dst]=basis[src]; face[dst+1]=basis[src+1]; face[dst+2]=basis[src+2];
      face[dst+4]=normalBasis[src+stride]; face[dst+5]=normalBasis[src+stride+1]; face[dst+6]=normalBasis[src+stride+2];
    }
    for (let v=0; v<groomVertices; v++) {
      const h=v*4, dst=k*groomLayer+h;
      const a=start+anchors[h]*3, b=start+anchors[h+1]*3, c=start+anchors[h+2]*3;
      const wa=amounts[h], wb=amounts[h+1], wc=amounts[h+2];
      if (!(wa||wb||wc)) continue;
      groom[dst]=wa*basis[a]+wb*basis[b]+wc*basis[c];
      groom[dst+1]=wa*basis[a+1]+wb*basis[b+1]+wc*basis[c+1];
      groom[dst+2]=wa*basis[a+2]+wb*basis[b+2]+wc*basis[c+2];
    }
    if (yieldLayer) await yieldLayer();
  }
  // A recorded constant normal offset accompanies each clip, including rank 1.
  for (let v=0; v<vertices; v++) {
    const dst = rank*faceLayer+8*v+4, src=3*v;
    face[dst]=normalBasis[src]; face[dst+1]=normalBasis[src+1]; face[dst+2]=normalBasis[src+2];
  }
  return {face,groom,faceRows,groomRows};
}

if (typeof document==='undefined' && typeof self!=='undefined' && typeof self.postMessage==='function') {
  let anchors=null, amounts=null;
  self.onmessage=async ({data})=>{
    if (data.type==='rig') { anchors=data.anchors; amounts=data.amounts; return; }
    try {
      const packed=await packMorphs(data.motion,anchors,amounts);
      self.postMessage({id:data.id,packed},[packed.face.buffer,packed.groom.buffer]);
    } catch (e) { self.postMessage({id:data.id,error:String(e)}); }
  };
}
