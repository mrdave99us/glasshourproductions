// The three shop pages: the cart (and checkout), the order page a buyer lands on after paying, and the account.
// Which one this is comes from <body data-page>. Payment itself happens on the payment provider's own page.
import { KIND, byId, img } from './shared.js'
import { STORE, api, cart, esc, prices, shut, storeBar, storeOn, usd } from './store.js'

const main = document.getElementById('main'), q = new URLSearchParams(location.search)
const fail = e => { main.insertAdjacentHTML('afterbegin', `<p class="oops" role="alert">${esc(e.message)}</p>`) }
const line = (it, right) => `<li class="cartline"><span class="pic"><img src="${img(it.id)}" alt="" width="800" height="500"></span><span class="what"><strong>${esc(it.title)}</strong><small>${KIND[it.kind] || ''}</small></span>${right}</li>`

async function cartPage() {
  const plan = q.get('plan') === 'subscription', p = await prices()
  function draw() {
    const ids = cart.ids().filter(id => byId(id) && p.items[id]?.available)
    const total = plan ? p.subscription_cents : ids.reduce((n, id) => n + p.items[id].cents, 0)
    if (!plan && !ids.length) {
      main.innerHTML = `<div class="head"><h1>Your cart</h1><p>Nothing in it yet.</p><p><a class="btn" href="/staging-v2/catalog/">Browse the shelf</a></p></div>`; return
    }
    const list = plan
      ? `<li class="cartline"><span class="what"><strong>Subscription</strong><small>Everything on the shelf, including what we add next. Renews each month until you cancel.</small></span><b>${usd(total)} a month</b></li>`
      : ids.map(id => line(byId(id), `<b>${usd(p.items[id].cents)}</b><button type="button" class="rm" data-rm="${id}" aria-label="Remove ${esc(byId(id).title)}">Remove</button>`)).join('')
    main.innerHTML = `<div class="head"><h1>${plan ? 'Subscribe' : 'Your cart'}</h1></div>
      <div class="pay"><ul class="lines">${list}</ul>
      <form class="till" id="till"><div class="sum"><span>Total${plan ? ' today' : ''}</span><b>${usd(total)}</b></div>
        <label for="email">Your email</label><input id="email" type="email" required autocomplete="email" placeholder="you@example.com" value="${esc(localStorage.getItem('gh-email') || '')}">
        <small>Your receipt and your downloads go here.</small>
        <button class="btn" id="go">Check out</button><p class="oops" id="err" role="alert" hidden></p>
        <small>You pay on the next page. We never see your card.</small></form></div>`
    for (const b of main.querySelectorAll('[data-rm]')) b.addEventListener('click', () => { cart.remove(b.dataset.rm); draw() })
    document.getElementById('till').addEventListener('submit', async e => {
      e.preventDefault()
      const email = document.getElementById('email').value.trim(), go = document.getElementById('go'), err = document.getElementById('err')
      go.disabled = true; err.hidden = true
      try {
        localStorage.setItem('gh-email', email)
        const r = await api('/api/checkout', plan ? { email, plan: 'subscription' } : { email, items: ids })
        location.href = STORE + r.pay_url
      } catch (x) { err.textContent = x.message; err.hidden = false; go.disabled = false }
    })
  }
  draw()
}

async function orderPage() {
  const o = await api(`/api/order?o=${encodeURIComponent(q.get('o') || '')}`)
  if (o.status === 'paid') {
    if (o.kind === 'items') cart.clear()
    const body = o.kind === 'subscription'
      ? `<p>Your subscription is on. Sign in with your email and download anything on the shelf.</p><p><a class="btn" href="/staging-v2/account/">Go to your account</a></p>`
      : `<ul class="lines">${o.items.map(it => line(byId(it.id) || { id: it.id, title: it.title, kind: it.kind }, `<a class="btn" href="${STORE}${it.download}" download>Download</a>`)).join('')}</ul>
         <p class="quiet">Keep this page's address: it is your way back to these downloads. A copy is in your email.</p>`
    main.innerHTML = `<div class="head"><h1>Thank you.</h1><p>Order ${esc(o.number)}, ${usd(o.total_cents)}${o.mode === 'test' ? ' (a test order, no money was taken)' : ''}.</p></div>${body}`
  } else if (o.status === 'failed') {
    main.innerHTML = `<div class="head"><h1>That payment did not go through.</h1><p>Nothing was charged for order ${esc(o.number)}.</p><p><a class="btn" href="/staging-v2/cart/">Back to your cart</a></p></div>`
  } else {
    main.innerHTML = `<div class="head"><h1>Order ${esc(o.number)}</h1><p>${o.status === 'refunded' ? 'This order was refunded.' : 'This order has not been paid yet.'}</p><p><a class="btn" href="/staging-v2/catalog/">Back to the shelf</a></p></div>`
  }
}

async function accountPage() {
  if (q.get('k')) { try { await api('/api/session', { k: q.get('k') }) } catch (e) { fail(e) } history.replaceState(null, '', location.pathname) }
  const m = await api('/api/me')
  if (!m.signed_in) {
    main.innerHTML += `<div class="head"><h1>Your account</h1><p>Enter the email you bought with and we will send a link that signs you in. No password.</p></div>
      <form class="till narrow" id="in"><label for="email">Your email</label><input id="email" type="email" required autocomplete="email" placeholder="you@example.com" value="${esc(localStorage.getItem('gh-email') || '')}">
      <button class="btn">Send me a link</button><p id="sent" class="quiet" role="status" hidden></p></form>`
    document.getElementById('in').addEventListener('submit', async e => {
      e.preventDefault(); const sent = document.getElementById('sent')
      try {
        const r = await api('/api/signin', { email: document.getElementById('email').value.trim() })
        sent.innerHTML = `If that address has bought from us, a sign-in link is on its way.${r.test_link ? ` <a class="link" id="testlink" href="${esc(r.test_link)}">Test store: open the link here.</a>` : ''}`
      } catch (x) { sent.textContent = x.message }
      sent.hidden = false
    })
    return
  }
  const sub = m.subscription
  main.innerHTML += `<div class="head"><h1>Your account</h1><p>${esc(m.email)} <button type="button" class="rm" id="out">Sign out</button></p></div>
    <section class="block"><h2>Subscription</h2>${sub
      ? `<p>${sub.status === 'cancelled' ? `Cancelled. It keeps working through ${esc(sub.paid_through)}.` : `Running, ${usd(sub.price_cents)} a month. Paid through ${esc(sub.paid_through)}.`} Open any piece on <a class="link" href="/staging-v2/catalog/">the shelf</a> and download it.</p>${sub.status === 'active' ? '<p><button type="button" class="btn ghost" id="stop">Cancel the subscription</button></p>' : ''}`
      : `<p>None. <a class="link" href="/staging-v2/cart/?plan=subscription">Subscribe</a> and take everything on the shelf.</p>`}</section>
    <section class="block"><h2>What you bought</h2>${m.orders.filter(o => o.kind === 'items').map(o => `<p class="quiet">Order ${esc(o.number)}, ${usd(o.total_cents)}</p><ul class="lines">${o.items.map(it => line(byId(it.id) || it, `<a class="btn" href="${STORE}${it.download}" download>Download</a>`)).join('')}</ul>`).join('') || '<p>Nothing yet.</p>'}</section>`
  document.getElementById('out').addEventListener('click', async () => { await api('/api/signout', {}); location.reload() })
  document.getElementById('stop')?.addEventListener('click', async () => { if (confirm('Cancel the subscription? It keeps working until the day it is paid through.')) { await api('/api/subscription/cancel', {}); location.reload() } })
}

storeBar()
if (!storeOn) shut(main)
else ({ cart: cartPage, order: orderPage, account: accountPage })[document.body.dataset.page]().catch(fail)
