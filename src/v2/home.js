// Home page: the wall of work behind the headline, the latest pieces, and the tabs on the shelf.
import { img, itemCard, items } from './shared.js'
import { prices, storeBar, storeOn, usd } from './store.js'

// The wall behind the headline: the sites we built for clients, two rows drifting opposite ways. Each row is laid
// several times so the loop has no seam.
const WORK = ['blueraven', 'mmd', 'gogogadjet', 'blurryface', 'threehive']
const figure = slug => `<figure><img src="/v2/work/${slug}.jpg" alt="" width="1200" height="750"><figcaption>Client site</figcaption></figure>`
document.getElementById('wall').innerHTML = [WORK, [...WORK.slice(2), ...WORK.slice(0, 2)]].map(row => {
  const one = row.map(figure).join('')
  return `<div class="track">${one}${one}${one}${one}</div>`
}).join('')

// The shelf holds only what has been hand-picked. Each kind's card shows a piece and a count when it has any; the
// latest pieces and the catalog-first wording appear once there is something to browse.
for (const card of document.querySelectorAll('.kindcard')) {
  const mine = items.filter(i => i.kind === card.dataset.kind)
  if (!mine.length) continue
  const note = card.querySelector('small'), pic = card.querySelector('.pic')
  note.textContent = `${mine.length} on the shelf`; note.classList.remove('soon')
  pic.innerHTML = `<img src="${img(mine[0].id)}" alt="" loading="lazy" width="800" height="500">`; pic.hidden = false
}
if (items.length) {
  document.getElementById('strip').innerHTML = items.slice(0, 10).map(it => itemCard(it)).join('')
  for (const el of document.querySelectorAll('[data-fresh]')) el.hidden = false
  document.getElementById('lead').textContent = 'Website templates, 360 scenes and web graphics from a working studio. Buy one, subscribe for all of it, or hire us to build yours.'
  document.getElementById('leadbtns').innerHTML = '<a class="btn" href="/staging-v2/catalog/">Browse the catalog</a><a class="btn ghost" href="#order">Hire the studio</a>'
}

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

// The inquiry form. Where the site is built with an inbox address (VITE_INBOX), the inquiry is sent there and lands
// in our back office. Where it is not, or if sending fails, the form writes the inquiry out as an email in the
// visitor's own mail program instead, so an inquiry is never lost. The note under the button says which it is.
const INBOX = (import.meta.env.VITE_INBOX || '').replace(/\/$/, '')
const ask = document.getElementById('ask'), askNote = document.getElementById('ask-note')
const byMail = 'This opens your own email with the inquiry written out, ready to send to glasshourproductions@gmail.com. Nothing is sent until you press send there.'
askNote.textContent = INBOX ? 'This goes straight to us. We write back to the email you give.' : byMail
function mailIt(v) {
  const body = [`Name: ${v.name}`, `Email: ${v.email}`, v.org && `Company, band or venue: ${v.org}`, `What I need: ${v.need}`, v.when && `When: ${v.when}`, '', v.about].filter(l => l !== false && l !== '' || l === '').join('\n')
  // Through a link, so the page itself stays put and the inquiry is not lost if the mail program is slow to open.
  const go = document.createElement('a'); go.id = 'ask-link'; document.getElementById('ask-link')?.remove(); ask.append(go)
  go.href = `mailto:glasshourproductions@gmail.com?subject=${encodeURIComponent(`Inquiry: ${v.need.toLowerCase()}, from ${v.name}`)}&body=${encodeURIComponent(body)}`
  go.click()
}
ask.addEventListener('submit', async e => {
  e.preventDefault()
  const v = Object.fromEntries([...new FormData(ask)].map(([k, x]) => [k, String(x).trim()])), err = document.getElementById('ask-err'), btn = ask.querySelector('button')
  const missing = !v.name ? 'your name' : !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.email) ? 'an email we can answer' : !v.about ? 'a few words about what you need' : ''
  err.hidden = !missing
  if (missing) { err.textContent = `It still needs ${missing}.`; return }
  if (!INBOX) return mailIt(v)
  btn.disabled = true
  try {
    const r = await fetch(`${INBOX}/inquiry`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) })
    const d = await r.json().catch(() => ({}))
    if (r.status === 400 || r.status === 429) { err.textContent = d.error || 'That did not go through.'; err.hidden = false; return }
    if (!r.ok) throw new Error('inbox')
    ask.innerHTML = `<div class="thanks" role="status"><h3>Got it. Thank you, ${v.name.split(' ')[0].replace(/[<>&"]/g, '')}.</h3><p>Your inquiry is with us. We will write back to ${v.email.replace(/[<>&"]/g, '')}.</p></div>`
  } catch (x) {
    // The inbox could not be reached: fall back to the visitor's own email so the inquiry still gets to us.
    askNote.textContent = 'We could not take that directly just now. ' + byMail
    mailIt(v)
  } finally { btn.disabled = false }
})
