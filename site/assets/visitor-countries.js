(async () => {
  'use strict';
  const panel = document.getElementById('visitor-origins');
  if (!panel) return;
  const status = document.getElementById('visitor-status');
  status.textContent = 'Loading visitor statistics…';
  const number = new Intl.NumberFormat('en');
  const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  const shortNames = { HK: 'Hong Kong', MO: 'Macao', ZZ: 'Unknown location' };
  function row(item) {
    const li = document.createElement('li'); li.className = 'visitor-country';
    if (item.code !== 'ZZ') {
      const flag = document.createElement('img'); flag.className = 'visitor-flag';
      flag.src = '/assets/flags/' + item.code.toLowerCase() + '.svg';
      flag.alt = ''; flag.width = 24; flag.height = 18; flag.loading = 'lazy';
      flag.addEventListener('error', () => { flag.remove(); });
      li.append(flag);
    } else {
      const globe = document.createElement('span'); globe.className = 'visitor-unknown';
      globe.textContent = '◎'; globe.setAttribute('aria-hidden', 'true'); li.append(globe);
    }
    const label = document.createElement('span'); label.className = 'visitor-country-name';
    label.textContent = shortNames[item.code] || names?.of(item.code) || item.code;
    const count = document.createElement('span'); count.className = 'visitor-country-count';
    count.textContent = number.format(item.visitors); li.append(label, count); return li;
  }
  try {
    const endpoint = new URL(panel.dataset.endpoint);
    if (endpoint.href !== 'https://robbierao-visitor-analytics.fengguirao.workers.dev/summary') throw new Error('Invalid endpoint');
    const response = await fetch(endpoint.href, { credentials: 'omit', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    if (data.periodDays !== 365 || !Number.isSafeInteger(data.totalVisitors) || data.totalVisitors < 0
        || !Array.isArray(data.countries) || data.countries.length > 300) throw new Error('Invalid summary');
    const seen = new Set();
    for (const item of data.countries) {
      if (!/^[A-Z]{2}$/.test(item.code) || seen.has(item.code) || !Number.isSafeInteger(item.visitors) || item.visitors < 1) throw new Error('Invalid location');
      seen.add(item.code);
    }
    if (data.countries.reduce((sum, item) => sum + item.visitors, 0) !== data.totalVisitors) throw new Error('Invalid total');
    document.getElementById('visitor-total').textContent = number.format(data.totalVisitors);
    document.getElementById('visitor-locations').textContent = number.format(data.countries.filter(item => item.code !== 'ZZ').length);
    const list = document.getElementById('visitor-countries');
    data.countries.slice(0, 8).forEach(item => list.append(row(item)));
    if (data.countries.length > 8) {
      document.getElementById('visitor-more').hidden = false;
      document.getElementById('visitor-more-label').textContent = 'Show ' + (data.countries.length - 8) + ' more locations';
      const more = document.getElementById('visitor-other-countries');
      data.countries.slice(8).forEach(item => more.append(row(item)));
    }
    status.textContent = data.totalVisitors ? '' : 'No visits recorded yet.';
  } catch {
    status.textContent = 'Visitor statistics are temporarily unavailable.';
  }
})();
