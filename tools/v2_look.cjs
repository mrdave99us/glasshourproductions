/* Looks at staging v2 (home + catalog) the way a visitor's browser shows it, at three screen shapes.
 * One headless Chrome, own profile, own PID tree. Needs the build served on :8092 (npm run serve).
 *   node tools/v2_look.cjs
 * Writes shots/v2/<size>-home.jpg (whole page), -tabs.jpg, -catalog.jpg, -item.jpg and prints one JSON line per
 * size: console errors, broken pictures, anything wider than the screen, and what the search and chips returned. */
const { spawn } = require('child_process')
const fs = require('fs'); const os = require('os'); const path = require('path'); const http = require('http')
const BASE = process.argv[2] || 'http://localhost:8092/staging-v2/'
const OUT = path.resolve(__dirname, '..', 'shots', 'v2'); fs.mkdirSync(OUT, { recursive: true })
const PORT = 9700 + Math.floor(Math.random() * 200)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ghp-v2-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--mute-audio', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--force-color-profile=srgb',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
let killed = false
const killTree = () => { if (killed) return; killed = true; try { spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }) } catch (e) { } }
process.on('exit', killTree)
setTimeout(() => { console.error('WATCHDOG'); killTree(); process.exit(3) }, 240000).unref()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)) } catch (e) { rej(e) } }) }).on('error', rej))
const SIZES = [['desktop', 1440, 900, 1, false], ['ultrawide', 3440, 1300, 1, false], ['phone', 390, 844, 2, true]]
;(async () => {
  let ver; for (let i = 0; i < 60; i++) { try { ver = await getJSON(`http://127.0.0.1:${PORT}/json/version`); break } catch (e) { await sleep(250) } }
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0; const pending = new Map(); const errors = []
  ws.onmessage = ev => { const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result) }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || '')) }
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
  for (const [name, w, h, scale, mobile] of SIZES) {
    errors.length = 0
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const s = (m, p) => send(m, p, sessionId)
    const js = async expression => (await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value
    const shot = async (stop, whole) => {
      let clip
      if (whole) { const m = await s('Page.getLayoutMetrics'); clip = { x: 0, y: 0, width: w, height: Math.min(m.cssContentSize.height, 12000), scale: 1 } }
      const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 86, captureBeyondViewport: !!whole, ...(clip ? { clip } : {}) })
      fs.writeFileSync(path.join(OUT, `${name}-${stop}.jpg`), Buffer.from(r.data, 'base64'))
    }
    const facts = () => js(`({ wider: document.documentElement.scrollWidth > innerWidth + 1, broken: [...document.images].filter(i => i.complete && !i.naturalWidth).length, pictures: document.images.length })`)
    await s('Page.enable'); await s('Runtime.enable'); await s('Log.enable')
    await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile })
    await s('Page.navigate', { url: BASE }); await sleep(2500)
    // Walk the page so lazy pictures load, then take it whole.
    await js(`new Promise(async r => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(q => setTimeout(q, 120)) } scrollTo({ top: 0, behavior: 'instant' }); setTimeout(r, 600) })`)
    await shot('home', true)
    const home = await facts()
    // The inquiry form: an empty one is refused in plain words. A filled one is only sent in this test when the form
    // works by email (then it is written out and not sent); with a real inbox behind it, sending would put a test
    // inquiry in the back office on every run, so the test stops at what the form says it will do.
    await js(`document.getElementById('ask').requestSubmit()`)
    const refused = await js(`document.getElementById('ask-err').hidden ? 'NOT REFUSED' : document.getElementById('ask-err').textContent`)
    const way = await js(`document.getElementById('ask-note').textContent`)
    const inquiry = { empty_form: refused, way: way.startsWith('This goes straight to us') ? 'straight to the inbox' : 'by email' }
    if (inquiry.way === 'by email') {
      await js(`(() => { const f = document.getElementById('ask'), el = f.elements; el.name.value = 'Test Person'; el.email.value = 'test@example.com'; el.about.value = 'A new site for our venue.'; f.addEventListener('click', e => { if (e.target.id === 'ask-link') e.preventDefault() }, true); f.requestSubmit() })()`)
      await sleep(300)
      const mail = decodeURIComponent(await js(`(document.getElementById('ask-link') || {}).href || 'NO LINK'`))
      inquiry.to = mail.split('?')[0]; inquiry.has_all = ['Test Person', 'test@example.com', 'A new site for our venue.'].every(x => mail.includes(x))
    }
    await js(`document.getElementById('tab-custom').click(); document.getElementById('shelf').scrollIntoView(); new Promise(r => setTimeout(r, 400))`)
    await shot('tabs')
    const tab = await js(`[document.getElementById('p-catalog').hidden, document.getElementById('p-custom').hidden, document.getElementById('p-sub').hidden].join(',')`)
    await s('Page.navigate', { url: BASE + 'catalog/?c=scene' }); await sleep(2200)
    const scenes = await js(`document.querySelectorAll('#grid .item').length`)
    await js(`(() => { const q = document.getElementById('q'); q.value = 'pool'; q.dispatchEvent(new Event('input', { bubbles: true })) })()`)
    const pool = await js(`document.querySelectorAll('#grid .item').length + ' | ' + document.getElementById('count').textContent + ' | ' + location.search`)
    await js(`(() => { const q = document.getElementById('q'); q.value = 'zzzz'; q.dispatchEvent(new Event('input', { bubbles: true })) })()`)
    const none = await js(`document.querySelector('#grid .none') ? 'empty note shown' : 'NO empty note'`)
    await js(`(() => { const q = document.getElementById('q'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#chips [data-c=""]')?.click() })()`)
    await sleep(900)
    await shot('catalog')
    const cat = await facts()
    const stocked = (await js(`document.querySelectorAll('#grid .item').length`)) > 0
    await js(`document.querySelector('#grid .item')?.click(); new Promise(r => setTimeout(r, 500))`)
    const open = await js(`document.getElementById('view').open + ' | ' + (document.getElementById('view-title') || {}).textContent`)
    await shot('item')
    if (!stocked) { console.log(JSON.stringify({ name, home, inquiry, tabs_hidden: tab, catalog: cat, shelf: 'empty: ' + await js(`document.getElementById('count').textContent`), search_none: none, errors: errors.slice(0, 4) })); await send('Target.closeTarget', { targetId }); continue }
    // The 360 viewer: open a scene, wait for the full turn to load, drag across it, and prove the view turned.
    await s('Page.navigate', { url: BASE + 'catalog/?i=s-013_021' })
    let ready = ''
    for (let i = 0; i < 40 && ready !== 'ready'; i++) { await sleep(250); ready = await js(`(document.querySelector('#view .pic') || {dataset:{}}).dataset.pano || ''`) }
    await sleep(900)
    const box = await js(`(() => { const r = document.querySelector('#view .pic').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width] })()`)
    const before = (await s('Page.captureScreenshot', { format: 'jpeg', quality: 60 })).data
    const yaw0 = +(await js(`document.querySelector('#view .pic').dataset.yaw`))
    const pt = mobile ? 'touch' : 'mouse'
    await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: box[0], y: box[1], button: 'left', clickCount: 1, pointerType: pt })
    for (let i = 1; i <= 12; i++) { await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box[0] + i * box[2] * 0.03, y: box[1] - i * 2, button: 'left', buttons: 1, pointerType: pt }); await sleep(16) }
    await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box[0] + box[2] * 0.36, y: box[1] - 24, button: 'left', pointerType: pt })
    await sleep(1200)
    const yaw1 = +(await js(`document.querySelector('#view .pic').dataset.yaw`))
    await shot('pano')
    const after = (await s('Page.captureScreenshot', { format: 'jpeg', quality: 60 })).data
    const viewer = { loaded: ready, yaw_before: yaw0, yaw_after: yaw1, turned: Math.abs(yaw1 - yaw0) > 0.2, picture_changed: before !== after, tip_gone: await js(`document.querySelector('.pano-tip').classList.contains('off')`) }
    // Flat: the whole turn unrolled. The viewer goes away, the full picture is shown, and back again.
    await js(`document.querySelector('.modes [data-flat="1"]').click(); new Promise(r => setTimeout(r, 1200))`)
    viewer.flat = await js(`(() => { const p = document.querySelector('#view .pic'), i = p.querySelector('img'); return { canvases: p.querySelectorAll('canvas').length, full_picture: i.src.includes('/v2/pano/') && i.naturalWidth, pressed: document.querySelector('.modes [aria-pressed="true"]').textContent } })()`)
    await shot('flat')
    await js(`document.querySelector('.modes [data-flat="0"]').click()`)
    let back = ''
    for (let i = 0; i < 40 && back !== 'ready'; i++) { await sleep(250); back = await js(`document.querySelector('#view .pic').dataset.pano || ''`) }
    viewer.back_to_360 = back
    await js(`document.getElementById('view').close(); new Promise(r => setTimeout(r, 300))`)
    const cleaned = await js(`document.querySelectorAll('canvas.pano').length`)
    // Live preview of a template: it runs, the page picker moves it, a click inside it is followed, sizes change it.
    await s('Page.navigate', { url: BASE + 'catalog/?i=t-orbit' }); await sleep(1500)
    const link = await js(`(document.querySelector('#view a[href*="/preview/"]') || {}).href || 'NO LINK'`)
    await s('Page.navigate', { url: BASE + 'preview/?t=orbit' }); await sleep(3500)
    const inside = () => js(`(() => { const f = document.getElementById('lp-view'); try { return f.contentWindow.location.pathname.split('/').pop() + ' | ' + f.contentDocument.title } catch (e) { return 'blocked ' + e.message } })()`)
    const preview = { link: link.replace(/^https?:\/\/[^/]+/, ''), first: await inside(), pages: await js(`document.getElementById('lp-page').options.length`) }
    await shot('preview')
    await js(`(() => { const p = document.getElementById('lp-page'); p.value = 'tour.html'; p.dispatchEvent(new Event('change', { bubbles: true })) })()`); await sleep(2500)
    preview.picked = await inside() + ' | ' + await js(`location.search`)
    await js(`(() => { const d = document.getElementById('lp-view').contentDocument; const a = [...d.querySelectorAll('a[href]')].find(a => /gallery\.html/.test(a.getAttribute('href'))); if (a) a.click() })()`); await sleep(2500)
    preview.clicked_inside = await inside() + ' | picker ' + await js(`document.getElementById('lp-page').value`)
    if (!mobile) {
      await js(`document.querySelector('#lp-sizes [data-w="390"]').click()`); await sleep(900)
      preview.phone_width = await js(`Math.round(document.getElementById('lp-view').getBoundingClientRect().width) + ' | ' + location.search`)
      await shot('preview-phone')
    }
    await s('Page.navigate', { url: BASE + 'preview/?t=nothing' }); await sleep(800)
    preview.unknown = await js(`document.getElementById('lp-none').hidden ? 'NO NOTE' : 'note shown'`)
    console.log(JSON.stringify({ name, home, tabs_hidden: tab, catalog: cat, scenes, search_pool: pool, search_none: none, item: open, viewer, canvases_after_close: cleaned, preview, errors: errors.slice(0, 4) }))
    await send('Target.closeTarget', { targetId })
  }
  killTree(); process.exit(0)
})().catch(e => { console.error(e); killTree(); process.exit(2) })
