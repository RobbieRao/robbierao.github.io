import {sequenceSample} from './face-sequence-time.js';

// head_eye_sim/demo_generate.py uses a 55 ms eye time constant. The young
// cohort's pooled sweep rate is 1.87 Hz (reports/empirical_profile.md).
// Here these parameters drive synthetic display targets in screen-space degrees.
const eyeTau=.055, fixationPeriod=1/1.87;
const clips=new Map();
const centre={yaw:0,pitch:0};

function clipRandom(key) {
  let state=2166136261;
  for (const c of key) state=Math.imul(state^c.charCodeAt(0),16777619);
  return () => {
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
}

function freeTarget(random) {
  const angle=2*Math.PI*random(), radius=.31+.69*Math.sqrt(random());
  return {yaw:11*radius*Math.cos(angle),pitch:6.5*radius*Math.sin(angle)};
}

function eyePosition(start,target,seconds) {
  const progress=-Math.expm1(-Math.max(0,seconds)/eyeTau);
  return {yaw:start.yaw+(target.yaw-start.yaw)*progress,pitch:start.pitch+(target.pitch-start.pitch)*progress};
}

function fixationDuration(random) { return fixationPeriod*(.62+.89*random()); }

function makeClip(key,duration) {
  const random=clipRandom(key), events=[];
  let time=0, start=centre;
  while (time<duration) {
    const target=freeTarget(random), dwell=fixationDuration(random);
    events.push({time,start,target});
    start=eyePosition(start,target,dwell);
    time+=dwell;
  }
  return {events,phase:2*Math.PI*random()};
}

// Both the offline film and the live renderer use the original trial progress.
// Ease back to the registered eye direction at clip seams, including reverse.
export function sampleGalleryGaze(modelId,action,progress) {
  if (!action || progress==null) return centre;
  const duration=(action.frames-1)/action.fps;
  const time=sequenceSample(action,progress)/action.fps;
  if (time<=0 || time>=duration) return centre;
  const key=modelId+'/'+action.id;
  if (!clips.has(key)) clips.set(key,makeClip(key,duration));
  const {events,phase}=clips.get(key);
  let index=events.length-1;
  while (index>0 && events[index].time>time) index--;
  const event=events[index], gaze=eyePosition(event.start,event.target,time-event.time);
  const tail=Math.min(1,(duration-time)/.18), fade=tail*tail*(3-2*tail);
  // The empirical generator's 7.2/5.6 Hz fixation tremor is subpixel here.
  const drift=.025*Math.min(1,time/.08);
  return {yaw:fade*(gaze.yaw+drift*Math.sin(time*2*Math.PI*7.2+phase)),
    pitch:fade*(gaze.pitch+drift*Math.cos(time*2*Math.PI*5.6+phase))};
}

// The caller supplies its animation clock. Hover movement updates the current
// pointing location without repeatedly resetting the reaction delay.
export function createLiveGaze(time,initial,random=Math.random) {
  let start=initial, target=initial, since=time, next=time;
  let pointerRequested=false, pointerPresent=false, freeCount=3;
  return (now,pointer)=>{
    const current=eyePosition(start,target,(now-since)/1000);
    if (pointer && !pointerPresent && freeCount>=3) next=now;
    pointerPresent=!!pointer;
    if (now<next) return current;
    if (pointer && freeCount>=3 && !pointerRequested) {
      next=now+140+220*random();
      pointerRequested=true;
      return current;
    }
    start=current; since=now;
    if (pointer && pointerRequested) {
      target={yaw:pointer.x*15,pitch:pointer.y*9};
      freeCount=0;
    } else {
      target=freeTarget(random);
      freeCount=Math.min(3,freeCount+1);
    }
    pointerRequested=false;
    next=now+1000*fixationDuration(random);
    return current;
  };
}
