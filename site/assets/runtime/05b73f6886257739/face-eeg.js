// Display time is shared with the gallery. The four illustrative traces are periodic.
export function createEeg(root) {
  const tile = root.querySelector('#eeg-trace-tile');
  const group = root.querySelector('.eeg-moving');
  const markers = root.querySelector('.eeg-events');
  const width = root.querySelector('.eeg-trace').viewBox.baseVal.width;
  const channels = [...tile.querySelectorAll('polyline')].map((line,row) => ({
    values:Float32Array.from(line.points, p => p.y - (row + .5)*36),
    halo:root.querySelector('.eeg-cap [data-lead="'+line.dataset.lead+'"] .eeg-halo')
  }));
  const events = [];
  let painted = -Infinity;
  function expire(time) {
    while (events.length && events[0].time < time - 4000) events.shift().marker.remove();
  }
  function mark(time, action, portrait) {
    expire(time);
    const marker = document.createElement('i');
    marker.dataset.enLabel=action.en;
    marker.dataset.zhLabel=action.zh;
    marker.style.setProperty('--portrait-row',portrait);
    marker.hidden = true;
    markers.append(marker);
    events.push({time,marker});
  }
  function paint(time) {
    expire(time);
    if (time - painted < 40) return;
    painted = time;
    const x = (time % 4000) * width / 4000;
    group.setAttribute('transform','translate('+(-x).toFixed(2)+' 0)');
    for (const ch of channels) ch.halo.setAttribute('r',(4 + Math.abs(ch.values[Math.floor(x)]) * .32).toFixed(2));
    for (const {time:start,marker} of events) {
      marker.hidden = false;
      marker.dataset.face = document.documentElement.lang.startsWith('zh') ? marker.dataset.zhLabel : marker.dataset.enLabel;
      marker.style.left = (100 - (time-start)/40).toFixed(2)+'%';
    }
  }
  return {paint,mark};
}
