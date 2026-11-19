// Old deep links also reach their archived source material.
function revealRecord() {
  if (!location.hash) return;
  let target;
  try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
  const record = target?.closest('details.original-record,details.technical-record');
  if (target?.matches('details.technical-record') && !target.open) target.open = true;
  if (record && !record.open) {
    record.open = true;
    requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
  }
}
addEventListener('hashchange', revealRecord);
revealRecord();
