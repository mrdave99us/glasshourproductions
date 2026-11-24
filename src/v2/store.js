// The shop side of the site: talking to the store server, the cart, and the bits of the header that go with them.
//
// The store's address is given when the site is built (VITE_STORE). The public build is made without it, so until
// the store is opened the public site shows no prices and no cart, only "ask for this piece".
export const STORE = (import.meta.env.VITE_STORE || '').replace(/\/$/, '')
export const storeOn = !!STORE
export const usd = c => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** Asks the store. Throws the store's own plain message when it says no. */
export async function api(path, body) {
  let r
  try { r = await fetch(STORE + path, { method: body ? 'POST' : 'GET', credentials: 'include', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }) }
  catch (e) { throw new Error('The store is not answering right now. Try again in a minute.') }
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || 'The store said no.')
  return data
}
let cfg
/** Prices and what can be bought, from the store. Asked once per page. */
export const prices = () => (cfg ??= api('/api/config'))
let who
export const me = () => (who ??= api('/api/me').catch(() => ({ signed_in: false })))

const KEY = 'gh-cart'
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [] } catch (e) { return [] } }
const write = ids => { localStorage.setItem(KEY, JSON.stringify(ids)); dispatchEvent(new CustomEvent('gh-cart')) }
export const cart = {
  ids: read,
  has: id => read().includes(id),
  add: id => { const c = read(); if (!c.includes(id)) write([...c, id]) },
  remove: id => write(read().filter(x => x !== id)),
  clear: () => write([]),
}

/** Cart and account links in the top bar, and a strip that says so when the store is only a test. */
export function storeBar() {
  if (!storeOn) return
  const side = document.querySelector('.bar .side'); if (!side) return
  side.insertAdjacentHTML('afterbegin', `<a href="/staging-v2/account/">Account</a><a class="cartlink" href="/staging-v2/cart/">Cart <b id="cartn"></b></a>`)
  const n = document.getElementById('cartn'), draw = () => { const c = cart.ids().length; n.textContent = c ? String(c) : ''; n.hidden = !c }
  draw(); addEventListener('gh-cart', draw); addEventListener('storage', draw)
  prices().then(p => { if (p.mode === 'test') document.body.insertAdjacentHTML('afterbegin', '<div class="teststrip">Test store. No real money is taken.</div>') }).catch(() => { })
}

/** For the three shop pages when the site was built without a store. */
export function shut(main) {
  main.innerHTML = `<div class="head"><h1>Not open yet</h1><p>The store opens soon. Until then, <a class="link" href="mailto:glasshourproductions@gmail.com">write to us</a> and we will get you what you need.</p><p><a class="btn" href="/staging-v2/catalog/">Back to the shelf</a></p></div>`
}
