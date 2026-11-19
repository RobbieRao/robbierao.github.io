// The fallback carries the same camera projection, clip timing and light as the live stage.
import {sequenceFrame} from './face-sequence-time.js';

export function createFallback(root, models, onReplacement) {
  const prints = [...root.querySelectorAll('.face-gallery-print')].map(node => ({
    node, tile:null, atlas:null, request:null, action:null, progress:0, lastFrame:-1,
    visible:true, revision:0, decodeNext:null,
    boosted:false, replacement:null,
  }));
  let disposed = false, gain=1, decoders=0;
  const waiting=[];
  // Keep compressed sheets for repeat plays. Decoded sheets are much larger
  // and are released independently when a clip or a visible portrait changes.
  const encoded=new Map(), byteLimit=24*1024*1024;
  let encodedBytes=0;

  function release(print) {
    print.atlas?.close?.();
    print.atlas = null;
    print.decodeNext?.();
    print.decodeNext = null;
  }

  function reset(print) {
    ++print.revision;
    print.request?.abort();
    print.replacement?.abort();
    print.replacement=null;
    print.request = null;
    release(print);
    print.action = null;
    print.lastFrame = -1;
    print.node.classList.remove('has-performance');
  }

  async function imageBitmap(blob, signal) {
    if (decoders<2) decoders++;
    else await new Promise(resolve=>waiting.push(resolve));
    try {
      signal.throwIfAborted();
      if ('createImageBitmap' in window) return await createImageBitmap(blob);
      const src = URL.createObjectURL(blob);
      try {
        const image = new Image(); image.src=src; await image.decode();
        signal.throwIfAborted();
        return image;
      } finally { URL.revokeObjectURL(src); }
    } finally { if (waiting.length) waiting.shift()(); else decoders--; }
  }

  const usesBoost=action=>gain===2 && !!action.boostedRevision;
  async function fetchSheet(index,action,boosted,request,priority) {
    const key=boosted ? action.boostedRevision : action.fallbackRevision || models[index].galleryRevision;
    const dir=boosted?'boosted':'cells';
    const url='/assets/face-study/gallery/'+dir+'/'+models[index].id+'-'+action.id+'.webp?v='+key;
    if (encoded.has(url)) {
      const blob=encoded.get(url);
      encoded.delete(url); encoded.set(url,blob);
      return blob;
    }
    const response=await fetch(url,{signal:request.signal,priority,cache:'force-cache'});
    if (!response.ok) throw new Error('Unavailable portrait animation');
    const blob=await response.blob();
    if (!disposed && !request.signal.aborted && blob.size<=byteLimit && !encoded.has(url)) {
      encoded.set(url,blob); encodedBytes+=blob.size;
      while (encodedBytes>byteLimit) {
        const oldest=encoded.keys().next().value;
        encodedBytes-=encoded.get(oldest).size; encoded.delete(oldest);
      }
    }
    return blob;
  }
  function fitTile(print,atlas,action) {
    const columns=Math.ceil(Math.sqrt(action.frames));
    const rows=Math.ceil(action.frames / columns);
    const w=Math.round(atlas.width/columns), h=Math.round(atlas.height/rows);
    if (print.tile.width!==w) print.tile.width=w;
    if (print.tile.height!==h) print.tile.height=h;
  }
  async function refreshAmplitude(index) {
    const print=prints[index],action=print.action;
    print.replacement?.abort(); print.replacement=null;
    if (!action || !print.visible) return;
    const boosted=usesBoost(action);
    if (boosted===print.boosted) return;
    const request=print.replacement=new AbortController();
    try {
      const blob=await fetchSheet(index,action,boosted,request,'auto');
      const atlas=await imageBitmap(blob,request.signal);
      if (request.signal.aborted || disposed || print.action!==action || print.replacement!==request) {
        atlas.close?.(); return;
      }
      print.atlas?.close?.(); print.atlas=atlas; print.boosted=boosted;
      fitTile(print,atlas,action);
      print.lastFrame=-1; draw(print);
      onReplacement?.(index);
    } catch { /* The current variant is already playing. */ }
    finally { if (print.replacement===request) print.replacement=null; }
  }

  function draw(print) {
    const {atlas,tile,action} = print;
    if (!atlas || !action || !print.visible) return;
    const frames = action.frames;
    const columns = Math.ceil(Math.sqrt(frames));
    const frame = sequenceFrame(action,print.progress);
    // Fetch while the current animation is playing. Give its successor time
    // to decode, while retaining the current sheet if the network is slow.
    if (frame>=frames-15 || (frame<15 && print.lastFrame>frame)) {
      print.decodeNext?.(); print.decodeNext=null;
    }
    if (frame === print.lastFrame) return;
    const x = frame % columns * tile.width;
    const y = Math.floor(frame / columns) * tile.height;
    const ctx = tile.getContext('2d');
    ctx.clearRect(0,0,tile.width,tile.height);
    ctx.drawImage(atlas,x,y,tile.width,tile.height,0,0,tile.width,tile.height);
    print.lastFrame = frame;
    print.node.classList.add('has-performance');
  }

  async function prepareAction(index, action, priority) {
    const print = prints[index];
    if (!print?.visible || !action || disposed) return false;
    const revision = ++print.revision;
    const request = new AbortController();
    print.request = request;
    const boosted=usesBoost(action);
    try {
      const blob=await fetchSheet(index,action,boosted,request,priority);
      if (request.signal.aborted || revision !== print.revision) return false;
      if (print.atlas && print.lastFrame<print.action.frames-15)
        await new Promise(resolve => { print.decodeNext = resolve; });
      if (request.signal.aborted || revision !== print.revision) return false;
      const atlas = await imageBitmap(blob, request.signal);
      if (disposed || revision !== print.revision || request.signal.aborted) {
        atlas.close?.();
        return false;
      }
      print.request = null;
      return {
        play() {
          if (disposed || revision !== print.revision) return false;
          const tile = print.tile || document.createElement('canvas');
          tile.className = 'face-gallery-film';
          tile.setAttribute('aria-hidden','true');
          if (!tile.parentNode) print.node.append(tile);
          print.atlas?.close?.();
          Object.assign(print,{tile,atlas,action,boosted,progress:0,lastFrame:-1});
          fitTile(print,atlas,action);
          draw(print);
          refreshAmplitude(index);
          return true;
        },
        discard() { atlas.close?.(); }
      };
    } catch {
      if (revision === print.revision) print.request = null;
      return false;
    }
  }

  function setProgress(index,value) {
    const print = prints[index];
    if (!print) return;
    print.progress = Math.max(0,Math.min(1, Number(value) || 0));
    draw(print);
  }
  function rest(index) {
    const print = prints[index];
    if (!print) return;
    reset(print);
  }
  function setVisible(index, visible) {
    const print = prints[index];
    if (!print || print.visible === visible) return;
    print.visible = visible;
    if (!visible) rest(index);
  }
  return {
    setProgress, setVisible, prepareAction, rest,
    currentPlate(index) {
      const p=prints[index];
      return p?.action && p.lastFrame>=0 ? {source:p.tile,action:p.action,frame:p.lastFrame,sourceGain:p.boosted ? 2 : 1} : null;
    },
    setDisplacementGain(value) {
      if (value===gain) return;
      gain=value;
      prints.forEach((_,i)=>refreshAmplitude(i));
    },
    dispose() {
      disposed = true;
      prints.forEach((print,i) => { rest(i); print.tile?.remove(); });
      encoded.clear(); encodedBytes=0;
    }
  };
}
