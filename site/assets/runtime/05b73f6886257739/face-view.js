import {t} from './locale.js';

// A frontal resting pose keeps the portraits comparable. Pointer input adds a
// small, shared change of viewpoint and eases back to the registered pose.
export function bindPortraitView(root, models, {onActiveFace,onGain,onGazePointer}) {
  const view = root.querySelector('.face-gallery');
  const grid = view.querySelector('.face-inspect-grid');
  const posters = [...view.querySelectorAll('.face-gallery-print')];
  const galleryImageSizes = posters[0]?.querySelector('img[srcset]')?.sizes;
  const back = root.querySelector('.face-back');
  const help = root.querySelector('.face-view-help');
  const gainControl = root.querySelector('.face-gain');
  const gainSlider=gainControl.querySelector('input');
  const gainValue=gainControl.querySelector('.face-gain-value');
  let galleryGain=Number(gainSlider.value);
  const individualGains=new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const baseRange={yaw:6,pitch:4.5};
  const mouseRange={yaw:3*baseRange.yaw,pitch:3*baseRange.pitch};
  let stage=null, detail=null, entryTop=0, frame=0, lastFrame=0;
  let yaw=0, pitch=0, targetYaw=0, targetPitch=0;
  let contact = null, suppressClick = false;
  let hovered = null, focused = null, activeFace = null, hoverTimer = 0;
  const buttons = models.map((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => showDetail(i));
    button.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => { hovered=i; inspect(); },130);
    });
    button.addEventListener('pointerleave', () => {
      clearTimeout(hoverTimer); hovered=null; inspect();
    });
    button.addEventListener('focus', () => {
      focused=button.matches(':focus-visible') ? i : null; inspect();
    });
    button.addEventListener('blur', () => { focused=null; inspect(); });
    grid.append(button);
    return button;
  });

  function inspect() {
    const next = detail ?? hovered ?? focused;
    if (next === activeFace) return;
    activeFace = next;
    onActiveFace(next);
  }

  function describe() {
    const overview = detail === null;
    const label = overview ? t('Animated portraits', '动态面孔') : t('Portrait ' + (detail+1), '面孔 ' + (detail+1));
    view.setAttribute('aria-label', label);
    buttons.forEach((button, i) => {
      button.setAttribute('aria-label', t('Enlarge portrait '+(i+1), '放大第 '+(i+1)+' 张面孔'));
      button.dataset.hint = t('Enlarge', '放大');
    });
    if (help) {
      const hover = matchMedia('(hover:hover) and (pointer:fine)').matches;
      help.textContent = hover ? t('Move the pointer to turn a face. Click to enlarge.',
        '移动鼠标可转动面孔，点击可放大。') : t('Tap a face for a closer view.', '点按面孔可放大。');
      help.hidden = !overview;
    }
    gainSlider.setAttribute('aria-label',overview ? t('Expression amplitude for all faces','全部面孔的表情幅度') :
      t('Expression amplitude for portrait '+(detail+1),'第 '+(detail+1)+' 张面孔的表情幅度'));
  }

  function ease(now) {
    frame = 0;
    if (!stage || document.hidden) return;
    const elapsed = Math.max(0,now-lastFrame);
    lastFrame = now;
    const step=1-Math.exp(-elapsed/80);
    yaw += (targetYaw-yaw)*step;
    pitch += (targetPitch-pitch)*step;
    if (Math.abs(targetYaw-yaw)<.04) yaw=targetYaw;
    if (Math.abs(targetPitch-pitch)<.04) pitch=targetPitch;
    stage.setViewAngle(yaw,pitch);
    if (yaw!==targetYaw || pitch!==targetPitch) frame=requestAnimationFrame(ease);
  }
  function aim(yawDegrees=0,pitchDegrees=0,range=baseRange) {
    targetYaw=Math.max(-range.yaw,Math.min(range.yaw,yawDegrees));
    targetPitch=Math.max(-range.pitch,Math.min(range.pitch,pitchDegrees));
    if (stage && !frame && (targetYaw!==yaw || targetPitch!==pitch)) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(ease);
    }
  }
  function attach(next) {
    cancelAnimationFrame(frame);
    frame = 0;
    yaw=pitch=0;
    stage = next;
    if (!stage) gainControl.removeAttribute('aria-busy');
    stage?.setDetail(detail);
    if (stage) aim(targetYaw,targetPitch,mouseRange);
  }
  function refreshGain() {
    const value=individualGains.get(detail) ?? galleryGain;
    gainSlider.value=String(value);
    gainSlider.style.setProperty('--gain-position', (value / Number(gainSlider.max) * 100) + '%');
    gainValue.textContent=value.toFixed(2)+'×';
    gainSlider.setAttribute('aria-valuetext',gainValue.textContent);
    onGain(value,galleryGain);
  }
  function setLive(index) {
    if (detail===null || index===detail) gainControl.removeAttribute('aria-busy');
    else gainControl.setAttribute('aria-busy','true');
  }
  function nativeUnavailable(index) {
    if (detail===index) gainControl.removeAttribute('aria-busy');
  }
  gainSlider.addEventListener('input',()=>{
    const value=Number(gainSlider.value);
    if (detail===null) {
      galleryGain=value;
      individualGains.clear();
    } else individualGains.set(detail,value);
    refreshGain();
  });
  gainControl.hidden=false;
  function showDetail(index) {
    const previous = detail;
    if (index !== null) entryTop = buttons[index].getBoundingClientRect().top;
    detail = index;
    onGazePointer(null);
    gainControl.removeAttribute('aria-busy');
    hovered=null;
    clearTimeout(hoverTimer);
    inspect();
    aim(0);
    view.toggleAttribute('data-detail', index !== null);
    grid.hidden = index !== null;
    posters.forEach((print,i) => { print.hidden = index !== null && i !== index; });
    if (galleryImageSizes) {
      if (previous !== null) posters[previous].querySelector('img').sizes = galleryImageSizes;
      if (index !== null) posters[index].querySelector('img').sizes = '100vw';
    }
    back.hidden = index === null;
    stage?.setDetail(index);
    refreshGain();
    describe();
    if (index !== null) {
      back.focus({preventScroll:true});
      if (back.getBoundingClientRect().top < 60) root.scrollIntoView({block:'start',behavior:'instant'});
    } else if (previous !== null) {
      const button = buttons[previous];
      button.focus({preventScroll:true});
      window.scrollBy({top:button.getBoundingClientRect().top-entryTop,behavior:'instant'});
    }
  }
  back.addEventListener('click', () => showDetail(null));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && detail !== null) { event.preventDefault(); showDetail(null); return; }
    if (!stage || !(grid.contains(event.target) || event.target===back)) return;
    switch (event.key) {
      case 'ArrowLeft': aim(targetYaw-2,targetPitch); break;
      case 'ArrowRight': aim(targetYaw+2,targetPitch); break;
      case 'ArrowUp': aim(targetYaw,targetPitch-1.5); break;
      case 'ArrowDown': aim(targetYaw,targetPitch+1.5); break;
      case 'Home': aim(); break;
      default: return;
    }
    event.preventDefault();
  });

  view.addEventListener('pointerdown', e => {
    suppressClick = false;
    if (!e.isPrimary || e.button !== 0) { contact = null; aim(0); return; }
    contact = {id:e.pointerId, x:e.clientX, y:e.clientY, yaw:targetYaw, pitch:targetPitch,
      index:buttons.indexOf(e.target.closest('button'))};
  });
  view.addEventListener('pointermove', e => {
    if (!e.isPrimary) return;
    const tile=detail===null ? e.target.closest('button') : view;
    let x=0, y=0;
    if (e.pointerType==='mouse' && tile && !reduced.matches) {
      const box=tile.getBoundingClientRect();
      x=Math.max(-1,Math.min(1,2*(e.clientX-box.left)/box.width-1));
      y=Math.max(-1,Math.min(1,2*(e.clientY-box.top)/box.height-1));
      const index=detail ?? buttons.indexOf(tile);
      onGazePointer(index<0 ? null : index,x,-y);
    } else onGazePointer(null);
    if (contact && e.pointerId===contact.id) {
      const dx=e.clientX-contact.x, dy=e.clientY-contact.y;
      if (!view.hasPointerCapture(e.pointerId)) {
        if (Math.max(Math.abs(dx),Math.abs(dy))<6) return;
        if (e.pointerType!=='mouse' && Math.abs(dx)<Math.abs(dy)) return;
      }
      suppressClick = true;
      if (detail===null && contact.index >= 0 && e.pointerType!=='mouse') {
        hovered=contact.index;
        inspect();
      }
      if (!view.hasPointerCapture(e.pointerId)) view.setPointerCapture(e.pointerId);
      const mouse=e.pointerType==='mouse', range=mouse ? mouseRange : baseRange;
      aim((mouse ? contact.yaw : 0)+dx/85*range.yaw,(mouse ? contact.pitch : 0)+dy/85*range.pitch,range);
    } else if (e.pointerType==='mouse' && !reduced.matches) {
      aim(x*mouseRange.yaw,y*mouseRange.pitch,mouseRange);
    }
  });
  function release(e) {
    if (contact?.id!==e.pointerId) return;
    contact = null;
    if (e.pointerType!=='mouse') { hovered=null; inspect(); }
    if (view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId);
    aim(0);
  }
  view.addEventListener('pointerup',release);
  view.addEventListener('pointercancel',release);
  view.addEventListener('pointerleave', e => {
    onGazePointer(null);
    if (!view.hasPointerCapture(e.pointerId)) { contact=null; aim(0); }
  });
  view.addEventListener('lostpointercapture', e => {
    if (e.target===view && contact?.id===e.pointerId) { contact=null; aim(0); }
  });
  view.addEventListener('click', e => {
    if (suppressClick && e.detail) { suppressClick=false; e.preventDefault(); e.stopImmediatePropagation(); }
  },true);
  reduced.addEventListener('change',() => aim(0));
  document.addEventListener('visibilitychange',() => { onGazePointer(null); aim(); });
  document.addEventListener('languagechange',describe);
  grid.hidden = false;
  describe();
  return {attach,setLive,nativeUnavailable};
}
