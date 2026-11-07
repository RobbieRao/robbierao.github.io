// Preparation combines decoded media with the actual first-opening timeline.
const manifestNode=document.getElementById('page-load-manifest');
const overlay=document.getElementById('page-loader');
if(manifestNode&&overlay&&!window.__portfolioLoad?.active){
  // Later documents are readable at once. Do not make their first paint wait
  // for decoding, media downloads, the entry scene or a decorative exit fade.
  const state=window.__portfolioLoad||{active:false,finished:false};
  window.__portfolioLoad=state;
  clearTimeout(state.watchdog);overlay.hidden=true;
  document.documentElement.classList.remove('page-preparing');
  const announce=()=>{
    if(state.finished)return;
    state.finished=true;state.active=false;
    document.documentElement.dataset.pageReady='interactive';
    document.dispatchEvent(new CustomEvent('page-ready',{detail:{complete:true,reason:'visible',scope:'document',mediaReady:false,introPlayed:false,elapsedMs:0}}));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',announce,{once:true});
  else queueMicrotask(announce);
}else if(manifestNode&&overlay){
  const manifest=JSON.parse(manifestNode.textContent),state=window.__portfolioLoad||{active:false,finished:false};
  const root=document.documentElement,progress=overlay.querySelector('[role="progressbar"]'),count=overlay.querySelector('.page-loader-count'),status=overlay.querySelector('.page-loader-status'),skip=overlay.querySelector('.page-loader-continue');
  const zh=()=>document.documentElement.lang.startsWith('zh');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const saveData=!!navigator.connection?.saveData;
  const retainedImages=[],inertNodes=[],timers=new Set();
  const controller=new AbortController(),{signal}=controller;
  let done=0,total=0,failures=0,finished=!!state.finished,exitTimer=0,artwork=null,released=false,report=null;
  let introPending=!!state.intro&&state.active&&!reduced.matches&&!saveData;
  let introProgress=introPending?0:1,shownProgress=0;
  let resourceResult=null,resourceDeadline=0,introDeadline=0;
  let criticalImageBytes=0,criticalMedia=null;
  const jobs=[];
  const started=performance.now();
  function labels(){status.textContent=resourceResult&&introPending?(zh()?'正在进入':'Opening'):(zh()?'正在准备首屏':'Preparing view');skip.textContent=zh()?'先进入浏览':'Continue';overlay.setAttribute('aria-label',status.textContent);progress.setAttribute('aria-label',zh()?'首屏准备进度':'View preparation');}
  function later(callback,delay){
    if(signal.aborted)return 0;
    const timer=setTimeout(()=>{timers.delete(timer);if(!signal.aborted)callback();},delay);
    timers.add(timer);return timer;
  }
  function clearTimer(timer){clearTimeout(timer);timers.delete(timer);}
  function rememberIntro(){try{sessionStorage.setItem(manifest.introKey,'1');}catch{}}
  function maybeFinish(){
    if(!finished&&resourceResult&&!introPending)finish(resourceResult.complete,resourceResult.reason);
  }
  function settleIntro(played,reason='unavailable'){
    if(!introPending||finished)return;
    introPending=false;introProgress=1;clearTimer(introDeadline);
    if(played)root.dataset.introPlayed='true';else root.dataset.introSkipped=reason;
    rememberIntro();labels();update();maybeFinish();
  }
  function watchIntro(){
    clearTimer(introDeadline);
    if(!introPending||finished||document.hidden)return;
    // Only a stalled foreground opening times out. Hidden time never skips it.
    introDeadline=later(()=>settleIntro(false,'animation-timeout'),30000);
  }
  function resourcesReady(complete,reason){
    if(finished||resourceResult)return;
    resourceResult={complete,reason,elapsedMs:Math.round(performance.now()-started)};
    clearTimer(resourceDeadline);skip.hidden=true;labels();maybeFinish();
  }
  function disposeArtwork(value){
    try{if(typeof value==='function')value();else if(value?.destroy)value.destroy();else value?.dispose?.();}catch{}
  }
  function stop(){
    controller.abort();
    for(const timer of timers)clearTimeout(timer);
    timers.clear();clearTimeout(exitTimer);clearTimeout(state.watchdog);
    disposeArtwork(artwork);artwork=null;retainedImages.length=0;
  }
  function startArtwork(){
    const stage=overlay.querySelector('.page-loader-artwork');
    if(!stage){settleIntro(false,'missing-stage');return;}
    // The first visit waits for a real completed cycle. Subsequent transitions
    // use resource readiness alone; late imports cannot revive the overlay.
    void import('./loading-artwork.js?v=8046debd6605').then(async module=>{
      if(signal.aborted||finished||!state.active)return;
      const mounted=await module.mountLoadingArtwork(stage,{
        signal,language:zh()?'zh':'en',
        onFirstCycleComplete:()=>settleIntro(true),
        onUnavailable:reason=>settleIntro(false,reason),
        onProgress:value=>{if(!finished&&introPending){introProgress=Math.max(introProgress,Math.min(1,value));update();}},
      });
      if(signal.aborted)disposeArtwork(mounted);else artwork=mounted;
    }).catch(()=>{if(!signal.aborted){stage.dataset.artworkState='fallback';settleIntro(false,'artwork-unavailable');}});
  }
  labels();document.addEventListener('languagechange',labels,{signal});
  if(state.active){
    clearTimeout(state.watchdog);
    for(const node of document.body.children){if(node===overlay||['SCRIPT','STYLE'].includes(node.tagName)||node.inert)continue;node.inert=true;node.dataset.loadInert='';inertNodes.push(node);}
    later(()=>{if(resourceResult)return;skip.hidden=false;status.textContent=zh()?'仍在加载，可以先进入浏览':'Still loading. You can continue browsing.';},6000);
    // Only visible posters and reading essentials gate entry. Background clips
    // never hold the page hostage; stalled essential requests have a fallback.
    resourceDeadline=later(()=>resourcesReady(false,'timeout'),12000);
    document.addEventListener('visibilitychange',watchIntro,{signal});
    watchIntro();
    if(introPending)startArtwork();
    else later(()=>{if(!resourceResult)startArtwork();},600);
  }
  function update(complete=false){
    const weight=jobs.reduce((sum,job)=>sum+job.weight,0);
    const resourceProgress=weight?jobs.reduce((sum,job)=>sum+job.weight*job.progress,0)/weight:0;
    root.dataset.resourceProgress=resourceProgress.toFixed(4);
    root.dataset.introProgress=introProgress.toFixed(4);
    // Both independent prerequisites must finish. This follows real scene
    // motion on a fast network and real media download on a slower one.
    const value=complete?100:Math.min(99,Math.floor(Math.min(resourceProgress,introProgress)*100));
    shownProgress=Math.max(shownProgress,value);
    root.style.setProperty('--page-load',String(shownProgress/100));count.textContent=String(shownProgress).padStart(2,'0');progress.setAttribute('aria-valuenow',String(shownProgress));
  }
  function timed(promise,ms=30000){return new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimer(timer);signal.removeEventListener('abort',cancel);};
    const cancel=()=>{cleanup();reject(new DOMException('Loading stopped','AbortError'));};
    const timer=later(()=>{cleanup();reject(new Error('resource-timeout'));},ms);
    signal.addEventListener('abort',cancel,{once:true});
    Promise.resolve(promise).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
  });}
  function release(){
    clearTimeout(exitTimer);root.classList.remove('page-preparing');overlay.hidden=true;
    if(!released&&report){released=true;document.dispatchEvent(new CustomEvent('page-ready',{detail:report}));}
  }
  function finish(complete,reason,immediate=false){
    if(finished){if(immediate){stop();release();}return;}
    finished=true;stop();
    update(complete);
    state.active=false;state.finished=true;
    for(const node of inertNodes){node.inert=false;node.removeAttribute('data-load-inert');}
    report={complete,reason,scope:'initial-viewport',ready:done-failures,resources:total,failed:failures,elapsedMs:Math.round(performance.now()-started),resourceElapsedMs:resourceResult?.elapsedMs,introPlayed:root.dataset.introPlayed==='true',imageBytes:criticalImageBytes,videoBytes:0,deferredVideoBytes:manifest.videoBytes||0,media:criticalMedia};
    root.dataset.pageReady=complete?'complete':'partial';root.dataset.pageReadyMs=String(report.elapsedMs);
    // The key is recorded only after all required work succeeded. A skipped load is retried next visit.
    if(complete){try{sessionStorage.setItem(manifest.key,'1');}catch{}}
    overlay.classList.add('is-leaving');
    if(immediate||reduced.matches||!root.classList.contains('page-preparing'))release();else exitTimer=setTimeout(release,260);
  }
  state.finish=finish;
  skip.addEventListener('click',()=>{if(introPending)rememberIntro();finish(false,'continued');},{signal});
  // BFCache must never restore an inert page or restart a detached renderer.
  addEventListener('pagehide',()=>finish(false,'pagehide',true));
  addEventListener('pageshow',event=>{if(event.persisted)finish(false,'restored',true);});
  function imageReady(url){return new Promise((resolve,reject)=>{
    const absolute=new URL(url,location.href).href;
    const image=Array.from(document.images).find(node=>(node.currentSrc||node.src)===absolute)||new Image();
    let decoding=false;
    const cleanup=()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',failed);signal.removeEventListener('abort',cancel);};
    const success=()=>{cleanup();resolve(image);};
    const cancel=()=>{cleanup();reject(new DOMException('Loading stopped','AbortError'));};
    const failed=error=>{cleanup();reject(error);};
    const loaded=()=>{if(!decoding){decoding=true;image.decode().then(success,failed);}};
    image.decoding='async';image.fetchPriority='high';image.loading='eager';
    image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});
    signal.addEventListener('abort',cancel,{once:true});retainedImages.push(image);
    if(!image.getAttribute('src'))image.src=url;
    if(image.complete){if(image.naturalWidth>0)loaded();else failed(new Error('image-unavailable'));}
  });}
  function waitForEvent(name){return new Promise((resolve,reject)=>{
    const cleanup=()=>{document.removeEventListener(name,success);signal.removeEventListener('abort',cancel);};
    const success=()=>{cleanup();resolve();};
    const cancel=()=>{cleanup();reject(new DOMException('Loading stopped','AbortError'));};
    document.addEventListener(name,success,{once:true});signal.addEventListener('abort',cancel,{once:true});
  });}
  function domReady(){
    return document.readyState==='loading'?waitForEvent('DOMContentLoaded'):Promise.resolve();
  }
  async function run(){
    await domReady();
    if(finished)return;
    // Inspect the real viewport (including deep links/restored scroll), not the
    // entire inventory. Media modules own project posters; this job handles the
    // portrait and visible article figures without downloading both srcsets.
    const inventory=new Set(manifest.images.map(url=>new URL(url,location.href).href));
    const visible=image=>{
      if(image.closest('[hidden],#page-loader,.work-media,.canvas-card-media'))return false;
      const rect=image.getBoundingClientRect();
      return rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth;
    };
    const images=Array.from(document.images).filter(image=>inventory.has(image.src)&&visible(image));
    const urls=[...new Set(images.map(image=>image.currentSrc||image.src))];
    function addJob(weight,run){jobs.push({weight:Math.max(1,weight),progress:0,run});}
    addJob(16384,()=>timed(document.fonts?.ready||Promise.resolve(),10000));
    if(manifest.canvas||manifest.workMedia){
      addJob(32768,async onProgress=>{
        // Same versioned module identity as the entry script: initialization is
        // awaited rather than assuming a DOM-ready event means media is ready.
        const module=manifest.canvas?await import('./infinite-canvas.js?v=8046debd6605'):await import('./work-media.js?v=8046debd6605');
        if(signal.aborted)return;
        const prepare=manifest.canvas?module.prepareCanvasMedia:module.prepareWorkMedia;
        const result=await timed(prepare({signal,onProgress:state=>onProgress(Math.max(0,Math.min(1,state.ratio||0)))}),11000);
        criticalMedia=result;
        if(result?.failed)throw new Error('cover-media-unavailable');
      });
    }
    for(const url of urls){
      const source=images.find(image=>(image.currentSrc||image.src)===url);
      const original=manifest.images.find(value=>new URL(value,location.href).href===source?.src);
      const bytes=manifest.imageSizes?.[original]||32768;
      criticalImageBytes+=bytes;
      addJob(bytes,()=>timed(imageReady(url),10000));
    }
    total=jobs.length;update();
    let cursor=0;
    async function worker(){
      while(cursor<jobs.length&&!finished&&!resourceResult){
        const job=jobs[cursor++];
        try{await job.run(value=>{if(!finished&&!resourceResult){job.progress=Math.max(job.progress,Math.min(.999,value));update();}});job.progress=1;}
        catch{if(finished||resourceResult)return;failures++;}
        if(finished||resourceResult)return;done++;update();
      }
    }
    // Four image decodes at once keep the main thread responsive.
    await Promise.all(Array.from({length:saveData?2:4},worker));
    if(!finished)resourcesReady(failures===0,failures?'fallback':'ready');
  }
  if(!finished)void run().catch(()=>resourcesReady(false,'fallback'));
}
