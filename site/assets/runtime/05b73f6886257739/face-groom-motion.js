import * as THREE from '/assets/vendor/three-0.185.0/three.module.min.js';

// Three reads morphs through getX/Y/Z both for its GPU morph texture and
// for Mesh.getVertexPosition (the CPU eyelid / lip masks). Leave the basis
// packed until those reads; each vertex does not need a second float copy.
export class ScaledMorphAttribute extends THREE.BufferAttribute {
  constructor(array,scale) { super(array,3); this.scale=scale; }
  getX(i) { return this.array[3*i]*this.scale; }
  getY(i) { return this.array[3*i+1]*this.scale; }
  getZ(i) { return this.array[3*i+2]*this.scale; }
}

// Each hair vertex carries the three indices and barycentric weights of its
// supporting anatomical triangle. The stored weights already taper to zero
// for free-hanging lengths. Transfer once per clip, then share the face's GPU
// morph weights so the rendered expression and the roots always agree.
export async function prepareGroomMotion(groom, faceTargets, signal) {
  if (!groom) return null;
  const source = groom.geometry;
  const anchors = source.getAttribute('_groom_anchor');
  const weights = source.getAttribute('_groom_weight');
  if (!anchors || !weights) return null;
  const ids = anchors.array, amounts = weights.array;
  const inverseScale = 1 / (255 * groom.scale.x);
  const targets = [];
  for (const target of faceTargets) {
    const face = target.array;
    // Integer barycentric sums are exact here: weights are nonnegative
    // bytes summing to at most 256 after rounding, on a signed int8 basis.
    const offsets = new Int16Array(anchors.count * 3);
    for (let i=0; i<anchors.count; i++) {
      const h = i*4;
      const a = ids[h]*3, b = ids[h+1]*3, c = ids[h+2]*3;
      const wa = amounts[h], wb = amounts[h+1], wc = amounts[h+2];
      const v = i*3;
      offsets[v] = wa*face[a]+wb*face[b]+wc*face[c];
      offsets[v+1] = wa*face[a+1]+wb*face[b+1]+wc*face[c+1];
      offsets[v+2] = wa*face[a+2]+wb*face[b+2]+wc*face[c+2];
    }
    targets.push(new ScaledMorphAttribute(offsets,target.scale*inverseScale));
    if (targets.length%3===0) {
      await new Promise(resolve=>setTimeout(resolve,0));
      signal.throwIfAborted();
    }
  }
  return influences=>{
    const next = new THREE.BufferGeometry();
    for (const [name,attribute] of Object.entries(source.attributes)) next.setAttribute(name,attribute);
    next.setIndex(source.index);
    next.boundingBox = source.boundingBox;
    next.boundingSphere = source.boundingSphere;
    next.morphTargetsRelative = true;
    next.morphAttributes.position = targets;
    groom.geometry = next;
    groom.morphTargetInfluences = influences;
    source.dispose();
  };
}
