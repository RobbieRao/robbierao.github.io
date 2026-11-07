import {t} from './locale.js';
// DOM remains the source of content. Enhancement only changes layout and navigation.
const cards=[...document.querySelectorAll('.portfolio-card')].sort((a,b)=>Number(a.dataset.order)-Number(b.dataset.order));
const narrow=matchMedia('(max-width: 700px)');
let filter='all';
function arrange(){
  const left=document.querySelector('#work-left'),right=document.querySelector('#work-right');if(!left)return;
  let count=0;
  for(const card of cards){const show=filter==='all'||card.dataset.kind===filter;card.hidden=!show;if(show){(narrow.matches||count%2===0?left:right).append(card);count++;}else right.append(card);}
  document.querySelector('.filter-result').textContent=t(`${count} ${filter==='all'?'works':filter+' works'}`,`${count} 项${filter==='research'?'研究':filter==='design'?'设计':'作品'}`);
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
}
function changeFilter(next){filter=next;arrange();}
if(cards.length && document.querySelector('#work-left')){
  arrange();narrow.addEventListener('change',arrange);
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{changeFilter(button.dataset.filter);const hash=filter==='all'?'work':filter;history.replaceState(null,'','#'+hash);}));
  function fromHash(){const hash=decodeURIComponent(location.hash.slice(1));if(hash==='work')changeFilter('all');else if(hash==='research'||hash==='design')changeFilter(hash);else if(cards.some(c=>c.id===hash)){changeFilter('all');requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView({block:'start',behavior:'instant'}));}}
  document.querySelectorAll('a[href="#research"],a[href="#design"],a[href="#work"]').forEach(link=>link.addEventListener('click',()=>changeFilter(link.hash==='#work'?'all':link.hash.slice(1))));
  window.addEventListener('hashchange',fromHash);fromHash();
  document.addEventListener('languagechange',()=>{document.querySelector('.filter-result').textContent=t(`${cards.filter(c=>!c.hidden).length} works`,`${cards.filter(c=>!c.hidden).length} 项作品`);});
}

const toc=[...document.querySelectorAll('.case-toc a')];
if(toc.length){
  const entries=toc.map(a=>({link:a,section:document.querySelector(a.hash)})).filter(x=>x.section);
  const tocScroller=document.querySelector('.case-toc');
  function revealCurrentChapter(){
    const current=tocScroller.querySelector('[aria-current="location"]');
    if(!current||tocScroller.scrollWidth<=tocScroller.clientWidth+1)return;
    const item=current.getBoundingClientRect(),bounds=tocScroller.getBoundingClientRect();
    if(item.left<bounds.left)tocScroller.scrollBy({left:item.left-bounds.left,behavior:'instant'});
    else if(item.right>bounds.right)tocScroller.scrollBy({left:item.right-bounds.right,behavior:'instant'});
  }
  let currentEntry=null,tocPending=false;
  function setCurrentChapter(current){
    if(!current||currentEntry===current)return;
    currentEntry=current;
    entries.forEach(({link})=>{if(link===current.link)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    revealCurrentChapter();
  }
  function updateChapter(){
    tocPending=false;
    const header=document.querySelector('.studio-header');
    const horizontal=getComputedStyle(tocScroller).flexDirection==='row';
    const line=Math.max(64,(header?.getBoundingClientRect().bottom||0)+64,
      horizontal?document.querySelector('.case-sidebar').getBoundingClientRect().bottom+24:0);
    // Short final sections may never cross an observer strip. Reaching the
    // document bottom still means that the final chapter is being read.
    const atBottom=scrollY>0&&scrollY+innerHeight>=document.documentElement.scrollHeight-2;
    setCurrentChapter(atBottom?entries.at(-1):[...entries].reverse().find(({section})=>section.getBoundingClientRect().top<=line)||entries[0]);
  }
  function scheduleChapter(){if(!tocPending){tocPending=true;requestAnimationFrame(updateChapter);}}
  entries.forEach(entry=>entry.link.addEventListener('click',()=>setCurrentChapter(entry)));
  addEventListener('scroll',scheduleChapter,{passive:true});
  addEventListener('resize',scheduleChapter);
  document.addEventListener('languagechange',()=>{scheduleChapter();requestAnimationFrame(revealCurrentChapter);});
  scheduleChapter();
  const track=document.querySelector('.reading-track i'),percent=document.querySelector('.reading-percent');
  if(track||percent){
    let scheduled=false;
    const progress=()=>{scheduled=false;const max=document.documentElement.scrollHeight-innerHeight,value=Math.max(0,Math.min(100,scrollY/Math.max(1,max)*100));if(track)track.style.width=value+'%';if(percent)percent.textContent=Math.round(value)+'%';};
    addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(progress);}},{passive:true});progress();
  }
}

const imageLinks=[...document.querySelectorAll('.case-media a[href],.publication-figure[href]')].filter(a=>/\.(webp|png|jpg|jpeg|avif|gif|svg)(?:\?|$)/i.test(a.href));
if(imageLinks.length && typeof HTMLDialogElement!=='undefined' && 'showModal' in HTMLDialogElement.prototype){
  const gallery=[],positions=new Map(),links=new Map();
  const rotation=link=>!!(link.querySelector('.rotate-ccw')||link.closest('.rotate-ccw'));
  for(const link of imageLinks){
    const key=link.href+'|'+rotation(link);
    if(!positions.has(key)){positions.set(key,gallery.length);gallery.push(link);}
    links.set(link,positions.get(key));
  }
  const dialog=document.createElement('dialog');dialog.className='image-dialog image-viewer';
  dialog.innerHTML=`<header class="image-toolbar"><div class="image-info"><output class="image-index" aria-live="polite"></output><span class="image-dimensions"></span></div><div class="image-view-controls"><button type="button" class="image-fit"></button><button type="button" class="image-native">100%</button><a class="image-original" target="_blank" rel="noopener"></a></div><button type="button" class="image-close" autofocus></button></header><div class="image-stage" tabindex="0" role="region" aria-describedby="image-viewer-help"><div class="image-surface"><div class="image-frame"><img class="image-asset" alt="" draggable="false" decoding="async"></div></div><p class="image-status" role="status"></p></div><footer class="image-footer"><div class="image-description"><p class="image-caption" tabindex="0"></p><p class="image-help" id="image-viewer-help"></p></div><nav class="image-navigation"><button type="button" class="image-prev"></button><button type="button" class="image-next"></button></nav></footer>`;
  document.body.append(dialog);
  const q=selector=>dialog.querySelector(selector),stage=q('.image-stage'),surface=q('.image-surface'),frame=q('.image-frame'),img=q('.image-asset'),caption=q('.image-caption'),status=q('.image-status'),fitButton=q('.image-fit'),nativeButton=q('.image-native');
  let active=0,source=gallery[0],trigger=null,mode='fit',loaded=false,failed=false,bodyOverflow='',drag=null;
  const captionFor=link=>(link.closest('figure')?.querySelector('figcaption')?.textContent||link.querySelector('img')?.alt||'').replace(/\s+/g,' ').trim();
  function labels(){
    dialog.setAttribute('aria-label',t('Project image viewer','项目图片查看器'));
    q('.image-navigation').setAttribute('aria-label',t('Image navigation','图片导航'));
    for(const [selector,en,zh] of [['.image-fit','Fit','适应窗口'],['.image-native','100%','100%'],['.image-original','Original ↗','打开原图 ↗'],['.image-close','Close ×','关闭 ×'],['.image-prev','← Previous','← 上一张'],['.image-next','Next →','下一张 →']])q(selector).textContent=t(en,zh);
    fitButton.setAttribute('aria-label',t('Fit image to the window','让图片适应窗口'));
    q('.image-close').setAttribute('aria-label',t('Close image viewer','关闭图片查看器'));
    nativeButton.setAttribute('aria-label',t('View at original pixel size, 100 percent','按原始像素尺寸查看，百分之百'));
    q('.image-original').setAttribute('aria-label',t('Open original image in a new tab','在新标签页打开原图'));
    for(const link of imageLinks)link.setAttribute('aria-label',t('Enlarge image: ','放大图片：')+captionFor(link));
    describe();
  }
  function describe(){
    caption.textContent=captionFor(source);caption.hidden=!caption.textContent;
    img.alt=source.querySelector('img')?.alt||t('Project image','项目图片');
    q('.image-index').textContent=t('Image ','图片 ')+(active+1)+' / '+gallery.length;
    q('.image-dimensions').textContent=loaded?img.naturalWidth+' × '+img.naturalHeight+' px':'';
    status.textContent=failed?t('This image could not load. Use “Original” to open the file.','图片暂时无法加载，可选择“打开原图”查看文件。'):loaded?'':t('Loading image…','正在加载图片…');
    status.hidden=loaded;
    stage.setAttribute('aria-busy',String(!loaded&&!failed));
    stage.setAttribute('aria-label',t('Image. In 100% view, drag, scroll, or use arrow keys to pan.','图片。100% 查看时，可拖动、滚动或使用方向键平移。'));
    q('.image-help').textContent=mode==='fit'?t('← → Browse · 100% to inspect details','← → 切换图片 · 100% 查看细节'):t('Drag or scroll to pan · Arrow keys move the image','拖动或滚动平移 · 方向键移动图片');
    fitButton.setAttribute('aria-pressed',String(mode==='fit'));nativeButton.setAttribute('aria-pressed',String(mode==='native'));
    fitButton.disabled=nativeButton.disabled=!loaded;
    q('.image-prev').disabled=q('.image-next').disabled=gallery.length<2;
  }
  function layout(center=false){
    if(!dialog.open||!loaded)return;
    const rotated=rotation(source),width=rotated?img.naturalHeight:img.naturalWidth,height=rotated?img.naturalWidth:img.naturalHeight;
    const scale=mode==='native'?1:Math.min(1,Math.max(1,stage.clientWidth-32)/width,Math.max(1,stage.clientHeight-32)/height);
    frame.style.width=width*scale+'px';frame.style.height=height*scale+'px';
    img.style.width=img.naturalWidth*scale+'px';img.style.height=img.naturalHeight*scale+'px';
    img.style.transform='translate(-50%,-50%)'+(rotated?' rotate(-90deg)':'');
    stage.classList.toggle('can-pan',mode==='native'&&(width>stage.clientWidth-32||height>stage.clientHeight-32));
    if(center){stage.scrollLeft=(surface.scrollWidth-stage.clientWidth)/2;stage.scrollTop=(surface.scrollHeight-stage.clientHeight)/2;}
  }
  function setMode(next){mode=next;describe();layout(true);}
  function endDrag(){if(drag&&stage.hasPointerCapture(drag.id))stage.releasePointerCapture(drag.id);drag=null;stage.classList.remove('is-dragging');}
  function show(index,link){
    endDrag();active=(index+gallery.length)%gallery.length;source=link||gallery[active];mode='fit';loaded=false;failed=false;frame.hidden=true;
    q('.image-original').href=source.href;stage.classList.remove('can-pan');stage.scrollTo(0,0);caption.scrollTop=0;
    describe();img.src=source.href;
    if(img.complete&&img.naturalWidth)ready();
  }
  function ready(){loaded=true;failed=false;frame.hidden=false;describe();layout(true);}
  img.addEventListener('load',ready);
  img.addEventListener('error',()=>{loaded=false;failed=true;frame.hidden=true;describe();});
  for(const link of imageLinks)link.addEventListener('click',event=>{
    if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    trigger=link;show(links.get(link),link);
    try{dialog.showModal();}catch{return;}
    event.preventDefault();bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';layout(true);
  });
  fitButton.addEventListener('click',()=>setMode('fit'));nativeButton.addEventListener('click',()=>setMode('native'));
  q('.image-prev').addEventListener('click',()=>show(active-1));q('.image-next').addEventListener('click',()=>show(active+1));
  q('.image-close').addEventListener('click',()=>dialog.close());
  stage.addEventListener('dblclick',event=>{if(loaded&&event.target===img){event.preventDefault();setMode(mode==='fit'?'native':'fit');}});
  stage.addEventListener('pointerdown',event=>{
    if(event.target===stage||event.pointerType==='touch'||event.button!==0||!stage.classList.contains('can-pan'))return;
    event.preventDefault();stage.focus({preventScroll:true});drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;stage.scrollLeft=drag.left-(event.clientX-drag.x);stage.scrollTop=drag.top-(event.clientY-drag.y);});
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);stage.addEventListener('lostpointercapture',()=>{drag=null;stage.classList.remove('is-dragging');});
  dialog.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.target===caption)return;
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},direction=directions[event.key];
    if(!direction)return;
    if(mode==='native'){event.preventDefault();stage.scrollBy({left:direction[0]*80,top:direction[1]*80,behavior:'instant'});}
    else if(direction[0]&&gallery.length>1){event.preventDefault();show(active+direction[0]);}
  });
  dialog.addEventListener('close',()=>{endDrag();document.body.style.overflow=bodyOverflow;if(trigger?.isConnected)trigger.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  new ResizeObserver(()=>layout(mode==='fit')).observe(stage);
  document.addEventListener('languagechange',labels);labels();
}
