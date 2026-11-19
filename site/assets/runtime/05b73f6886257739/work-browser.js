// Keep old, shared filter URLs useful after the homepage became a curated selection.
const address = new URL(location.href);
if (address.searchParams.has('skill')) {
  address.pathname = '/canvas/';
  address.searchParams.delete('skill');
  if (!address.hash.startsWith('#project=')) address.hash = '';
  location.replace(address.href);
} else if (address.searchParams.has('work') && ['', '#work-browser'].includes(address.hash)) {
  const sections = {perception:'thread-face-perception', interaction:'thread-co-creation',
    art:'design', design:'design', selected:'research', all:'home-portfolio'};
  const target = sections[address.searchParams.get('work')];
  if (target) {
    address.searchParams.delete('work');
    address.hash = target;
    history.replaceState(history.state, '', address.href);
    document.getElementById(target)?.scrollIntoView();
  }
}
