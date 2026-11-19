// An observation bench: frame the error, separate its parts, and reassemble.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const ease=v=>1-Math.pow(1-clamp(v),3);
export const STUDIO_SETTLED_TIME=5;

function pose(out,translation,rotation,scale=1){
  const [x,y,z]=rotation,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z),s=scale;
  out.set([cz*cy*s,sz*cy*s,-sy*s,0,
    (cz*sy*sx-sz*cx)*s,(sz*sy*sx+cz*cx)*s,cy*sx*s,0,
    (cz*sy*cx+sz*sx)*s,(sz*sy*cx-cz*sx)*s,cy*cx*s,0,...translation,1]);
}
function multiplyInto(out,start,a,b){
  for(let column=0;column<4;column++)for(let row=0;row<4;row++)
    out[start+column*4+row]=a[row]*b[column*4]+a[4+row]*b[column*4+1]+a[8+row]*b[column*4+2]+a[12+row]*b[column*4+3];
}
export function prepareStudioScene(scene){
  const counts={},lines={};
  for(const object of scene.objects){
    object.order=counts[object.kind]||0;counts[object.kind]=object.order+1;
    if(object.kind==='motto'){object.lineOrder=lines[object.line]||0;lines[object.line]=object.lineOrder+1;}
  }
  for(const object of scene.objects)if(object.kind==='fault'){
    const parent=scene.objects[object.parentIndex];object.lineOrder=parent.lineOrder;object.order=parent.order;
  }
  scene.transforms=new Float32Array(scene.objects.length*24);
  scene.groupMatrix=new Float32Array(16);scene.localMatrix=new Float32Array(16);
  return scene;
}
export function studioFrame(scene,state={}){
  const time=Math.max(0,state.time||0),idle=Math.max(0,time-4.5),mobile=Boolean(state.mobile);
  const px=clamp(state.pointerX||0,-1,1),py=clamp(state.pointerY||0,-1,1);
  const drift=Math.sin(idle*.25)*.07;
  const inspection=clamp(state.inspect||0);
  const probe=.18*(1-Math.cos(idle*.42))/2;
  const nearFault=Math.max(0,1-Math.hypot(px-.12,py+.02)*1.8);
  const opening=clamp(inspection+probe+nearFault*.12);
  const turn=clamp(state.dragYaw||0,-1.8,1.8)*.52;
  const pitch=clamp(state.dragPitch||0,-.6,.6);
  pose(scene.groupMatrix,[0,.04,0],[(mobile?.16:.24)+py*.07+pitch,(mobile?-.22:-.39)+drift+px*.12+turn,.055],mobile?1.05:1);
  const blue=[.08,.30,.79],ink=[.075,.12,.23],red=[.94,.29,.20];
  const linePositions=[[-.16,.46,-.20],[.04,.035,.04],[.23,-.40,.35]];
  const lineAngles=[[0,.04,-.025],[0,-.035,-.015],[.24,.025,-.035]];
  scene.objects.forEach((object,index)=>{
    const final=object.kind==='motto'||object.kind==='fault',line=object.line||0;
    let position,rotation,scale=1,alpha=1,tint=ink;
    if(object.kind==='model'){
      const frame=object.model==='viewfinder',weave=object.model==='weave';
      const entry=ease((time-(frame?.30:weave?2.8:3.05))/.85);
      alpha=entry*(frame?.78:1);
      if(frame){
        position=[0,.01,-.39+opening*.16];
        rotation=[-.025+opening*.10,-opening*.08,0];
        scale=.90+(1-entry)*.12;tint=[.26,.49,.66];
      }else if(weave){
        // The two sets of threads separate along their normals on inspection,
        // exposing the structure of the woven sample rather than random motion.
        position=[1.18,-.36,.26+(object.part==='warp'?opening*.16:-opening*.07)];
        position[1]-=(1-entry)*.35;
        rotation=[.13+opening*.14,-.30-opening*.18,-.20+opening*.12];
        scale=.83;tint=object.part==='warp'?red:[.86,.61,.29];
      }else{
        position=[-1.21,-.46,.18];position[1]-=(1-entry)*.3;
        rotation=[.25+opening*.10,.24,-.13];scale=.86;
        if(object.part==='chip')position[2]+=opening*.25;
        tint=object.part==='board'?[.10,.37,.48]:object.part==='chip'?ink:[.93,.61,.28];
      }
      position[2]-=(1-entry)*.30;
    }else if(!final){
      const name=object.kind==='name',start=name?.08:1.30,step=name?.045:.035;
      const entry=ease((time-start-object.order*step)/.36);
      const leave=smooth((time-(name?1.1:2.35)-object.order*.009)/.32);
      alpha=clamp((time-start-object.order*step)*9)*(1-leave);
      position=[...(object.offset||[0,0,0])];
      position[1]+=(1-entry)*.34+leave*.30;
      position[2]+=.38-(1-entry)*1.0-leave*.7;
      rotation=[(1-entry)*.5,-(1-entry)*.65,.02+leave*.15];
      scale=1.04;tint=name?blue:ink;
    }else{
      const start=2.72+line*.13+(object.lineOrder||0)*.025;
      const entry=ease((time-start)/.58);
      alpha=clamp((time-start)*7);
      const origin=linePositions[line],offset=object.offset||[0,0,0];
      position=[origin[0]+offset[0],origin[1]+offset[1],origin[2]+offset[2]];
      position[2]+=(1-entry)*(line===1?-.6:.6);
      position[1]+=(1-entry)*(line===0?.28:-.20);
      rotation=[...lineAngles[line]];rotation[1]+=(1-entry)*(line===1?-.5:.5);
      tint=line===2?red:line===1?blue:ink;scale=.88;
      if(object.kind==='fault'){
        // Both halves share an origin and a closed cut plane. The displaced
        // half reveals the actual inside, instead of a painted glitch effect.
        const reveal=smooth((time-3.7)/1.1);
        position[2]+=reveal*(.12+opening*.44);
        position[0]+=reveal*opening*.06;position[1]+=reveal*opening*.10;
        rotation[1]+=reveal*(-.035-opening*.20);rotation[2]+=reveal*opening*.06;
      }
      if(line===2){position[2]+=opening*.06;rotation[1]+=opening*.045;}
    }
    pose(scene.localMatrix,position,rotation,scale);
    const at=index*24;multiplyInto(scene.transforms,at,scene.groupMatrix,scene.localMatrix);
    scene.transforms.set([...tint,alpha,object.kind==='fault'||Number.isInteger(object.faultIndex)?1:0,opening,0,0],at+16);
  });
  return {transforms:scene.transforms,time,phase:time<1.3?'robbie':time<2.7?'portfolio':time<4.5?'arriving':'studio'};
}
