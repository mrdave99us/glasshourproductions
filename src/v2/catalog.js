// The shelf: every piece, with the kind chips and the search box working, and a closer look at any one of them.
// The address carries the state (?c=scene&q=pool&i=s-013_021), so the home page's links and search land here.
import { mountPano } from './pano.js'
import { KIND, byId, img, itemCard, items } from './shared.js'

const grid = document.getElementById('grid'), chips = document.getElementById('chips'), count = document.getElementById('count')
const q = document.getElementById('q'), view = document.getElementById('view')
const params = new URLSearchParams(location.search)
const state = { c: KIND[params.get('c')] ? params.get('c') : '', q: params.get('q') || '' }
q.value = state.q

const CHIPS = [['', 'Everything'], ['template', 'Website templates'], ['scene', '360 scenes'], ['art', 'Art'], ['graphic', 'Graphics']]
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const words = it => `${it.title} ${it.words} ${it.note || ''} ${KIND[it.kind]}`.toLowerCase()

function found() {
  const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean)
  return items.filter(it => (!state.c || it.kind === state.c) && terms.every(t => words(it).includes(t)))
}
function draw() {
  const list = found()
  chips.innerHTML = CHIPS.map(([k, label]) => `<button type="button" data-c="${k}" aria-pressed="${state.c === k}">${label}<span>${k ? items.filter(i => i.kind === k).length : items.length}</span></button>`).join('')
  for (const a of document.querySelectorAll('.menu a[data-c]')) a.toggleAttribute('aria-current', a.dataset.c === state.c)
  grid.innerHTML = list.length ? list.map(it => itemCard(it, 'button')).join('')
    : `<p class="none">Nothing on the shelf matches that yet. <a href="mailto:glasshourproductions@gmail.com?subject=${encodeURIComponent('Looking for: ' + state.q)}">Tell us what you are after</a> and we will make it.</p>`
  const what = state.c ? CHIPS.find(c => c[0] === state.c)[1].toLowerCase() : 'pieces'
  count.textContent = state.q ? `${list.length} of ${items.length} match "${state.q}".` : `${list.length} ${what} on the shelf so far. More are on the way.`
  const p = new URLSearchParams(); if (state.c) p.set('c', state.c); if (state.q) p.set('q', state.q)
  history.replaceState(null, '', p.size ? `?${p}` : location.pathname)
}

chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.c = b.dataset.c; draw() } })
for (const a of document.querySelectorAll('.menu a[data-c]')) a.addEventListener('click', e => { e.preventDefault(); state.c = a.dataset.c; draw(); scrollTo({ top: 0 }) })
q.addEventListener('input', () => { state.q = q.value.trim(); draw() })
document.getElementById('search').addEventListener('submit', e => { e.preventDefault(); q.blur() })

// A closer look. The store is not open, so the one thing to do is ask for the piece.
// A 360 scene opens as a view you can turn; everything else as its picture.
let pano = null
function show(it) {
  const ask = `mailto:glasshourproductions@gmail.com?subject=${encodeURIComponent(`${KIND[it.kind]}: ${it.title}`)}`
  view.innerHTML = `<div class="view${it.pano ? ' scene' : ''}"><div class="pic"><img src="${img(it.id)}" alt="${esc(it.title)}" width="800" height="500"></div>
    <div class="txt"><small>${KIND[it.kind]}${it.pages ? `, ${it.pages} pages` : ''}</small><h2 id="view-title">${esc(it.title)}</h2>
    ${it.note ? `<p>${esc(it.note)}</p>` : ''}${it.words && it.kind !== 'template' ? `<p>${esc(it.words)}.</p>` : ''}
    ${it.pano ? '<p>A full 360 turn, for backdrops, virtual sets and lighting. Drag the picture to look around, or see it flat.</p>' : ''}
    ${it.ai ? '<p>Made with image generation and finished in our studio.</p>' : '<p>Designed and built by hand.</p>'}
    <p>The store is not open yet. Ask and we will get it to you.</p>
    <div class="btns">${it.demo ? `<a class="btn" href="/staging-v2/preview/?t=${it.demo.slug}">Live preview</a>` : ''}<a class="btn${it.demo ? ' ghost' : ''}" href="${ask}">Ask for this piece</a></div></div>
    <form method="dialog"><button class="x" aria-label="Close">&#10005;</button></form></div>`
  view.showModal()
  if (it.pano) scene(it)
}
// A 360 scene has two ways to be seen: standing inside it, or flat, the whole turn unrolled as the file itself is.
// The choice is kept while the visitor browses.
let flat = false
function scene(it) {
  const pic = view.querySelector('.pic'), image = pic.querySelector('img'), full = `/v2/pano/${it.id}.jpg`
  pic.insertAdjacentHTML('beforeend', `<div class="modes" role="group" aria-label="How to view it"><button type="button" data-flat="0">Look around</button><button type="button" data-flat="1">Flat</button></div>`)
  const set = () => {
    if (pano) { pano.destroy(); pano = null }
    delete pic.dataset.pano
    pic.classList.toggle('flat', flat)
    image.src = flat ? full : img(it.id)
    image.alt = flat ? `${it.title}, the full 360 turn laid flat` : it.title
    for (const b of pic.querySelectorAll('.modes button')) b.setAttribute('aria-pressed', String((b.dataset.flat === '1') === flat))
    if (!flat) pano = mountPano(pic, full, { label: it.title })
  }
  pic.querySelector('.modes').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { flat = b.dataset.flat === '1'; set() } })
  set()
}
view.addEventListener('close', () => { if (pano) { pano.destroy(); pano = null } })
grid.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) show(byId(b.dataset.id)) })
view.addEventListener('click', e => { if (e.target === view) view.close() })

draw()
const first = byId(params.get('i')); if (first) show(first)
