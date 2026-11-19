import {t} from './locale.js';
import {createPortraitPlayer} from './face-portrait-player.js';
import {createEeg} from './face-eeg.js';
import {bindPortraitView} from './face-view.js';
import {galleryProgress,galleryPoseEnvelope} from './face-sequence-time.js';
import {createLiveGaze,sampleGalleryGaze} from './face-gaze.js';

const section = document.getElementById('motion-comparison');

function animateWallTitles(root) {
  const layer = root.querySelector('.face-wordmark');
  if (!layer) return;
  const lettering = layer.querySelector('#research-lettering');
  const arrow = layer.querySelector('#wall-down-arrow');
  const gallery = root.querySelector('.face-gallery');
  const scrollLink = root.querySelector('.face-scroll-link');
  const omitTitle = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)');
  const posters = [...root.querySelectorAll('.face-gallery-print img')];
  // Optical widths in the shared SVG. The shorter word keeps its natural letter proportions.
  const titles = [['Research', 965], ['Robbie Rao', 965], ['Design', 775]];
  let onScreen = false, preparation, ready = false;
  let exposure, quietTimer, cueActive = false;

  function setCue(visible) {
    cueActive = visible;
    // Keep a focused link available through the transition back to the titles.
    scrollLink.hidden = !visible && document.activeElement !== scrollLink;
  }
  scrollLink.addEventListener('blur', () => { scrollLink.hidden = !cueActive; });

  function showFrame(index, initialDelay = 0) {
    setCue(false);
    const isArrow = index === titles.length;
    lettering.setAttribute('display', isArrow ? 'none' : 'inline');
    arrow.setAttribute('display', isArrow ? 'inline' : 'none');
    if (!isArrow) {
      const [word, width] = titles[index];
      lettering.textContent = word;
      lettering.setAttribute('textLength', width);
    }
    exposure = layer.animate([
      {opacity:0}, {opacity:.93, offset:.32}, {opacity:.93, offset:.65}, {opacity:0}
    ], {duration:4200, delay:initialDelay, easing:'ease-in-out'});
    exposure.onfinish = () => {
      if (!isArrow) showFrame(index + 1);
      else {
        setCue(true);
        quietTimer = setTimeout(() => showFrame(0), 10_000);
      }
    };
  }
  function sync() {
    const showWall = onScreen && !document.hidden && !gallery.hasAttribute('data-detail');
    if (!showWall || omitTitle.matches) {
      layer.hidden = true;
      setCue(showWall && omitTitle.matches);
      if (exposure) {
        exposure.onfinish = null;
        exposure.cancel();
        exposure = null;
      }
      clearTimeout(quietTimer);
      return;
    }
    if (!ready) {
      preparation ??= Promise.allSettled(posters.map(image => image.decode())).then(() => {
        ready = posters.some(image => image.naturalWidth);
        if (ready) sync();
      });
      return;
    }
    if (layer.hidden) {
      layer.hidden = false;
      showFrame(0, 450);
    }
  }
  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.intersectionRatio >= .45;
    sync();
  }, {threshold:.45});
  observer.observe(root);
  new MutationObserver(sync).observe(gallery, {attributes:true, attributeFilter:['data-detail']});
  document.addEventListener('visibilitychange', sync);
  omitTitle.addEventListener('change', sync);
}

if (section?.dataset.manifest) {
  animateWallTitles(section);
  // The homepage paints its portraits from HTML immediately. Only visitors
  // who reach the opening need its motion catalogue and clips.
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    fetch(section.dataset.manifest).then(response => {
      if (!response.ok) throw Error('Portrait catalogue unavailable');
      return response.json();
    }).then(models => exhibit(section, models)).catch(() => {
      // The responsive portraits and the link into the study remain usable.
    });
  });
  observer.observe(section);
} else if (section) exhibit(section, JSON.parse(section.querySelector('#face-study-models').textContent));

function shuffled(items) {
  const result = [...items];
  for (let i=result.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function exhibit(root, models) {
  const compact = !!root.dataset.manifest;
  const view = root.querySelector('.face-gallery');
  const canvas = view.querySelector('.face-gallery-canvas');
  const prints = [...view.querySelectorAll('.face-gallery-print')];
  const fallback = createPortraitPlayer(view.querySelector('.face-gallery-posters'), models, compact);
  const figure = document.getElementById('face-eeg');
  const eeg = figure && createEeg(figure);
  const button = root.querySelector('.face-playback');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData === true;
  // Sample a small repertoire per visit. Explicitly inspecting a portrait
  // opens its broader archive without streaming every portrait's library.
  const slots=models.map(model=>{
    const available=model.actions.filter(a=>a.fallback);
    const homeFilms=compact ? available.filter(a=>a.homeFilm) : [];
    return {repertoire:shuffled(homeFilms.length ? homeFilms : available).slice(0,3),
      bag:[],previous:null,next:null,run:null,retryAt:0,progress:0,resume:null,resumeFraction:null};
  });
  let stage = null, booted = false, lost = false, disposed = false;
  let selected=null, live=null, requested=null, resident=null, gain=1;
  let pointer=null, gaze=null, handoffAt=0;
  let inspected=[];
  let elapsed = 0, eegElapsed = 0, frame = 0, last = null;
  let paused = reduce.matches || saveData;
  let requestedStill=false;
  let viewerOpen = !!document.querySelector('dialog.image-viewer[open]');
  const visible = new Set();
  const nearby = new Set();
  const active = () => !paused && !viewerOpen && !document.hidden && !disposed &&
    (visible.has(figure) || visible.has(view));
  const label = () => {
    if (!button) return;
    button.textContent = paused ? t('Play','播放') : t('Pause','暂停');
    button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label', paused ? t('Play the gallery animation','播放群像动画') : t('Pause the gallery animation','暂停群像动画'));
  };

  function showLive(index) {
    if (live===index) return;
    if (live!==null) prints[live].classList.remove('is-native');
    live=index;
    stage?.setVisibleFaces(index===null ? [] : [index]);
    if (index!==null) {
      // Paint the live sample before retiring its matching film frame.
      stage.drawLayer(index);
      prints[index].classList.add('is-native');
    }
    canvas.style.visibility=index===null ? 'hidden' : '';
    view.toggleAttribute('data-native',index!==null);
    portraitView.setLive(index);
  }
  function allPrints() {
    lost=true; requested=null; resident=null;
    showLive(null); canvas.hidden=true;
    portraitView.attach(null);
    schedule();
  }

  function drawInspectedFace(i,slot) {
    stage.setGalleryProgress(i,slot.run.action,slot.progress);
    const baked=sampleGalleryGaze(models[i].id,slot.run.action,slot.progress);
    if (!gaze) gaze=createLiveGaze(elapsed,baked);
    if (live!==i) handoffAt=elapsed;
    const look=gaze(elapsed,pointer?.index===i ? pointer : null);
    const mix=Math.min(1,(elapsed-handoffAt)/150);
    stage.setGaze(i,baked.yaw+(look.yaw-baked.yaw)*mix,baked.pitch+(look.pitch-baked.pitch)*mix);
    showLive(i);
  }
  async function init() {
    if (booted || lost) return;
    booted=true;
    try {
      const {createEnsemble}=await import('./face-study-renderer.js');
      if (disposed) return;
      const ready=await createEnsemble(canvas,models,{reducedMotion:reduce.matches,onContextLost:allPrints});
      if (disposed || lost) { ready.dispose(); return; }
      stage=ready;
      stage.setVisibleFaces([]); stage.setDisplacementGain(gain);
      portraitView.attach(stage);
      syncNative();
    } catch { if (!disposed) allPrints(); }
  }

  function syncNative() {
    const i=selected;
    if (i===null || lost || disposed || document.hidden || viewerOpen ||
        !nearby.has(i) || !visible.has(view) || (paused && !stage && (reduce.matches || saveData))) {
      if (requested) stage?.cancelPrepare(requested.index);
      requested=null; showLive(null); return;
    }
    if (!stage) { init(); return; }
    const slot=slots[i], run=slot.run;
    if (!run || !slot.progress) return;
    const current=resident?.index===i && resident.action===run.action;
    if (current) {
      drawInspectedFace(i,slot);
    } else if (requested?.index!==i || requested.action!==run.action || !requested.ready) {
      showLive(null);
    }

    // The print is always at this face's exact current sample, even while a
    // higher-resolution mesh is loading. Only the inspected face fetches 3D.
    const action=current ? slot.next?.action : run.action;
    if (!action) return;
    if (requested?.index===i && requested.action===action) {
      if (!current && requested.ready) {
        const ready=requested.ready;
        requested=null;
        if (ready.play(slot.progress,galleryPoseEnvelope(action,slot.progress))) {
          resident={index:i,action};
          drawInspectedFace(i,slot);
        }
      }
      return;
    }
    const ticket=requested={index:i,action,ready:null};
    const failed=()=>{
      if (!disposed && !current && requested===ticket && selected===i) portraitView.nativeUnavailable(i);
    };
    stage.prepareAction(i,action,current?'low':'auto').then(ready=>{
      if (disposed || lost || requested!==ticket || selected!==i) return;
      if (ready) { ticket.ready=ready; syncNative(); }
      else failed();
      // A failed 3D file leaves this photographed view playing. The next
      // action or a new inspection can still promote this face to live 3D.
    }).catch(failed);
  }
  const portraitView=bindPortraitView(root,models,{
    onGazePointer(index,x,y) { pointer=index===null ? null : {index,x,y}; },
    onActiveFace(i) {
      if (selected===i) return;
      if (selected!==null) slots[selected].bag=[];
      if (i!==null) slots[i].bag=[];
      if (selected!==null) stage?.cancelPrepare(selected);
      selected=i; requested=null; gaze=null;
      if (i!==null) {
        inspected=inspected.filter(index=>index!==i);
        inspected.push(i);
        if (inspected.length>2) {
          const old=inspected.shift();
          stage?.releaseFace(old);
          if (resident?.index===old) resident=null;
        }
      }
      showLive(null); syncNative();
    },
    onGain(value,galleryGain) {
      fallback.setDisplacementGain(view.hasAttribute('data-detail') ? value : galleryGain);
      if (gain!==value) {
        gain=value;
        stage?.setDisplacementGain(gain);
        if (paused && visible.has(view)) {
          requestedStill=true;
          for (const i of nearby) holdSample(i,slots[i]);
        }
      }
    }
  });

  function chooseAction(i) {
    const slot = slots[i];
    if (slot.resume) { const action=slot.resume; slot.resume=null; return action; }
    if (!slot.bag.length) {
      const available=i===selected ? models[i].actions.filter(a=>a.fallback) : slot.repertoire;
      slot.bag = shuffled(available);
      if (slot.bag.length > 1 && slot.bag.at(-1).id === slot.previous) slot.bag.unshift(slot.bag.pop());
    }
    return slot.bag.pop();
  }
  async function prepareNext(i,slot) {
    const action = chooseAction(i);
    if (!action) return;
    const backend=fallback;
    const next = slot.next = {action,backend,ready:null};
    try {
      const ready = await backend.prepareAction(i,action,slot.run ? 'low' : 'auto');
      if (disposed || slot.next !== next) { ready?.discard?.(); return; }
      if (!ready) throw Error('Unavailable clip');
      next.ready = ready;
      if (paused && (requestedStill || slot.resumeFraction!==null) && !slot.run) holdSample(i,slot);
      schedule();
    } catch {
      if (!disposed && slot.next === next) {
        slot.next = null;
        slot.retryAt=elapsed+400;
      }
    }
  }

  function holdSample(i,slot) {
    if (slot.run || !nearby.has(i)) return;
    if (!slot.next) { prepareNext(i,slot); return; }
    if (!slot.next.ready) return;
    slot.resumeFraction ??= .5;
    advance(i,slot,elapsed);
    syncNative();
  }

  function advance(i,slot,time) {
    const finished = !slot.run || time >= slot.run.end;
    if (finished && slot.next?.ready) {
      const {action,backend,ready} = slot.next;
      slot.next = null;
      if (ready.play()) {
        const duration=1000*(action.frames-1)/action.fps;
        let start=slot.run && time-slot.run.end<100 ? slot.run.end : time;
        if (slot.resumeFraction!==null) {
          start=time-slot.resumeFraction*duration;
          slot.resumeFraction=null;
        }
        slot.run={action,backend,start,end:start+duration,duration};
        slot.previous = action.id;
        if (!paused) eeg?.mark(eegElapsed-(elapsed-start),action,i);
      } else ready.discard?.();
    }
    const run = slot.run;
    if (run) {
      // A slow or unavailable successor never freezes the held facial pose.
      // Keep playing the resident film until its successor has a decoded frame.
      if (time>=run.end) {
        const passes=1+Math.floor((time-run.end)/run.duration);
        run.start+=passes*run.duration; run.end=run.start+run.duration;
      }
      const local=Math.max(0,time-run.start);
      const fraction=local/run.duration;
      slot.progress=galleryProgress(run.action,fraction);
      run.backend.setProgress(i,slot.progress);
    }
    if (!paused && !slot.next && elapsed >= slot.retryAt &&
        (!compact || !run || time >= run.start + run.duration * .4)) prepareNext(i,slot);
  }
  function draw(now) {
    frame=0;
    if (!active()) { last=null; return; }
    const delta = last === null ? 0 : Math.max(0,now-last);
    last=now;
    eegElapsed += delta;
    if (visible.has(view)) {
      elapsed += delta;
      for (const i of nearby) advance(i,slots[i],elapsed);
      syncNative();
    }
    if (visible.has(figure)) eeg.paint(eegElapsed);
    schedule();
  }
  function schedule() {
    if (active() && !frame) frame=requestAnimationFrame(draw);
  }
  function sync() {
    fallback.setPlaying(active() && visible.has(view));
    if (!active()) { cancelAnimationFrame(frame); frame=0; last=null; }
    syncNative();
    schedule();
    label();
  }
  if (button) {
    button.addEventListener('click',()=>{ paused=!paused; sync(); });
    document.addEventListener('languagechange',label);
    button.hidden=false;
  }
  reduce.addEventListener('change',()=>{paused=reduce.matches || saveData; sync();});
  document.addEventListener('visibilitychange',sync);
  function viewerChanged(event) {
    if (!event.target.matches?.('dialog.image-viewer')) return;
    viewerOpen = !!document.querySelector('dialog.image-viewer[open]');
    sync();
  }
  document.addEventListener('toggle',viewerChanged,true);
  document.addEventListener('close',viewerChanged,true);
  const observe=new IntersectionObserver(entries=>{
    for(const e of entries) { if(e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }
    sync();
  });
  // Release decoded animation sheets as soon as a portrait leaves the nearby
  // viewport. Its immutable encoded file remains in the browser cache.
  const observeCards=new IntersectionObserver(entries=>{
    for (const e of entries) {
      const i=prints.indexOf(e.target),slot=slots[i];
      if (e.isIntersecting) {
        nearby.add(i); fallback.setVisible(i,true);
        if (paused && (requestedStill || slot.resumeFraction!==null)) holdSample(i,slot);
      } else {
        nearby.delete(i);
        if (slot.run) {
          const fraction=fallback.heldFraction(i) ?? (elapsed-slot.run.start)/slot.run.duration;
          slot.resumeFraction=Math.min(.999999,Math.max(0,fraction));
        }
        slot.resume=slot.run?.action || slot.next?.action || slot.resume;
        if (i===selected) gaze=null;
        slot.next?.ready?.discard?.(); slot.next=null; slot.run=null;
        fallback.setVisible(i,false);
      }
    }
    syncNative(); schedule();
  },{rootMargin:'120px 0px'});
  prints.forEach(print=>observeCards.observe(print));
  observe.observe(view);
  if (figure) observe.observe(figure);
  window.addEventListener('pagehide',e=>{
    fallback.setPlaying(false);
    cancelAnimationFrame(frame); frame=0; last=null;
    if(e.persisted) return;
    disposed=true; observe.disconnect(); observeCards.disconnect();
    portraitView.attach(null);
    document.removeEventListener('toggle',viewerChanged,true);
    document.removeEventListener('close',viewerChanged,true);
    slots.forEach(slot=>slot.next?.ready?.discard?.());
    stage?.dispose(); fallback.dispose();
  });
  window.addEventListener('pageshow',sync);
  label();
}
