import {t} from './locale.js';
const footer = document.querySelector('.experimental-footer');
if (footer) {
  const canvas = footer.querySelector('canvas'), ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = {x: .5, y: .5, active: false};
  const ripples = [];
  const glyphs = ' .,:;=+x*#';
  let width = 1, height = 1, cols = 1, rows = 1, time = 0, last = 0, painted = 0, raf = 0;
  let visible = false, paused = reduced.matches;
  const cell = 6.6, row = 11;
  function draw() {
    ctx.fillStyle = '#171717'; ctx.fillRect(0, 0, width, height);
    ctx.font = '10px Menlo,Consolas,monospace'; ctx.textBaseline = 'top';
    const px = pointer.x * width, py = pointer.y * height;
    for (let y = 0; y < rows; y++) {
      const lines = ['', '', ''];
      for (let x = 0; x < cols; x++) {
        const sx = x * cell, sy = y * row;
        const influence = pointer.active ? Math.exp(-Math.hypot(sx - px, sy - py) / 150) * 1.35 : 0;
        let field = sx * .006 + Math.sin(sy * .014 + time * .11) * 1.9 + Math.cos(sx * .009 - sy * .012 + time * .07) * .8 + influence;
        let highlight = 0;
        for (const ripple of ripples) {
          const age = time - ripple.born, distance = Math.hypot(sx - ripple.x, sy - ripple.y);
          const envelope = Math.max(0, 1 - age / 7);
          field += Math.sin(distance * .035 - age * 2.8) * Math.exp(-Math.abs(distance - age * 35) / 80) * envelope * 1.3;
          highlight = Math.max(highlight, Math.max(0, 1 - Math.abs(distance - age * 35) / 7) * envelope);
          if (age < 3 && (Math.abs(sx - ripple.x) < 3 && Math.abs(sy - ripple.y) < 14 || Math.abs(sy - ripple.y) < 5 && Math.abs(sx - ripple.x) < 14)) highlight = Math.max(highlight, (3 - age) / 3);
        }
        const contour = Math.max(0, 1 - Math.abs(Math.sin(field * 3.141593)) * 5);
        const density = Math.max(contour * .7, highlight);
        const char = density < .08 ? (x % 3 === 0 && y % 2 === 0 ? '.' : ' ') : glyphs[Math.min(glyphs.length - 1, Math.floor(density * (glyphs.length - 1)))];
        const level = highlight > .4 ? 2 : density > .38 ? 1 : 0;
        for (let index = 0; index < 3; index++) lines[index] += index === level ? char : ' ';
      }
      ['#2f2f2f', '#626262', '#bbbbbb'].forEach((color, index) => {ctx.fillStyle = color; ctx.fillText(lines[index], 0, y * row);});
    }
  }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || paused) return;
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; time += dt;
    while (ripples.length && time - ripples[0].born > 7) ripples.shift();
    if (now - painted > 32) {draw(); painted = now;}
    raf = requestAnimationFrame(frame);
  }
  function wake() {if (!raf && visible && !paused && !document.hidden) {last = performance.now(); raf = requestAnimationFrame(frame);}}
  function visibility() {
    const rect = footer.getBoundingClientRect();
    const fixed = getComputedStyle(footer).position === 'fixed';
    visible = fixed ? document.documentElement.scrollHeight - (scrollY + innerHeight) < height + 30 : rect.top < innerHeight && rect.bottom > 0;
    if (!visible) {cancelAnimationFrame(raf); raf = 0;} else wake();
  }
  function resize() {
    width = footer.clientWidth; height = footer.clientHeight;
    const dpr = Math.min(devicePixelRatio, 1.5); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(width / cell); rows = Math.ceil(height / row); draw(); visibility();
  }
  footer.addEventListener('pointermove', event => {
    const rect = footer.getBoundingClientRect(); pointer.x = (event.clientX - rect.left) / width; pointer.y = (event.clientY - rect.top) / height; pointer.active = true;
    if (paused) draw();
  });
  footer.addEventListener('pointerleave', () => {pointer.active = false; if (paused) draw();});
  footer.addEventListener('pointerdown', event => {
    if (event.target.closest('a,button')) return;
    const rect = footer.getBoundingClientRect(); ripples.push({x: event.clientX - rect.left, y: event.clientY - rect.top, born: time - (paused ? 1 : 0)});
    if (ripples.length > 4) ripples.shift(); if (paused) draw();
  });
  const pause = footer.querySelector('.footer-pause');
  function label() {pause.textContent = paused ? t('Play motion', '播放动画') : t('Pause motion', '暂停动画'); pause.setAttribute('aria-pressed', String(paused));}
  pause.addEventListener('click', () => {paused = !paused; label(); if (paused) {cancelAnimationFrame(raf); raf = 0;} else wake();});
  reduced.addEventListener('change', event => {paused = event.matches; label(); visibility();});
  document.addEventListener('languagechange', label); document.addEventListener('visibilitychange', visibility);
  addEventListener('scroll', visibility, {passive: true}); new ResizeObserver(resize).observe(footer); label(); resize();
}
