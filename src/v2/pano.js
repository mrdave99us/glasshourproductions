// A 360 viewer for the scenes on the shelf: stand in the middle of the picture and look around.
// No libraries. One canvas, one shader that turns each screen pixel into a direction and reads the full-turn picture
// there. Drag (mouse, finger or pen) to look, wheel or pinch to zoom, arrow keys and + / - from the keyboard.
// It turns slowly by itself until the visitor takes hold.
//
//   const view = mountPano(box, '/v2/pano/s-013_021.jpg', { label: 'Aquarium tunnel' })
//   view.destroy()
//
// `box` already holds the flat picture; the viewer fades in over it once the full turn has loaded, so there is
// never an empty frame, and if WebGL or the picture is not there the flat picture simply stays.

const VS = `attribute vec2 a; varying vec2 v; void main(){ v = a; gl_Position = vec4(a, 0., 1.); }`
const FS = `precision highp float;
varying vec2 v; uniform sampler2D t; uniform vec3 cam; uniform float asp;
void main(){
  vec3 d = normalize(vec3(v.x*asp*cam.z, v.y*cam.z, -1.));
  float cp = cos(cam.y), sp = sin(cam.y), cy = cos(cam.x), sy = sin(cam.x);
  d = vec3(d.x, d.y*cp - d.z*sp, d.y*sp + d.z*cp);
  d = vec3(d.x*cy + d.z*sy, d.y, -d.x*sy + d.z*cy);
  vec2 uv = vec2(atan(d.x, -d.z)/6.28318530718 + .5, .5 - asin(clamp(d.y, -1., 1.))/3.14159265359);
  gl_FragColor = texture2D(t, uv);
}`
const RAD = Math.PI / 180
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export function mountPano(box, src, { label = '360 scene' } = {}) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const canvas = document.createElement('canvas')
  canvas.className = 'pano'; canvas.tabIndex = 0
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${label}. A 360 view: drag, or use the arrow keys, to look around.`)
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false }) || canvas.getContext('webgl', { antialias: false, alpha: false })
  let dead = false, raf = 0
  const done = { destroy() { dead = true; cancelAnimationFrame(raf); obs && obs.disconnect(); canvas.remove(); tip.remove(); full.remove(); document.removeEventListener('fullscreenchange', size) } }
  const tip = document.createElement('span'); tip.className = 'pano-tip'; tip.textContent = 'Drag to look around'
  const full = document.createElement('button'); full.type = 'button'; full.className = 'pano-full'; full.setAttribute('aria-label', 'Full screen'); full.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  let obs = null
  if (!gl) return done

  const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); return s }
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return done
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const uCam = gl.getUniformLocation(prog, 'cam'), uAsp = gl.getUniformLocation(prog, 'asp')

  // Where the eye points. Yaw grows to the left, pitch grows upward, fov is the height of the view in degrees.
  const eye = { yaw: 0, pitch: 0, fov: 78, vy: 0, vp: 0, held: false, touched: false }
  function size() {
    const r = box.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr))
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  let last = performance.now()
  function frame(now) {
    if (dead) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    if (!eye.held) {
      // Let go: it coasts to a stop. Never touched: it turns slowly, to show there is more than the frame holds.
      eye.yaw += eye.vy * dt; eye.pitch += eye.vp * dt
      const drag = Math.exp(-dt * 4); eye.vy *= drag; eye.vp *= drag
      if (!eye.touched && !still) eye.yaw -= dt * 0.06
    }
    eye.pitch = clamp(eye.pitch, -85 * RAD, 85 * RAD)
    gl.uniform3f(uCam, eye.yaw, eye.pitch, Math.tan(eye.fov * RAD / 2)); gl.uniform1f(uAsp, canvas.width / canvas.height)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    box.dataset.yaw = eye.yaw.toFixed(3)
  }

  // Hands. One pointer looks; two pinch.
  const down = new Map(); let pinch = 0
  const perPx = () => 2 * Math.tan(eye.fov * RAD / 2) / box.getBoundingClientRect().height
  const take = () => { if (!eye.touched) { eye.touched = true; tip.classList.add('off') } }
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); down.set(e.pointerId, [e.clientX, e.clientY, performance.now()]); eye.held = true; eye.vy = eye.vp = 0; take()
    if (down.size === 2) { const [a, b] = [...down.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]) }
  })
  canvas.addEventListener('pointermove', e => {
    const p = down.get(e.pointerId); if (!p) return
    const now = performance.now(), dx = e.clientX - p[0], dy = e.clientY - p[1], dt = Math.max(0.004, (now - p[2]) / 1000)
    down.set(e.pointerId, [e.clientX, e.clientY, now])
    if (down.size === 1) {
      const k = perPx(); eye.yaw += dx * k; eye.pitch += dy * k
      eye.vy = eye.vy * 0.6 + (dx * k / dt) * 0.4; eye.vp = eye.vp * 0.6 + (dy * k / dt) * 0.4
    } else if (down.size === 2) {
      const [a, b] = [...down.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (pinch) eye.fov = clamp(eye.fov * pinch / d, 35, 100)
      pinch = d
    }
  })
  const up = e => { down.delete(e.pointerId); if (!down.size) eye.held = false; pinch = 0 }
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)
  canvas.addEventListener('wheel', e => { e.preventDefault(); take(); eye.fov = clamp(eye.fov + Math.sign(e.deltaY) * 4, 35, 100) }, { passive: false })
  canvas.addEventListener('keydown', e => {
    const step = 8 * RAD
    if (e.key === 'ArrowLeft') eye.yaw += step; else if (e.key === 'ArrowRight') eye.yaw -= step
    else if (e.key === 'ArrowUp') eye.pitch += step; else if (e.key === 'ArrowDown') eye.pitch -= step
    else if (e.key === '+' || e.key === '=') eye.fov = clamp(eye.fov - 6, 35, 100); else if (e.key === '-') eye.fov = clamp(eye.fov + 6, 35, 100)
    else return
    e.preventDefault(); take()
  })
  full.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (box.requestFullscreen) box.requestFullscreen().catch(() => { }) })
  document.addEventListener('fullscreenchange', size)

  // The full turn. The flat picture stays up until this is in.
  const pic = new Image()
  pic.decoding = 'async'
  pic.onload = () => {
    if (dead) return
    if (Math.max(pic.naturalWidth, pic.naturalHeight) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) return
    const two = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pic)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, two ? gl.REPEAT : gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    box.append(canvas, tip, full)
    size(); obs = new ResizeObserver(size); obs.observe(box)
    last = performance.now(); raf = requestAnimationFrame(frame)
    requestAnimationFrame(() => { canvas.classList.add('on'); box.dataset.pano = 'ready' })
  }
  pic.src = src
  return done
}
