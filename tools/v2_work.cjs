/* Takes the pictures for "Built for clients": the top of each live client site, as a visitor sees it.
 * One headless Chrome, own profile, own PID tree. Writes public/v2/work/<slug>.jpg (1440x900).
 *   node tools/v2_work.cjs
 * Only sites we built and that are live belong in this list. */
const { spawn } = require('child_process')
const fs = require('fs'); const os = require('os'); const path = require('path'); const http = require('http')
const SITES = [
  ['blueraven', 'https://blueravenartists.com/'],
  ['mmd', 'https://magicalmysterydoors.com/'],
  ['gogogadjet', 'https://gogogadjet.com/'],
  ['blurryface', 'https://blurryfacelivetribute.com/'],
]
const OUT = path.resolve(__dirname, '..', 'public', 'v2', 'work'); fs.mkdirSync(OUT, { recursive: true })
const PORT = 9700 + Math.floor(Math.random() * 200)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ghp-work-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-sync', '--force-color-profile=srgb', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
let killed = false
const killTree = () => { if (killed) return; killed = true; try { spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }) } catch (e) { } }
process.on('exit', killTree)
setTimeout(() => { console.error('WATCHDOG'); killTree(); process.exit(3) }, 180000).unref()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)) } catch (e) { rej(e) } }) }).on('error', rej))
;(async () => {
  let ver; for (let i = 0; i < 60; i++) { try { ver = await getJSON(`http://127.0.0.1:${PORT}/json/version`); break } catch (e) { await sleep(250) } }
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0; const pending = new Map()
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result) } }
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
  for (const [slug, url] of SITES) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const s = (m, p) => send(m, p, sessionId)
    await s('Page.enable'); await s('Runtime.enable')
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await s('Emulation.setFocusEmulationEnabled', { enabled: true })
    await s('Page.navigate', { url })
    await sleep(9000)
    const title = (await s('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result.value
    const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 84 })
    fs.writeFileSync(path.join(OUT, `${slug}.jpg`), Buffer.from(r.data, 'base64'))
    console.log(slug, '|', title, '|', Math.round(r.data.length * 0.75 / 1024), 'KB')
    await send('Target.closeTarget', { targetId })
  }
  killTree(); process.exit(0)
})().catch(e => { console.error(e); killTree(); process.exit(2) })
