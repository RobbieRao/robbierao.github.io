// Unity SequenceSampleClock.Index evaluates the stored pose on a 30 Hz grid.
// The opening and closing holds belong to the trial clock, not to the asset.
export function sequenceSample(action,progress) {
  const seconds=Math.max(0,Math.min(action.motionDuration,progress*action.duration-action.startHold));
  const sample=Math.min(action.frames-1,seconds*action.fps);
  const exact=Math.round(sample);
  return Math.abs(sample-exact)<1e-7 ? exact : sample;
}

export const sequenceFrame=(action,progress)=>Math.round(sequenceSample(action,progress));

// The research trial includes explicit fixation holds. For the display gallery
// play only the recorded movement, preserving the time of every captured frame.
export function galleryProgress(action,fraction) {
  return (action.startHold + fraction*(action.frames-1)/action.fps)/action.duration;
}

// Registered performances can begin or end with the jaw and brows already
// displaced. Ease only those boundary samples to this identity's neutral
// geometry so any two clips can meet. Single-fit interpolations already
// return to neutral, and need only one sample to settle their normal bias.
export function galleryPoseEnvelope(action,progress) {
  const sample=sequenceSample(action,progress), last=action.frames-1;
  const edge=action.kind==='single-fit-interpolation' ? 1 : Math.min(.20*action.fps,last/4);
  if (edge<=0) return 0;
  const t=Math.max(0,Math.min(1,sample/edge,(last-sample)/edge));
  return t*t*(3-2*t);
}
