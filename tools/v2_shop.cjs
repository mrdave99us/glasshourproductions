/* Buys things from the store the way a customer would, in a real browser, end to end. THIS PC ONLY: it needs the
 * site built with the store on and served on :8092, and the store server in test mode on :8920.
 *   $env:VITE_STORE='http://localhost:8920'; npm run build      (then: npm run serve, and start the store)
 *   node tools/v2_shop.cjs
 * One headless Chrome, own profile, own PID tree. Writes shots/v2/shop-*.jpg and prints one JSON line of facts:
 * what the cart held, what was charged, whether each download really arrived, and what the account shows. */
const { spawn } = require('child_process')
const fs = require('fs'); const os = require('os'); const path = require('path'); const http = require('http')
const SITE = 'http://localhost:8092/staging-v2/', STORE = 'http://localhost:8920'
const OUT = path.resolve(__dirname, '..', 'shots', 'v2'); fs.mkdirSync(OUT, { recursive: true })
const PORT = 9700 + Math.floor(Math.random() * 200)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ghp-shop-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-sync', '--force-color-profile=srgb', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
let killed = false
const killTree = () => { if (killed) return; killed = true; try { spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }) } catch (e) { } }
process.on('exit', killTree)
setTimeout(() => { console.error('WATCHDOG'); killTree(); process.exit(3) }, 180000).unref()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)) } catch (e) { rej(e) } }) }).on('error', rej))
;(async () => {
  let ver; for (let i = 0; i < 60; i++) { try { ver = await getJSON(`http://127.0.0.1:${PORT}/json/version`); break } catch (e) { await sleep(250) } }
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0; const pending = new Map(); const errors = []
  ws.onmessage = ev => { const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result) }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || '')) }
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const s = (m, p) => send(m, p, sessionId)
  const js = async expression => { const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'js failed'); return r.result.value }
  const shot = async name => { const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 86 }); fs.writeFileSync(path.join(OUT, `shop-${name}.jpg`), Buffer.from(r.data, 'base64')) }
  const go = async (url, wait = 1600) => { await s('Page.navigate', { url }); await sleep(wait) }
  const waitFor = async (expr, what) => { for (let i = 0; i < 40; i++) { if (await js(expr)) return; await sleep(250) } throw new Error('never happened: ' + what) }
  await s('Page.enable'); await s('Runtime.enable'); await s('Log.enable')
  await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  const who = `shopper${Date.now()}@example.com`, facts = { who }

  // 1. Two pieces into the cart from the shelf: a scene and a template.
  await go(SITE + 'catalog/?i=s-013_021'); await waitFor(`!!document.querySelector('#view [data-cart]')`, 'add to cart button')
  facts.price_shown = await js(`document.querySelector('#view .cost b').textContent`)
  await shot('1-item')
  await js(`document.querySelector('#view [data-cart]').click()`); await sleep(600)
  await go(SITE + 'catalog/?i=t-confetti'); await waitFor(`!!document.querySelector('#view [data-cart]')`, 'add to cart button'); await js(`document.querySelector('#view [data-cart]').click()`); await sleep(500)
  await go(SITE + 'catalog/?i=t-orbit'); await sleep(900)
  facts.no_file_no_sale = await js(`document.querySelector('#view .txt').textContent.includes('Not for sale yet') && !document.querySelector('#view [data-cart]')`)

  // 2. The cart, then checkout.
  await go(SITE + 'cart/'); await waitFor(`!!document.getElementById('till')`, 'the till')
  facts.cart = await js(`({ lines: document.querySelectorAll('.cartline').length, total: document.querySelector('.till .sum b').textContent, badge: document.getElementById('cartn').textContent })`)
  await js(`document.getElementById('email').value = ${JSON.stringify(who)}`)
  await shot('2-cart')
  await js(`document.getElementById('till').requestSubmit()`)
  await waitFor(`location.href.startsWith('${STORE}/pay/test/')`, 'the payment page')
  facts.pay_page = await js(`document.querySelector('.flag').textContent + ' | ' + document.querySelector('h1').textContent + ' | card fields: ' + document.querySelectorAll('input:not([type=hidden])').length`)
  await shot('3-pay')
  await js(`document.querySelector('button[value="paid"]').click()`)
  await waitFor(`location.href.includes('/staging-v2/order/') && !!document.querySelector('.lines a[download]')`, 'the order page with downloads')
  facts.order = await js(`({ title: document.querySelector('h1').textContent, line: document.querySelector('.head p').textContent, downloads: document.querySelectorAll('.lines a[download]').length, cart_after: (JSON.parse(localStorage.getItem('gh-cart') || '[]')).length })`)
  await shot('4-order')
  // Do the downloads really arrive, and are they the full files (far bigger than the pictures on the site)?
  facts.files = await js(`Promise.all([...document.querySelectorAll('.lines a[download]')].map(async a => { const r = await fetch(a.href); const b = await r.blob(); return r.status + ' ' + (r.headers.get('content-disposition') || '').replace(/.*filename="?([^";]+).*/, '$1') + ' ' + Math.round(b.size / 1024) + ' KB' }))`)

  // 3. The account: sign in by the emailed link (shown on the page in test mode), see the order.
  await go(SITE + 'account/'); await waitFor(`!!document.getElementById('in')`, 'the sign-in form')
  await js(`document.getElementById('email').value = ${JSON.stringify(who)}; document.getElementById('in').requestSubmit()`)
  await waitFor(`!!document.getElementById('testlink')`, 'the test sign-in link')
  await go(await js(`document.getElementById('testlink').href`)); await waitFor(`!!document.getElementById('out')`, 'signed in')
  facts.account = await js(`({ email: document.querySelector('.head p').textContent.trim().split(' ')[0], bought: document.querySelectorAll('.block .lines a[download]').length, sub: document.querySelector('.block p').textContent.slice(0, 40) })`)
  await shot('5-account')

  // 4. Subscribe, then take a piece that was never bought.
  await js(`document.querySelector('a[href*="plan=subscription"]').click()`); await waitFor(`!!document.getElementById('till')`, 'the subscription till')
  facts.sub_total = await js(`document.querySelector('.till .sum b').textContent`)
  await js(`document.getElementById('till').requestSubmit()`); await waitFor(`location.href.startsWith('${STORE}/pay/test/')`, 'the payment page')
  await js(`document.querySelector('button[value="paid"]').click()`); await waitFor(`location.href.includes('/staging-v2/order/') && !!document.querySelector('h1')`, 'back on the site')
  await go(SITE + 'catalog/?i=s-011_026'); await waitFor(`!!document.querySelector('#view a[download]')`, 'a subscriber download button')
  facts.subscriber_file = await js(`fetch(document.querySelector('#view a[download]').href, { credentials: 'include' }).then(async r => r.status + ' ' + Math.round((await r.blob()).size / 1024) + ' KB')`)
  await shot('6-subscriber')
  // A stranger (no cookie) asking for the same file gets nothing.
  facts.stranger = await new Promise(res => http.get(`${STORE}/dl/library/s-011_026`, r => { res(r.statusCode); r.resume() }))

  // 5. The owner's page.
  await go(STORE + '/admin', 1200)
  facts.admin = await js(`document.querySelector('p.s').textContent`)
  await shot('7-admin')
  console.log(JSON.stringify({ ...facts, errors: errors.slice(0, 5) }, null, 1))
  killTree(); process.exit(0)
})().catch(e => { console.error('FAILED:', e.message); killTree(); process.exit(2) })
