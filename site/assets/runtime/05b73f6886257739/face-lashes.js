import * as THREE from '/assets/vendor/three-0.185.0/three.module.min.js';

// Bind the roots once to the actual two lid arcs. A blink or a squint moves
// both ends of each attachment with the scan, including along the depth axis.
export function createLashes(face, rim, upperDefinition=0) {
  const vertex=face.geometry.getAttribute('position');
  const initial=rim.map(i=>new THREE.Vector3().fromBufferAttribute(vertex,i));
  const xs=initial.map(p=>p.x), left=xs.indexOf(Math.min(...xs)), right=xs.indexOf(Math.max(...xs));
  const width=xs[right]-xs[left], side=Math.sign(xs[right]+xs[left]) || 1;
  const arc=step=>{
    const path=[left];
    for (let i=left;i!==right;) {
      i=(i+step+rim.length)%rim.length;
      path.push(i);
    }
    return path;
  };
  const meanY=path=>path.reduce((y,i)=>y+initial[i].y,0)/path.length;
  const arcs=[arc(1),arc(-1)].sort((a,b)=>meanY(b)-meanY(a));
  const hairs=[], indices=[], colors=[];
  const pigment=new THREE.Color('#403028');
  for (const [lid,path] of arcs.entries()) {
    const length=[0];
    for (let i=1;i<path.length;i++)
      length.push(length[i-1]+initial[path[i]].distanceTo(initial[path[i-1]]));
    const upper=lid===0, count=upper?38+Math.round(10*upperDefinition):15;
    let segment=1;
    for (let i=0;i<count;i++) {
      const jitter=Math.sin((i+1)*18.17+side*2.3+lid);
      const u=.075+.86*(i+.5+.25*jitter)/count;
      const temporal=side>0?u:1-u;
      const at=u*length.at(-1);
      while (segment<path.length-1 && length[segment]<at) segment++;
      const t=(at-length[segment-1])/Math.max(1e-8,length[segment]-length[segment-1]);
      const span=width*(upper?.19:.094)*(.45+.63*Math.sin(temporal*2.05))*(1+.13*jitter);
      const start=hairs.length*6;
      hairs.push({a:path[segment-1]*3,b:path[segment]*3,t,span,
        dx:side*(temporal*.55-.06)+jitter*.07,dy:upper?.60:-.48,
        halfWidth:width*(upper?.0039*(1+.37*upperDefinition):.0028)});
      for (const [row,alpha] of [[0,upper?.68+.16*upperDefinition:.36],[1,upper?.61+.10*upperDefinition:.31],[2,.13]]) {
        for(let edge=0;edge<2;edge++) colors.push(pigment.r,pigment.g,pigment.b,alpha);
        if(row<2) {
          const s=start+row*2;
          indices.push(s,s+1,s+2,s+1,s+3,s+2);
        }
      }
    }
  }
  const points=new THREE.BufferAttribute(new Float32Array(hairs.length*18),3).setUsage(THREE.DynamicDrawUsage);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',points);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
  geometry.setIndex(indices);
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,depthWrite:false});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='LidLashes'; mesh.frustumCulled=false;
  face.add(mesh);

  return positions=>{
    let v=0;
    for(const {a,b,t,span,dx,dy,halfWidth} of hairs) {
      const x=positions[a]+(positions[b]-positions[a])*t;
      const y=positions[a+1]+(positions[b+1]-positions[a+1])*t;
      const z=positions[a+2]+(positions[b+2]-positions[a+2])*t;
      for(let row=0;row<3;row++) {
        const u=row*.5;
        const x1=x+span*dx*u, y1=y+span*dy*u*u;
        const z1=z+width*.003+span*(.86*u-.19*u*u);
        const w=halfWidth*(1-.96*u);
        points.setXYZ(v++,x1-w,y1,z1); points.setXYZ(v++,x1+w,y1,z1);
      }
    }
    points.needsUpdate=true;
  };
}
