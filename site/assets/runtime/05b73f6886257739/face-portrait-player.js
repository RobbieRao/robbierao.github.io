import {createFallback} from './face-stage-fallback.js';
import {sequenceSample} from './face-sequence-time.js';
import {controlPlateAmplitude} from './face-plate-amplitude.js';

// Keep a decoded successor ready. The clock is shared with the inspectable
// mesh, while the browser presents the ordinary gallery frames directly.
export function createPortraitPlayer(root, models, compact=false) {
  const atlas=createFallback(root,models,i=>paint(i));
  const slots=Array.from(root.querySelectorAll('.face-gallery-print'),(node,i)=>({
    node, visible:true, current:null, loading:null, replacing:null, handoff:null, progress:0,
    amplitude:controlPlateAmplitude(node,models[i],()=>paint(i))
  }));
  const supported=!!document.createElement('video').canPlayType('video/mp4; codecs="avc1.64001f"');
  let playing=false, gain=1, disposed=false, autoplayDenied=false;

  function release(movie) {
    if (!movie || movie.released) return;
    movie.released=true;
    const {video,url}=movie;
    if (movie.frameCallback!=null) video.cancelVideoFrameCallback?.(movie.frameCallback);
    if (movie.onDecoded) {
      video.removeEventListener('seeked',movie.onDecoded);
      video.removeEventListener('loadeddata',movie.onDecoded);
      video.removeEventListener('canplay',movie.onDecoded);
    }
    video.pause(); video.remove(); video.removeAttribute('src'); video.load();
    URL.revokeObjectURL(url);
  }
  function waitFor(video,event,signal) {
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(Error('Media preparation timed out')),10000);
      const fail=()=>finish(Error('Media preparation was interrupted'));
      const ready=()=>finish();
      function finish(error) {
        clearTimeout(timer);
        video.removeEventListener(event,ready); video.removeEventListener('error',fail);
        signal.removeEventListener('abort',fail);
        if (error) reject(error); else resolve();
      }
      video.addEventListener(event,ready); video.addEventListener('error',fail);
      signal.addEventListener('abort',fail,{once:true});
      if (signal.aborted) fail();
    });
  }
  const sourceGain=value=>value>1.5 ? 2 : 1;
  const useBoost=action=>sourceGain(gain)===2 && !!action.boostedFilmRevision;
  function paint(index) {
    const s=slots[index],movie=s.current;
    if (!s.visible || s.node.hidden || disposed) return;
    if (s.node.classList.contains('is-native')) { s.amplitude.hide(); return; }
    if (!movie) { s.amplitude.paint(atlas.currentPlate(index),gain); return; }
    const anchor=movie.boost ? 2 : 1;
    // During interactive warping use the decoded frame's presentation time.
    // Direct 1x/2x playback needs no extra per-video callbacks.
    if (gain!==anchor && movie.frameCallback==null && movie.video.requestVideoFrameCallback) {
      movie.frameCallback=movie.video.requestVideoFrameCallback((_,metadata)=>{
        movie.frameCallback=null; movie.mediaTime=metadata.mediaTime;
        if (s.current===movie) paint(index);
      });
    }
    const time=movie.mediaTime ?? movie.video.currentTime;
    s.amplitude.paint({source:movie.video,action:movie.action,sourceGain:anchor,
      frame:Math.min(movie.action.frames-1,Math.round(time*movie.action.fps))},gain);
    if (gain===anchor) movie.mediaTime=undefined;
  }
  async function load(index,action,boost,signal,priority) {
    const revision=boost ? action.boostedFilmRevision : action.filmRevision;
    const folder=boost ? 'films-boosted' : 'films';
    // Start all eight plates cheaply. Once moving, wide/high-density plates
    // use their original 480px recordings at a normal clip boundary.
    const slot=slots[index], connection=navigator.connection;
    const smallFilm=compact && !boost && action.homeFilm && (
      !slot.current || slot.node.clientWidth*Math.min(devicePixelRatio || 1,1.5)<=320 ||
      connection?.saveData || /^(slow-2g|2g|3g)$/.test(connection?.effectiveType)
    );
    const src=(smallFilm && action.homeFilm) ||
      '/assets/face-study/gallery/'+folder+'/'+models[index].id+'-'+action.id+'.mp4?v='+revision;
    const response=await fetch(src,{signal,priority,cache:'force-cache'});
    if (!response.ok) throw Error('Missing portrait film');
    const blob=await response.blob();
    signal.throwIfAborted();
    const url=URL.createObjectURL(blob),video=document.createElement('video');
    const movie={url,video,boost,action};
    video.muted=true; video.defaultMuted=true; video.playsInline=true; video.loop=true;
    video.preload='auto'; video.disablePictureInPicture=true;
    video.className='face-gallery-video'; video.setAttribute('aria-hidden','true');
    const ready=waitFor(video,'loadeddata',signal);
    video.src=url; video.load();
    try { await ready; return movie; }
    catch(error) { release(movie); throw error; }
  }
  function handoffToAtlas(index) {
    const s=slots[index],movie=s.current;
    if (!movie || !s.visible || disposed) return;
    if (s.handoff?.movie===movie) return s.handoff.promise;
    // Leave the decoded frame above the poster until its matching sheet is
    // drawable at the current expression time. The next clip waits its turn.
    s.replacing?.abort();
    atlas.setVisible(index,true);
    const entry=s.handoff={movie};
    entry.promise=atlas.prepareAction(index,movie.action,'auto').then(ready=>{
      if (!ready) return;
      if (s.current!==movie || s.handoff!==entry || !s.visible || disposed) { ready.discard(); return; }
      if (ready.play()) {
        atlas.setProgress(index,s.progress);
        s.node.classList.remove('has-hd-performance');
        s.current=null; release(movie);
        paint(index);
      }
    }).finally(()=>{ if (s.handoff===entry) s.handoff=null; });
    return entry.promise;
  }
  function playback(index) {
    const movie=slots[index].current;
    if (!movie) return;
    if (autoplayDenied) { handoffToAtlas(index); return; }
    if (!playing) { movie.video.pause(); return; }
    movie.video.play().catch(error=>{
      if (movie.released || !playing || disposed || error.name==='AbortError' || autoplayDenied) return;
      autoplayDenied=true;
      slots.forEach((_,i)=>handoffToAtlas(i));
    });
  }
  function install(index,movie) {
    const s=slots[index], old=s.current;
    s.current=movie; s.handoff=null;
    // A paused seek can momentarily have no drawable frame. Some decoders
    // send no animation callback after it, so repaint on actual readiness.
    movie.onDecoded=()=>{
      if (s.current!==movie || movie.video.seeking || movie.video.readyState<2) return;
      movie.mediaTime=movie.video.currentTime;
      paint(index);
    };
    movie.video.addEventListener('seeked',movie.onDecoded);
    movie.video.addEventListener('loadeddata',movie.onDecoded);
    movie.video.addEventListener('canplay',movie.onDecoded);
    s.node.append(movie.video);
    s.node.classList.add('has-hd-performance');
    atlas.setVisible(index,false);
    playback(index); release(old); paint(index);
  }
  async function replace(index) {
    const s=slots[index],old=s.current;
    s.replacing?.abort(); s.replacing=null;
    if (!old || !s.visible || s.node.hidden || autoplayDenied || old.boost===useBoost(old.action)) return;
    const ticket=s.replacing=new AbortController();
    let movie;
    try {
      movie=await load(index,old.action,useBoost(old.action),ticket.signal,'auto');
      const t=old.video.currentTime;
      if (t>0.02) {
        const seek=waitFor(movie.video,'seeked',ticket.signal);
        movie.video.currentTime=t;
        await seek;
      }
      if (s.current!==old || ticket.signal.aborted) return;
      install(index,movie); movie=null;
    } catch { /* Keep the decoded clip on screen. */ }
    finally { release(movie); if (s.replacing===ticket) s.replacing=null; }
  }
  async function prepareAction(index,action,priority) {
    const s=slots[index];
    if (disposed || !s.visible) return false;
    s.loading?.abort();
    const ticket=s.loading=new AbortController();
    const correspondence=gain!==sourceGain(gain) && !s.node.classList.contains('is-native')
      ? s.amplitude.prepare(action) : null;
    if (supported && !autoplayDenied && action.filmRevision) {
      try {
        const movie=await load(index,action,useBoost(action),ticket.signal,priority);
        if (correspondence) await correspondence;
        if (ticket.signal.aborted) { release(movie); return false; }
        if (!autoplayDenied) return {
          play() {
            if (!s.visible || ticket.signal.aborted) { release(movie); return false; }
            s.replacing?.abort(); s.loading=null; s.progress=0;
            install(index,movie);
            if (movie.boost!==useBoost(action)) replace(index);
            return true;
          }, discard:()=>release(movie)
        };
        release(movie);
      } catch { if (ticket.signal.aborted) return false; }
    }
    if (autoplayDenied && s.current) await handoffToAtlas(index);
    if (ticket.signal.aborted || !s.visible || disposed) return false;
    atlas.setVisible(index,true);
    const ready=await atlas.prepareAction(index,action,priority);
    if (correspondence) await correspondence;
    if (!ready) return false;
    return {
      play() {
        if (ticket.signal.aborted || !ready.play()) return false;
        s.replacing?.abort(); release(s.current); s.current=null; s.progress=0;
        s.node.classList.remove('has-hd-performance');
        paint(index);
        return true;
      }, discard:()=>ready.discard()
    };
  }
  function setVisible(index,value) {
    const s=slots[index];
    s.visible=value;
    if (value) return;
    s.loading?.abort(); s.replacing?.abort(); release(s.current); s.current=null; s.handoff=null;
    s.amplitude.dispose();
    s.node.classList.remove('has-hd-performance'); atlas.setVisible(index,false);
  }
  return {
    prepareAction,setVisible,
    heldFraction(index) {
      const movie=slots[index].current;
      if (movie) return movie.video.currentTime*movie.action.fps/(movie.action.frames-1);
      const plate=atlas.currentPlate(index);
      return plate ? plate.frame/(plate.action.frames-1) : null;
    },
    setProgress(index,progress) {
      const s=slots[index],movie=s.current;
      s.progress=progress;
      if (!movie) atlas.setProgress(index,progress);
      else if (!autoplayDenied) {
        const v=movie.video, time=sequenceSample(movie.action,progress)/movie.action.fps;
        const tolerance=playing ? .14 : .5/movie.action.fps;
        if (!v.seeking && Math.abs(time-v.currentTime)>tolerance) v.currentTime=time;
      }
      paint(index);
    },
    setDisplacementGain(value) {
      if (!Number.isFinite(value) || gain===value) return;
      const previous=sourceGain(gain);
      gain=Math.min(2,Math.max(0,value));
      if (previous!==sourceGain(gain)) {
        atlas.setDisplacementGain(sourceGain(gain));
        slots.forEach((_,i)=>replace(i));
      }
      slots.forEach((_,i)=>paint(i));
    },
    setPlaying(value) {
      if (playing===value) return;
      playing=value; slots.forEach((_,i)=>playback(i));
    },
    dispose() { disposed=true; slots.forEach((_,i)=>setVisible(i,false)); atlas.dispose(); }
  };
}
