// Live preview of a website template: the real template, running, in a frame the visitor can size like a desktop,
// a tablet or a phone, with every page one pick away. The address carries the state (?t=orbit&p=tour.html&w=390)
// so a preview can be sent to someone as it stands.
import { KIND, byId } from './shared.js'

const $ = id => document.getElementById(id)
const params = new URLSearchParams(location.search)
const it = byId(`t-${params.get('t')}`)
const view = $('lp-view'), frame = $('lp-frame'), pick = $('lp-page'), sizes = $('lp-sizes')

if (!it || !it.demo) {
  frame.hidden = true; $('lp-none').hidden = false; $('lp-name').textContent = 'Live preview'
  pick.closest('.lp-pick').hidden = true; sizes.hidden = true; $('lp-open').hidden = true; $('lp-ask').hidden = true
} else {
  const base = `/v2/demo/${it.demo.slug}/`
  const pages = it.demo.pages
  const state = { p: pages.some(p => p.file === params.get('p')) ? params.get('p') : 'index.html', w: [820, 390].includes(+params.get('w')) ? +params.get('w') : 0 }

  document.title = `${it.title}, live preview. Glass Hour`
  $('lp-name').textContent = it.title
  pick.innerHTML = pages.map(p => `<option value="${p.file}">${p.name}</option>`).join('')
  $('lp-ask').href = `mailto:glasshourproductions@gmail.com?subject=${encodeURIComponent(`${KIND.template}: ${it.title}`)}`

  function address() {
    const q = new URLSearchParams({ t: it.demo.slug }); if (state.p !== 'index.html') q.set('p', state.p); if (state.w) q.set('w', state.w)
    history.replaceState(null, '', `?${q}`)
    $('lp-open').href = base + state.p
    pick.value = state.p
  }
  function size() {
    frame.style.setProperty('--w', state.w ? `${state.w}px` : '100%')
    frame.classList.toggle('device', !!state.w)
    for (const b of sizes.querySelectorAll('button')) b.setAttribute('aria-pressed', String(+b.dataset.w === state.w))
  }
  const go = file => { state.p = file; view.src = base + file; address() }

  pick.addEventListener('change', () => go(pick.value))
  sizes.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.w = +b.dataset.w; size(); address() } })
  // The visitor clicks around inside the template: keep the page picker and the address in step with where they are.
  view.addEventListener('load', () => {
    try {
      const file = view.contentWindow.location.pathname.split('/').pop() || 'index.html'
      if (pages.some(p => p.file === file) && file !== state.p) { state.p = file; address() }
      view.title = `Live preview of ${it.title}: ${view.contentDocument.title}`
    } catch (e) { /* the template sent the visitor somewhere else; leave the picker as it was */ }
    frame.classList.add('in')
  })
  size(); go(state.p)
}
