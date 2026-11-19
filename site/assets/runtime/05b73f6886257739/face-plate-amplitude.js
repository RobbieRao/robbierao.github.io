import {galleryProgress} from './face-sequence-time.js';

// Both the film and its decoded-sheet fallback use the same registered
// projection. Load the correspondence data only after a visitor varies gain.
export function controlPlateAmplitude(node,model,redraw) {
  const poster=node.querySelector('img');
  const cache=new Map();
  let renderer, init, last=null, lifetime=new AbortController();
  async function prepare(action) {
    if (!action?.warpRevision || !model.warpRevision) return false;
    const id=action.id;
    const cached=cache.get(id);
    if (cached && (cached.loading || renderer?.has(action) || performance.now()<cached.retryAt)) return cached.promise;
    const signal=lifetime.signal;
    if (!init) init=import('./face-plate-warp.js').then(({createPlateWarp})=>{
      if (!signal.aborted) renderer=createPlateWarp(node,model);
      return renderer;
    });
    const entry={ready:false,loading:true,retryAt:0};
    entry.promise=init.then(async warp=>{
      if (!warp || signal.aborted) return false;
      const result=await warp.prepare(action,signal);
      entry.ready=result!==false && !signal.aborted;
      if (entry.ready && last?.action===action) { last=null; redraw(); }
      return entry.ready;
    }).catch(()=>false).finally(()=>{
      entry.loading=false;
      if (!entry.ready) entry.retryAt=performance.now()+3000;
    });
    cache.set(id,entry);
    return entry.promise;
  }
  function hide() {
    renderer?.hide(); last=null;
    node.classList.remove('is-neutral');
  }
  function paint(plate,gain) {
    if (!plate) { hide(); return; }
    const {action,source,sourceGain,frame}=plate;
    node.classList.toggle('is-neutral',gain===0 && !!poster.naturalWidth);
    if (gain===sourceGain) { if (last) hide(); return; }
    if (last?.source===source && last.action===action && last.frame===frame && last.gain===gain && last.sourceGain===sourceGain) return;
    last={action,source,sourceGain,frame,gain};
    if (!renderer?.has(action)) {
      renderer?.hide();
      prepare(action);
      return;
    }
    const progress=galleryProgress(action,Math.min(1,frame/Math.max(1,action.frames-1)));
    if (!renderer?.paint({action,source,sourceGain,gain,progress,poster})) {
      renderer?.hide();
      last=null;
    }
  }
  return {prepare,paint,hide,
    dispose() {
      lifetime.abort(); cache.clear(); renderer?.dispose(); renderer=null; last=null; init=null;
      lifetime=new AbortController(); node.classList.remove('is-neutral');
    }
  };
}
