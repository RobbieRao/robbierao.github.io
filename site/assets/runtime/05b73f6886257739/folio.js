// A small reading aid; the content itself is always present in the document.
const sections = ['about', 'news', 'research', 'design', 'home-portfolio'].map(id => document.getElementById(id)).filter(Boolean);
const links = [...document.querySelectorAll('.folio-header [data-section]')];
let pending = false;
function updateSection() {
  pending = false;
  const visible = sections.filter(section => !section.hidden);
  const active = [...visible].reverse().find(section => section.getBoundingClientRect().top <= 150);
  const section = active?.getBoundingClientRect().bottom > 150 ? active.id : null;
  links.forEach(link => {
    if (link.dataset.section === section) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
addEventListener('scroll', () => {
  if (!pending) { pending = true; requestAnimationFrame(updateSection); }
}, {passive: true});
document.addEventListener('languagechange', updateSection);
addEventListener('hashchange', updateSection);
updateSection();

const record = document.querySelector('.profile-record');
if (record) {
  const about = document.querySelector('.opening-editorial .about-copy');
  const groups = [...record.querySelectorAll('.record-group')];
  const rows = groups.map(group => [...group.querySelectorAll('li')]);
  const toggle = record.querySelector('.profile-record-toggle');

  function fitRecord() {
    record.dataset.ready = '';
    toggle.hidden = false;
    groups.forEach(group => { group.hidden = false; });
    rows.flat().forEach(row => { row.hidden = false; });
    if (toggle.getAttribute('aria-expanded') === 'true') return;

    const aboutBox = about.getBoundingClientRect();
    const recordBox = record.getBoundingClientRect();
    // On narrow screens the two sections stack and have independent heights.
    let counts = [3, 2];
    if (recordBox.left > aboutBox.left + 1) {
      const bodyBottom = record.querySelector('#profile-record-body').getBoundingClientRect().bottom;
      if (bodyBottom <= aboutBox.bottom) {
        toggle.hidden = true;
        return;
      }
      const heights = rows.map(list => list.map(row => row.getBoundingClientRect().height));
      const rowsHeight = heights.flat().reduce((sum, height) => sum + height, 0);
      // Reserve the headings and the bottom control before selecting whole rows.
      const fixedHeight = toggle.getBoundingClientRect().bottom - recordBox.top - rowsHeight;
      let room = aboutBox.height - fixedHeight;
      counts = groups.map(() => 0);
      // Alternate groups so that both roles and awards appear in the preview.
      for (let index = 0; index < Math.max(...rows.map(list => list.length)); index++) {
        heights.forEach((list, group) => {
          if (counts[group] === index && list[index] <= room) {
            room -= list[index];
            counts[group]++;
          }
        });
      }
    }
    rows.forEach((list, group) => {
      groups[group].hidden = counts[group] === 0;
      list.forEach((row, index) => { row.hidden = index >= counts[group]; });
    });
    toggle.hidden = rows.every((list, group) => counts[group] >= list.length);
  }

  function revealLinkedGroup() {
    if (['#experience', '#honors', '#experience-title', '#honors-title'].includes(location.hash)) {
      toggle.setAttribute('aria-expanded', 'true');
    }
    fitRecord();
  }
  toggle.addEventListener('click', () => {
    const expanding = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanding));
    fitRecord();
    if (!expanding && toggle.getBoundingClientRect().top < 0) {
      toggle.scrollIntoView({block:'center', behavior:'instant'});
    }
  });
  new ResizeObserver(fitRecord).observe(about);
  document.addEventListener('languagechange', fitRecord);
  addEventListener('hashchange', revealLinkedGroup);
  revealLinkedGroup();
}
