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
    await js(`new Promise(async r => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(q => setTimeout(q, 120)) } scrollTo(0, 0); setTimeout(r, 500) })`)
    await shot('home', true)
    const home = await facts()
    await js(`document.getElementById('tab-custom').click(); document.getElementById('shelf').scrollIntoView(); new Promise(r => setTimeout(r, 400))`)
    await shot('tabs')
    const tab = await js(`[document.getElementById('p-catalog').hidden, document.getElementById('p-custom').hidden, document.getElementById('p-sub').hidden].join(',')`)
    await s('Page.navigate', { url: BASE + 'catalog/?c=scene' }); await sleep(2200)
    const scenes = await js(`document.querySelectorAll('#grid .item').length`)
    await js(`(() => { const q = document.getElementById('q'); q.value = 'pool'; q.dispatchEvent(new Event('input', { bubbles: true })) })()`)
    const pool = await js(`document.querySelectorAll('#grid .item').length + ' | ' + document.getElementById('count').textContent + ' | ' + location.search`)
    await js(`(() => { const q = document.getElementById('q'); q.value = 'zzzz'; q.dispatchEvent(new Event('input', { bubbles: true })) })()`)
    const none = await js(`document.querySelector('#grid .none') ? 'empty note shown' : 'NO empty note'`)
    await js(`(() => { const q = document.getElementById('q'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#chips [data-c=""]').click() })()`)
    await sleep(900)
    await shot('catalog')
    const cat = await facts()
    await js(`document.querySelector('#grid .item').click(); new Promise(r => setTimeout(r, 500))`)
    const open = await js(`document.getElementById('view').open + ' | ' + document.getElementById('view-title').textContent`)
    await shot('item')
    console.log(JSON.stringify({ name, home, tabs_hidden: tab, catalog: cat, scenes, search_pool: pool, search_none: none, item: open, errors: errors.slice(0, 4) }))
    await send('Target.closeTarget', { targetId })
  }
  killTree(); process.exit(0)
})().catch(e => { console.error(e); killTree(); process.exit(2) })
