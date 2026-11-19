import {t} from './locale.js';
import {prepareStudioScene,studioFrame,STUDIO_SETTLED_TIME} from './studio-scene.js';
const study=document.querySelector('.perspective-study');
if(study){
  study.dataset.loading='true';
  const stage=study.querySelector('.perspective-stage'),pause=study.querySelector('.study-pause'),replay=study.querySelector('.study-replay');
  const loadingStatus=study.querySelector('.study-loading-status');
  let entryPending=document.documentElement.classList.contains('page-preparing');
  function progress(value){
    study.style.setProperty('--study-load',String(value));
    loadingStatus?.setAttribute('aria-valuenow',String(Math.round(value*100)));
  }
  function loaded(){
    progress(1);study.dataset.loading='false';
    loadingStatus?.setAttribute('aria-hidden','true');
    document.dispatchEvent(new CustomEvent('studio-ready',{detail:{renderer:study.dataset.renderer}}));
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:700px)');
  let renderer=null,scene=null,makeGeometry=null,visible=true,disposed=false,paused=reduced.matches,time=paused?STUDIO_SETTLED_TIME:0,raf=0,last=0,painted=0;
  let pointerX=0,pointerY=0,targetX=0,targetY=0,inspect=0,inspectTarget=0,dragYaw=0,dragPitch=0,drag=null;
  function draw(){
    if(!renderer||!scene)return;
    const frame=studioFrame(scene,{time,pointerX,pointerY,inspect,dragYaw,dragPitch,mobile:mobile.matches});
    renderer.render(frame);stage.dataset.phase=frame.phase;stage.dataset.inspect=inspect.toFixed(2);stage.dataset.time=time.toFixed(2);stage.dataset.rotation=dragYaw.toFixed(2);
  }
  function labels(){
    pause.setAttribute('aria-label',paused?t('Play animation','播放动画'):t('Pause animation','暂停动画'));
    pause.setAttribute('aria-pressed',String(paused));
    replay.setAttribute('aria-label',t('Replay the opening','重播开场'));
  }
  function frame(now){
    raf=0;if(!visible||document.hidden||disposed||entryPending)return;
    const dt=Math.min((now-last)/1000||0,.06);last=now;
    if(!paused)time+=dt;
    const blend=1-Math.exp(-dt*5);
    pointerX+=(targetX-pointerX)*blend;pointerY+=(targetY-pointerY)*blend;inspect+=(inspectTarget-inspect)*blend;
    if(now-painted>1000/(mobile.matches?20:30)){draw();painted=now;}
    if(!paused||Math.abs(pointerX-targetX)+Math.abs(pointerY-targetY)+Math.abs(inspect-inspectTarget)>.002)raf=requestAnimationFrame(frame);
  }
  function wake(){if(!raf&&visible&&!document.hidden&&!disposed&&!entryPending){last=performance.now();raf=requestAnimationFrame(frame);}}
  function inspectBreak(){inspectTarget=inspectTarget>.5?0:1;if(reduced.matches)inspect=inspectTarget;time=Math.max(time,STUDIO_SETTLED_TIME);draw();wake();}
  stage.addEventListener('pointerdown',event=>{
    if(event.target.closest('button')||event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false,touch:event.pointerType==='touch'};
  });
  stage.addEventListener('pointermove',event=>{
    if(drag&&drag.id===event.pointerId){
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.moved&&Math.hypot(dx,dy)>6&&(!drag.touch||Math.abs(dx)>Math.abs(dy))){drag.moved=true;stage.setPointerCapture(event.pointerId);stage.classList.add('is-rotating');}
      if(drag.moved){
        if(event.cancelable)event.preventDefault();
        dragYaw+=(event.clientX-drag.lastX)*.008;dragPitch=Math.max(-.6,Math.min(.6,dragPitch+(event.clientY-drag.lastY)*.005));
        drag.lastX=event.clientX;drag.lastY=event.clientY;draw();
      }
    }
    if(!reduced.matches&&event.pointerType!=='touch'){
      const b=stage.getBoundingClientRect();targetX=(event.clientX-b.left)/b.width*2-1;targetY=(event.clientY-b.top)/b.height*2-1;wake();
    }
  },{passive:false});
  function endDrag(event){
    if(!drag||drag.id!==event.pointerId)return;
    const click=!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7&&event.type==='pointerup';
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    drag=null;stage.classList.remove('is-rotating');if(click)inspectBreak();
  }
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
  stage.addEventListener('pointerleave',()=>{targetX=targetY=0;wake();});
  stage.addEventListener('keydown',event=>{
    if(event.target.closest('button'))return;
    if(event.key==='Enter'||event.key===' '){event.preventDefault();inspectBreak();}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();if(event.key==='ArrowLeft')dragYaw-=.16;if(event.key==='ArrowRight')dragYaw+=.16;
      if(event.key==='ArrowUp')dragPitch=Math.max(-.6,dragPitch-.12);if(event.key==='ArrowDown')dragPitch=Math.min(.6,dragPitch+.12);draw();
    }
  });
  pause.addEventListener('click',()=>{paused=!paused;labels();wake();});
  replay.addEventListener('click',()=>{time=reduced.matches?STUDIO_SETTLED_TIME:0;paused=reduced.matches;inspect=inspectTarget=dragYaw=dragPitch=0;labels();draw();wake();});
  document.addEventListener('click',event=>{if(!event.target.closest('.bug-word'))return;inspectBreak();study.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){draw();wake();}else{cancelAnimationFrame(raf);raf=0;}});observer.observe(stage);
  const sizing=new ResizeObserver(()=>{renderer?.resize();draw();});sizing.observe(stage);
  document.addEventListener('page-ready',()=>{const wasPending=entryPending;entryPending=false;if(wasPending)time=reduced.matches?STUDIO_SETTLED_TIME:0;draw();wake();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused)time=STUDIO_SETTLED_TIME;targetX=targetY=pointerX=pointerY=0;labels();draw();wake();});
  function refreshGeometry(){
    if(scene&&makeGeometry){scene=prepareStudioScene(makeGeometry(document.documentElement.lang.startsWith('zh')?'zh':'en',{compact:mobile.matches}));renderer?.setScene(scene);time=Math.max(time,STUDIO_SETTLED_TIME);}
    labels();draw();wake();
  }
  document.addEventListener('languagechange',refreshGeometry);
  mobile.addEventListener('change',refreshGeometry);
  progress(.05);
  requestAnimationFrame(()=>Promise.all([import('./studio-geometry.js'),import('./studio-renderer.js')]).then(async([geometryModule,rendererModule])=>{
    if(disposed)return;makeGeometry=geometryModule.makeStudioGeometry;
    progress(.35);
    // Yield once so the module-complete milestone can paint before meshing.
    await new Promise(resolve=>requestAnimationFrame(resolve));
    if(disposed)return;
    scene=prepareStudioScene(makeGeometry(document.documentElement.lang.startsWith('zh')?'zh':'en',{compact:mobile.matches}));
    progress(.76);
    const candidate=await rendererModule.mountStudioRenderer(stage,scene,{onBackendChange(info){study.dataset.renderer=info.backend;study.dataset.ready=String(info.backend!=='static');}});
    if(disposed){candidate.destroy();return;}renderer=candidate;renderer.setScene(scene);draw();
    // Finish device/pipeline preparation behind the page entry screen.
    await renderer.prepare?.();
    if(disposed)return;draw();loaded();wake();
  }).catch(()=>{study.dataset.renderer='static';study.dataset.ready='false';loaded();}));
  addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;cancelAnimationFrame(raf);renderer?.destroy();observer.disconnect();sizing.disconnect();});
  labels();
}
