/* Headless verification for glasshourproductions.com (no dependencies: Node 22+ WebSocket + CDP).
 * ONE headless Edge on a random port with a throwaway profile. Kills ONLY its own PID tree.
 *
 *   node tools/shoot.cjs                  sweep / and /staging/ at 1440 and 390, shots to shots/
 *   node tools/shoot.cjs card             capture tools/card.html at 1200x630 -> public/og.png
 *
 * Each page prints one JSON truth line: http status, console errors, broken images,
 * horizontal overflow, request count and transfer KB. Needs `npm run serve` (port 8092)
 * for the sweep. 5 minute watchdog; never retry a hung capture.
 */
const { spawn } = require('child_process')
const fs = require('fs'); const os = require('os'); const path = require('path'); const http = require('http')

const ROOT = path.resolve(__dirname, '..')
const MODE = process.argv[2] || 'sweep'
const BASE = process.env.SITE_BASE || 'http://localhost:8092/'
const OUT = path.join(ROOT, 'shots'); fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
const PORT = 9700 + Math.floor(Math.random() * 200)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ghp-shoot-'))
const edge = spawn(EDGE, ['--headless=new', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--force-color-profile=srgb', '--use-angle=default', '--enable-unsafe-swiftshader',
  '--user-agent=' + UA, '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
let killed = false
function killTree() {
  if (killed) return; killed = true
  try { spawn('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' }) } catch (e) { }
  try { edge.kill() } catch (e) { }
}
process.on('exit', killTree)
setTimeout(() => { console.error('WATCHDOG: exceeded 5 min, killing browser'); killTree(); process.exit(3) }, 300000).unref()
const sleep = ms => new Promise(r => setTimeout(r, ms))

function getJSON(url) {
  return new Promise((res, rej) => http.get(url, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)) } catch (e) { rej(e) } }) }).on('error', rej))
}
async function waitForBrowser() {
  for (let i = 0; i < 60; i++) { try { return await getJSON(`http://127.0.0.1:${PORT}/json/version`) } catch (e) { await sleep(250) } }
  throw new Error('browser never came up')
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result) } else if (m.method) { for (const h of this.handlers) h(m) } } }
  send(method, params = {}, sessionId) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params, sessionId })) }) }
  on(fn) { this.handlers.push(fn) }
}
async function connect(url) { const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej }); return new CDP(ws) }

async function newPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  const s = (m, p) => cdp.send(m, p, sessionId)
  await s('Page.enable'); await s('Runtime.enable'); await s('Network.enable'); await s('Log.enable')
  return { s, sessionId, targetId }
}

async function capture(cdp, url, name, width, height, opts = {}) {
  const { s, sessionId, targetId } = await newPage(cdp)
  const errors = [], failed = []; let status = 0, requests = 0, bytes = 0
  cdp.on((m) => {
    if (m.sessionId !== sessionId) return
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception || {}).description)
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '))
    if (m.method === 'Network.requestWillBeSent') requests++
    if (m.method === 'Network.responseReceived' && m.params.type === 'Document' && !status) status = m.params.response.status
    if (m.method === 'Network.loadingFinished') bytes += m.params.encodedDataLength || 0
    if (m.method === 'Network.loadingFailed') failed.push(m.params.errorText)
  })
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: opts.dsf || 1, mobile: width < 600 })
  if (opts.reduced) await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  const loaded = new Promise(res => cdp.on(m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') res() }))
  await s('Page.navigate', { url })
  await Promise.race([loaded, sleep(20000)])
  await sleep(opts.settle || 1800)
  const { result } = await s('Runtime.evaluate', { returnByValue: true, expression: `(() => {
    const imgs = [...document.images]; const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).length
    const de = document.documentElement
    return { broken, imgs: imgs.length, overflowX: de.scrollWidth > de.clientWidth + 1, height: de.scrollHeight, title: document.title, canvas: !!document.querySelector('canvas') }
  })()` })
  const info = result.value
  const shotH = opts.full ? Math.min(info.height, 12000) : height
  const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: shotH, scale: 1 } })
  const file = path.join(opts.outDir || OUT, `${name}.png`)
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
  console.log(JSON.stringify({ name, url, width, status, errors: errors.length, failed: failed.length, broken: info.broken, overflowX: info.overflowX, requests, transferKB: Math.round(bytes / 1024), height: info.height, canvas: info.canvas, file: path.relative(ROOT, file) }))
  if (errors.length) console.log('   errors:', errors.slice(0, 3).join(' | ').slice(0, 400))
  if (failed.length) console.log('   failed:', failed.slice(0, 3).join(' | '))
  await cdp.send('Target.closeTarget', { targetId })
  return { errors: errors.length, failed: failed.length, broken: info.broken, overflowX: info.overflowX, status }
}

;(async () => {
  const v = await waitForBrowser()
  const cdp = await connect(v.webSocketDebuggerUrl)
  let bad = 0
  if (MODE === 'card') {
    const url = 'file:///' + path.join(ROOT, 'tools', 'card.html').replace(/\\/g, '/')
    const r = await capture(cdp, url, 'og', 1200, 630, { outDir: path.join(ROOT, 'public'), settle: 800 })
    fs.renameSync(path.join(ROOT, 'public', 'og.png'), path.join(ROOT, 'public', 'og.png'))
    bad += r.errors + r.broken
  } else {
    const pages = [['home', ''], ['staging', 'staging/']]
    for (const [name, p] of pages) {
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        const r = await capture(cdp, BASE + p, `${name}-${w}`, w, h, { full: true })
        bad += r.errors + r.failed + r.broken + (r.overflowX ? 1 : 0) + (r.status === 200 ? 0 : 1)
      }
    }
    const r = await capture(cdp, BASE + 'staging/', 'staging-1440-reduced', 1440, 900, { reduced: true })
    bad += r.errors + r.broken
  }
  console.log('SWEEP', bad ? `PROBLEMS (${bad})` : 'OK')
  killTree(); process.exit(bad ? 1 : 0)
})().catch(e => { console.error('shoot failed:', e.message); killTree(); process.exit(2) })
