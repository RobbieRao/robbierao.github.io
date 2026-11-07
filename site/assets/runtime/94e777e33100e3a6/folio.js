// A small reading aid; the content itself is always present in the document.
const sections = ['about', 'news', 'research', 'design'].map(id => document.getElementById(id)).filter(Boolean);
const links = [...document.querySelectorAll('.folio-header [data-section]')];
let pending = false;
function updateSection() {
  pending = false;
  const visible = sections.filter(section => !section.hidden);
  const current = [...visible].reverse().find(section => section.getBoundingClientRect().top <= 150) || visible[0];
  links.forEach(link => {
    const section = current?.id;
    if (link.dataset.section === section) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
addEventListener('scroll', () => {
  if (!pending) { pending = true; requestAnimationFrame(updateSection); }
}, {passive: true});
document.addEventListener('languagechange', updateSection);
document.addEventListener('workfilterchange', updateSection);
addEventListener('hashchange', updateSection);
updateSection();
