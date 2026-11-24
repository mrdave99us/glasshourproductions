// Home page: the wall of work behind the headline, the latest pieces, and the tabs on the shelf.
import { SHORT, byId, img, itemCard, items } from './shared.js'
import { prices, storeBar, storeOn, usd } from './store.js'

// The wall: two rows drifting opposite ways. Each row is laid twice so the loop has no seam.
const ROWS = [
  ['t-orbit', 's-009_022', 's-007_021', 's-006_026', 's-008_037', 't-confetti', 's-011_016', 's-012_012', 's-011_031'],
  ['s-006_021', 's-007_023', 't-flightdeck', 's-011_026', 's-006_036', 's-013_021', 's-008_033', 's-011_021', 's-007_020'],
]
const figure = it => `<figure><img src="${img(it.id)}" alt="" width="800" height="500"><figcaption>${SHORT[it.kind]}</figcaption></figure>`
document.getElementById('wall').innerHTML = ROWS.map(row => {
  const one = row.map(byId).filter(Boolean).map(figure).join('')
  return `<div class="track">${one}${one}</div>`
}).join('')

const FRESH = ['t-orbit', 's-013_021', 's-007_021', 't-flightdeck', 's-008_037', 's-011_026', 't-confetti', 's-012_012', 's-006_036', 's-006_021']
document.getElementById('strip').innerHTML = FRESH.map(byId).filter(Boolean).map(it => itemCard(it)).join('')

// The web graphics card counts what is really on the shelf.
for (const el of document.querySelectorAll('[data-count]')) el.textContent = `${items.filter(i => i.kind === el.dataset.count).length} and counting`

storeBar()
if (storeOn) prices().then(p => {
  const low = Math.min(...Object.values(p.items).filter(i => i.available).map(i => i.cents))
  document.getElementById('buy-note').textContent = `Single pieces from ${usd(low)}. The subscription is ${usd(p.subscription_cents)} a month and can be cancelled any time.`
  for (const a of document.querySelectorAll('[data-sub]')) { a.href = '/staging-v2/cart/?plan=subscription'; a.textContent = `Subscribe, ${usd(p.subscription_cents)} a month` }
}).catch(() => { })

// Tabs on the shelf: click, or arrow keys.
const tabs = [...document.querySelectorAll('[role="tab"]')]
function pick(tab, focus) {
  for (const t of tabs) {
    const on = t === tab
    t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on
  }
  if (focus) tab.focus()
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => pick(t))
  t.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') pick(tabs[(i + 1) % tabs.length], true)
    else if (e.key === 'ArrowLeft') pick(tabs[(i + tabs.length - 1) % tabs.length], true)
  })
})
