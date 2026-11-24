// The shelf: every piece, with the kind chips and the search box working, and a closer look at any one of them.
// The address carries the state (?c=graphic&g=texture&q=wood&i=g-012_004), so the home page's links and search land here.
import { GROUP, GROUP_NOTE, KIND, byId, img, itemCard, items } from './shared.js'
import { STORE, cart, me, prices, storeBar, storeOn, usd } from './store.js'

// With the store on: what things cost, and who is looking (a subscriber downloads instead of buying).
let shop = null, who = null
const priceTag = it => (shop?.items[it.id]?.available ? usd(shop.items[it.id].cents) : '')

const grid = document.getElementById('grid'), chips = document.getElementById('chips'), count = document.getElementById('count')
const q = document.getElementById('q'), view = document.getElementById('view'), groups = document.getElementById('groups')
const params = new URLSearchParams(location.search)
const own = (table, k) => (k && Object.hasOwn(table, k) ? k : '')
const state = { c: own(KIND, params.get('c')), g: own(GROUP, params.get('g')), q: params.get('q') || '', i: '' }
if (state.g) state.c = 'graphic'
q.value = state.q

const CHIPS = [['', 'Everything'], ['template', 'Website templates'], ['graphic', 'Web graphics']]
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const words = it => `${it.title} ${it.words} ${it.note || ''} ${KIND[it.kind]} ${it.group ? GROUP[it.group] : ''}`.toLowerCase()

function found() {
  const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean)
  const hit = items.filter(it => (!state.c || it.kind === state.c) && (!state.g || it.group === state.g) && terms.every(t => words(it).includes(t)))
  // Within web graphics the newest batches lead: they are the ones made with websites in mind.
  return state.c === 'graphic' ? hit.sort((a, b) => (a.id < b.id ? 1 : -1)) : hit
}
function draw() {
  // Nothing has been picked for the shelf yet: say so, and point at what there is.
  if (!items.length) {
    chips.hidden = groups.hidden = true
    count.textContent = 'Nothing is on the shelf yet. We are hand-picking what goes up.'
    grid.innerHTML = `<p class="none"><a class="btn" href="/staging-v2/#work">See the sites we built</a> <a class="btn ghost" href="/staging-v2/#contact">Start a project</a></p>`
    return
  }
  const list = found()
  chips.innerHTML = CHIPS.map(([k, label]) => `<button type="button" data-c="${k}" aria-pressed="${state.c === k}">${label}<span>${k ? items.filter(i => i.kind === k).length : items.length}</span></button>`).join('')
  for (const a of document.querySelectorAll('.menu a[data-c]')) a.toggleAttribute('aria-current', a.dataset.c === state.c)
  // Graphics have categories of their own: a second row of chips, and with none picked, each category under its name.
  const inGraphics = state.c === 'graphic'
  groups.hidden = !inGraphics
  if (inGraphics) groups.innerHTML = [['', 'All web graphics'], ...Object.entries(GROUP)].map(([k, label]) => `<button type="button" data-g="${k}" aria-pressed="${state.g === k}">${label}<span>${items.filter(i => i.kind === 'graphic' && (!k || i.group === k)).length}</span></button>`).join('')
  const cards = l => l.map(it => itemCard(it, 'button', priceTag(it))).join('')
  const grouped = inGraphics && !state.g && !state.q
  grid.classList.toggle('bygroup', grouped)
  grid.innerHTML = grouped ? Object.entries(GROUP).map(([k, label]) => { const l = list.filter(i => i.group === k).sort((a, b) => (a.id < b.id ? 1 : -1)); return l.length ? `<section class="group"><div class="grouphead"><h2>${label}</h2><p>${GROUP_NOTE[k]} ${l.length} on the shelf.</p></div><div class="shelfgrid">${cards(l)}</div></section>` : '' }).join('')
    : list.length ? cards(list)
    : `<p class="none">Nothing on the shelf matches that yet. <a href="mailto:glasshourproductions@gmail.com?subject=${encodeURIComponent('Looking for: ' + state.q)}">Tell us what you are after</a> and we will make it.</p>`
  const what = state.g ? GROUP[state.g].toLowerCase() : state.c === 'graphic' ? 'web graphics' : state.c ? CHIPS.find(c => c[0] === state.c)[1].toLowerCase() : 'pieces'
  count.textContent = state.q ? `${list.length} of ${items.length} match "${state.q}".` : `${list.length} ${what} on the shelf so far. More are on the way.`
  address()
}
// The address carries what is on screen (?c= ?g= ?q= ?i=), so it can be copied and sent.
function address() {
  const p = new URLSearchParams(); for (const k of ['c', 'g', 'q', 'i']) if (state[k]) p.set(k, state[k])
  const s = p.toString()
  history.replaceState(null, '', s ? `?${s}` : location.pathname)
}

chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.c = b.dataset.c; state.g = ''; draw() } })
groups.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.g = b.dataset.g; draw() } })
for (const a of document.querySelectorAll('.menu a[data-c]')) a.addEventListener('click', e => { e.preventDefault(); state.c = a.dataset.c; state.g = ''; draw(); scrollTo({ top: 0 }) })
q.addEventListener('input', () => { state.q = q.value.trim(); draw() })
document.getElementById('search').addEventListener('submit', e => { e.preventDefault(); q.blur() })

// A closer look. The store is not open, so the one thing to do is ask for the piece.
function show(it) {
  const ask = `mailto:glasshourproductions@gmail.com?subject=${encodeURIComponent(`${KIND[it.kind]}: ${it.title}`)}`
  view.innerHTML = `<div class="view"><div class="pic"><img src="${img(it.id)}" alt="${esc(it.title)}" width="800" height="500"></div>
    <div class="txt"><small>${KIND[it.kind]}${it.group ? `, ${GROUP[it.group].toLowerCase()}` : ''}${it.pages ? `, ${it.pages} pages` : ''}</small><h2 id="view-title">${esc(it.title)}</h2>
    ${it.note ? `<p>${esc(it.note)}</p>` : ''}${it.words && it.kind !== 'template' ? `<p>${esc(it.words)}.</p>` : ''}
    ${it.ai ? '<p>Made with image generation and finished in our studio.</p>' : '<p>Designed and built by hand.</p>'}
    ${actions(it, ask)}</div>
    <form method="dialog"><button class="x" aria-label="Close">&#10005;</button></form></div>`
  if (!view.open) view.showModal()
  state.i = it.id; address()
}
// What can be done with a piece. Store off: ask for it. Store on: add it to the cart, or download it if the
// visitor subscribes. A piece with no file to hand over yet is not for sale.
function actions(it, ask) {
  const preview = it.demo ? `<a class="btn ghost" href="/staging-v2/preview/?t=${it.demo.slug}">Live preview</a>` : ''
  if (!shop) return `<p>The store is not open yet. Ask and we will get it to you.</p><div class="btns">${it.demo ? `<a class="btn" href="/staging-v2/preview/?t=${it.demo.slug}">Live preview</a>` : ''}<a class="btn${it.demo ? ' ghost' : ''}" href="${ask}">Ask for this piece</a></div>`
  const p = shop.items[it.id]
  if (who?.subscription) return `<p>Included in your subscription.</p><div class="btns"><a class="btn" href="${STORE}/dl/library/${it.id}" download>Download</a>${preview}</div>`
  if (!p?.available) return `<p>Not for sale yet. Ask and we will tell you when it is.</p><div class="btns">${preview}<a class="btn ghost" href="${ask}">Ask about this piece</a></div>`
  const inCart = cart.has(it.id)
  return `<p class="cost"><b>${usd(p.cents)}</b> or free with <a class="link" href="/staging-v2/cart/?plan=subscription">the subscription</a>.</p>
    <div class="btns"><button type="button" class="btn${inCart ? ' ghost' : ''}" data-cart="${it.id}">${inCart ? 'In your cart. Remove' : 'Add to cart'}</button>${inCart ? '<a class="btn" href="/staging-v2/cart/">Go to cart</a>' : ''}${preview}</div>`
}
view.addEventListener('click', e => {
  const b = e.target.closest('[data-cart]'); if (!b) return
  const id = b.dataset.cart
  if (cart.has(id)) cart.remove(id); else cart.add(id)
  show(byId(id))
  view.querySelector(`[data-cart="${id}"]`)?.focus()   // the redraw replaced the button; keep the keyboard on it
})

view.addEventListener('close', () => { state.i = ''; address() })
grid.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) show(byId(b.dataset.id)) })
view.addEventListener('click', e => { if (e.target === view) view.close() })

storeBar()
draw()
const first = byId(params.get('i')); if (first) show(first)
// Prices arrive a moment after the page: draw once without them, then again with.
if (storeOn) Promise.all([prices(), me()]).then(([p, m]) => { shop = p; who = m; draw(); if (view.open && state.i) show(byId(state.i)) }).catch(() => { })
