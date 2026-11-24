// Home page: the wall of work behind the headline, the latest pieces, and the tabs on the shelf.
import { SHORT, byId, img, itemCard } from './shared.js'

// The wall: two rows drifting opposite ways. Each row is laid twice so the loop has no seam.
const ROWS = [
  ['t-orbit', 's-006_031', 's-009_022', 's-006_026', 's-013_005', 't-confetti', 's-011_016', 's-013_009', 's-011_031'],
  ['s-006_021', 's-013_001', 't-flightdeck', 's-011_026', 's-006_036', 's-013_021', 's-013_013', 's-011_021'],
]
const figure = it => `<figure><img src="${img(it.id)}" alt="" width="800" height="500"><figcaption>${SHORT[it.kind]}</figcaption></figure>`
document.getElementById('wall').innerHTML = ROWS.map(row => {
  const one = row.map(byId).filter(Boolean).map(figure).join('')
  return `<div class="track">${one}${one}</div>`
}).join('')

const FRESH = ['t-orbit', 's-013_021', 's-013_005', 't-flightdeck', 's-011_026', 's-006_036', 't-confetti', 's-011_016', 's-013_009', 's-006_021']
document.getElementById('strip').innerHTML = FRESH.map(byId).filter(Boolean).map(it => itemCard(it)).join('')

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
