import * as THREE from '/assets/vendor/three-0.185.0/three.module.min.js';

// A column connects the two anatomical lip margins. Unlike a fan, it can
// close independently when one mouth corner is raised or the lips cross.
export function createLipAperture(face, rim, updateOpening) {
  const divisions=32, count=divisions+1, total=count*2;
  const base=face.geometry.getAttribute('position');
  const rest=rim.map(id=>new THREE.Vector3().fromBufferAttribute(base,id));
  const points=rest.map(p=>p.clone());
  const xs=rest.map(p=>p.x), left=Math.min(...xs), right=Math.max(...xs);
  const width=right-left;
  const columns=[];
  for (let c=0;c<count;c++) {
    const x=left+width*THREE.MathUtils.clamp(c/divisions,.00001,.99999);
    const hits=[];
    for (let i=0;i<rim.length;i++) {
      const j=(i+1)%rim.length;
      if ((xs[i]>x)===(xs[j]>x)) continue;
      const k=(x-xs[i])/(xs[j]-xs[i]);
      const y=THREE.MathUtils.lerp(rest[i].y,rest[j].y,k);
      const side=xs[j]>xs[i]?0:1, prior=hits[side];
      if (!prior || (side===0?y>prior.y:y<prior.y)) hits[side]={i,j,k,y};
    }
    columns.push(hits);
  }
  const data=new THREE.BufferAttribute(new Float32Array(total*3),3).setUsage(THREE.DynamicDrawUsage);
  const indices=[];
  for (let i=0;i<divisions;i++) {
    const j=total-1-i;
    indices.push(i,j,i+1,i+1,j,j-1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',data);
  geometry.setIndex(indices);
  const mask=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    side:THREE.DoubleSide,colorWrite:false,depthWrite:false,depthTest:false,
    stencilWrite:true,stencilRef:1,stencilWriteMask:1,stencilFunc:THREE.AlwaysStencilFunc,
    stencilZPass:THREE.ReplaceStencilOp
  }));
  mask.renderOrder=-1;
  mask.frustumCulled=false;
  face.add(mask);
  const mid=divisions/2;
  const centre=columns[mid].map(({i,j,k})=>({
    rest:new THREE.Vector3().lerpVectors(rest[i],rest[j],k),
    current:new THREE.Vector3(), extra:new THREE.Vector3()
  }));
  const edges=[new THREE.Vector3(),new THREE.Vector3()], midpoint=new THREE.Vector3();
  const toParent=new THREE.Matrix3().setFromMatrix4(face.matrix);
  return {
    centre, width,
    sample(gain) {
      for (let i=0;i<rim.length;i++) face.getVertexPosition(rim[i],points[i]);
      let maxGap=0;
      for (let i=0;i<count;i++) {
        for (let side=0;side<2;side++) {
          const {i:a,j:b,k}=columns[i][side];
          edges[side].lerpVectors(points[a],points[b],k);
          if (i===mid) {
            const sample=centre[side];
            sample.current.copy(edges[side]);
            sample.extra.copy(edges[side]).sub(sample.rest)
              .multiplyScalar(gain>1?1-1/gain:0).applyMatrix3(toParent);
          }
        }
        const [upper,lower]=edges;
        const opening=(upper.y-lower.y)/width;
        const fraction=i===0 || i===divisions ? 0 : THREE.MathUtils.smoothstep(opening,.006,.021);
        maxGap=Math.max(maxGap,fraction*Math.max(0,opening));
        midpoint.copy(upper).lerp(lower,.5);
        upper.lerp(midpoint,1-fraction); lower.lerp(midpoint,1-fraction);
        data.setXYZ(i,upper.x,upper.y,upper.z);
        data.setXYZ(total-1-i,lower.x,lower.y,lower.z);
      }
      data.needsUpdate=true;
      mask.visible=maxGap>.004;
      return mask.visible;
    },
    updateMaterials() {
      if (mask.visible) updateOpening(data.array,total);
    }
  };
}

// The fitted mouth can sit above or below the original actor's dental rig.
// Measure the actual anterior enamel (excluding gums), not the jaw's box.
export function alignDentalRig(face, upperJaw, oral, aperture) {
  if (!upperJaw || !aperture) return ()=>{};
  const geo=upperJaw.geometry, position=geo.getAttribute('position'), rgb=geo.getAttribute('color');
  if (!rgb) return ()=>{};
  const centreX=aperture.centre[0].rest.x, width=aperture.width;
  const toFace=new THREE.Matrix4(), fromFace=new THREE.Matrix3();
  const sample=new THREE.Vector3(), front=[];
  let nearest=-Infinity;
  for (let i=0;i<position.count;i++) {
    sample.fromBufferAttribute(position,i);
    if (Math.abs(sample.x-centreX)>width*.16 || rgb.getY(i)<.68*rgb.getX(i)) continue;
    front.push(sample.clone());
    nearest=Math.max(nearest,sample.z);
  }
  const enamel=front.filter(v=>v.z>=nearest-width*.12).sort((a,b)=>a.y-b.y);
  if (enamel.length<4) return ()=>{};
  // Ignore isolated edge vertices at the cervical and incisal extrema.
  const tips=[enamel[Math.floor(enamel.length*.025)],enamel[Math.floor(enamel.length*.975)]];
  face.updateMatrix();
  const inverse=face.matrix.clone().invert();
  fromFace.setFromMatrix4(face.matrix);
  const correction=new THREE.Vector3();
  return ()=>{
    const top=aperture.centre[0].current.y,bottom=aperture.centre[1].current.y, gap=top-bottom;
    const open=THREE.MathUtils.smoothstep(gap/width,.065,.145);
    if (!open) return;
    upperJaw.updateMatrix();
    toFace.multiplyMatrices(inverse,upperJaw.matrix);
    const lowerTip=sample.copy(tips[0]).applyMatrix4(toFace).y;
    const upperTip=sample.copy(tips[1]).applyMatrix4(toFace).y;
    // Only correct a misplaced arch at a genuinely open lip margin. Keep
    // the bite, mandibular rotation and relative tongue pose from the clip.
    const reveal=Math.min(.22*gap,.052*width,Math.max(0,upperTip-lowerTip)*.36);
    const shift=Math.max(0,bottom+reveal-upperTip)-Math.max(0,lowerTip-top+reveal);
    if (!shift) return;
    correction.set(0,open*shift,0).applyMatrix3(fromFace);
    for (const part of oral) part.position.add(correction);
  };
}
