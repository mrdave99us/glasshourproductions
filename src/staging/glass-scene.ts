/* Glass Hour: the staging hero's WebGL moment (kept out of the coming-soon page,
 * which stays plain). A glass hourglass with real refraction, a brass frame and
 * sand made of light. The top bulb empties over one cycle, the glass flips, and
 * it starts again. It leans toward the pointer. Reduced motion renders one still
 * frame; without WebGL2 the host gets a "no-gl" class and shows its fallback.
 *
 *   const dispose = mountGlassHour(stageEl, canvasEl)
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const CYCLE = 60            // seconds for the top bulb to empty, then the flip
const FLIP = 1.4            // seconds the flip takes
const STREAM_N = 420
const PILE_N = 1400

export function mountGlassHour(stage: HTMLElement, canvas: HTMLCanvasElement): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' })
  if (!gl) { stage.classList.add('no-gl'); return () => {} }
  return start(stage, canvas, gl, reduced)
}

/* the bulb profile: radius at height y, |y| <= 1.4; the same curve draws the glass
 * and bounds the sand in the top bulb */
function profile(y: number): number {
  const t = Math.min(1, Math.abs(y) / 1.4)
  return 0.11 + 0.72 * Math.pow(t, 0.55) * (1 - Math.pow(t, 10))
}

function start(stage: HTMLElement, canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, reduced: boolean): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true })
  renderer.setClearColor(0x07080a, 1)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.7

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40)
  camera.position.set(0, 0.15, 7.2)

  const rig = new THREE.Group()          // pointer lean
  const glassG = new THREE.Group()       // the flip
  rig.add(glassG); scene.add(rig)

  // glass
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 72; i++) { const y = -1.4 + 2.8 * i / 72; pts.push(new THREE.Vector2(profile(y), y)) }
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transmission: 1, thickness: 0.7, roughness: 0.06, ior: 1.46,
    attenuationColor: new THREE.Color(0xbfd3f2), attenuationDistance: 3.2,
    clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1, side: THREE.DoubleSide,
  })
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 112), glassMat)
  glassG.add(glass)

  // brass frame: two plates, three pillars, a finial on each plate
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9dee5, metalness: 1, roughness: 0.16, envMapIntensity: 1.8 })
  const plateGeo = new THREE.CylinderGeometry(0.98, 0.98, 0.09, 96)
  for (const y of [1.46, -1.46]) { const p = new THREE.Mesh(plateGeo, brass); p.position.y = y; glassG.add(p) }
  const pillarGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.92, 24)
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI * 2 / 3 + Math.PI / 6
    const pl = new THREE.Mesh(pillarGeo, brass); pl.position.set(Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86); glassG.add(pl)
  }
  const capGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.06, 32)
  for (const y of [1.535, -1.535]) { const c = new THREE.Mesh(capGeo, brass); c.position.y = y; if (y < 0) c.rotation.x = Math.PI; glassG.add(c) }

  // sand: a falling stream, a pile below, a reserve above. Opaque materials with
  // additive blending, so the transmission pass sees them through the glass.
  const sandMat = (size: number) => new THREE.PointsMaterial({
    color: 0xdfe9f5, size, sizeAttenuation: true, transparent: false,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const stream = new Float32Array(STREAM_N * 3)
  const streamPhase = new Float32Array(STREAM_N)
  const streamJit = new Float32Array(STREAM_N * 2)
  for (let i = 0; i < STREAM_N; i++) { streamPhase[i] = Math.random(); streamJit[i * 2] = Math.random() - 0.5; streamJit[i * 2 + 1] = Math.random() - 0.5 }
  const streamGeo = new THREE.BufferGeometry(); streamGeo.setAttribute('position', new THREE.BufferAttribute(stream, 3))
  const streamPts = new THREE.Points(streamGeo, sandMat(0.028)); glassG.add(streamPts)

  const pile = new Float32Array(PILE_N * 3), reserve = new Float32Array(PILE_N * 3)
  const seed = new Float32Array(PILE_N * 3)   // per-grain: radial u, angle, height v
  for (let i = 0; i < PILE_N; i++) { seed[i * 3] = Math.sqrt(Math.random()); seed[i * 3 + 1] = Math.random() * Math.PI * 2; seed[i * 3 + 2] = Math.random() }
  const pileGeo = new THREE.BufferGeometry(); pileGeo.setAttribute('position', new THREE.BufferAttribute(pile, 3))
  const resGeo = new THREE.BufferGeometry(); resGeo.setAttribute('position', new THREE.BufferAttribute(reserve, 3))
  const pilePts = new THREE.Points(pileGeo, sandMat(0.022)); glassG.add(pilePts)
  const resPts = new THREE.Points(resGeo, sandMat(0.022)); glassG.add(resPts)

  function shapeSand(f: number) {
    // f: fraction of the hour gone (0 = top full). Pile grows below, reserve shrinks above.
    const H = 0.42 * f, R = 0.64 * Math.sqrt(f)
    const g = 1 - f, Hr = 0.62 * g
    for (let i = 0; i < PILE_N; i++) {
      const u = seed[i * 3], a = seed[i * 3 + 1], v = seed[i * 3 + 2]
      const r = R * u
      pile[i * 3] = Math.cos(a) * r
      pile[i * 3 + 1] = -1.33 + H * (1 - u) * v + 0.012 * (v - 0.5)
      pile[i * 3 + 2] = Math.sin(a) * r
      const y = 0.06 + Hr * v
      const rr = (profile(y) - 0.03) * u
      reserve[i * 3] = Math.cos(a) * rr
      reserve[i * 3 + 1] = y - 0.55 * Hr * u * u * (1 - v)   // a funnel dip toward the neck
      reserve[i * 3 + 2] = Math.sin(a) * rr
    }
    pileGeo.attributes.position.needsUpdate = true
    resGeo.attributes.position.needsUpdate = true
    pilePts.visible = f > 0.004
    resPts.visible = g > 0.004
  }
  function shapeStream(t: number, running: boolean) {
    streamPts.visible = running
    if (!running) return
    for (let i = 0; i < STREAM_N; i++) {
      const p = (t * 0.85 + streamPhase[i]) % 1
      const spread = 0.02 + p * 0.05
      stream[i * 3] = streamJit[i * 2] * spread
      stream[i * 3 + 1] = 0.05 - p * 1.4
      stream[i * 3 + 2] = streamJit[i * 2 + 1] * spread
    }
    streamGeo.attributes.position.needsUpdate = true
  }

  // light: the sand glows, so a warm point light lives at the neck; a cool key from above
  const neck = new THREE.PointLight(0xbfd6f0, 5, 5, 2); neck.position.set(0, -0.2, 0.2); glassG.add(neck)
  const key = new THREE.DirectionalLight(0xdce6f2, 1.6); key.position.set(-2, 4, 3); scene.add(key)
  const rim = new THREE.DirectionalLight(0x8a97ad, 0.9); rim.position.set(3, -1, -3); scene.add(rim)

  // sizing
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight
    if (!w || !h) return
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = w < h ? 40 : 32
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(() => { resize(); if (reduced) still() })
  ro.observe(stage)

  // pointer lean (mouse only; touch devices keep the idle sway)
  let tx = 0, ty = 0
  const onMove = (e: PointerEvent) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2
    ty = (e.clientY / window.innerHeight - 0.5) * 2
  }
  if (!('ontouchstart' in window)) window.addEventListener('pointermove', onMove)

  const t0 = performance.now() / 1000
  let alive = true
  let hidden = document.hidden
  const onVis = () => { hidden = document.hidden; if (!hidden && !reduced && alive) requestAnimationFrame(frame) }
  document.addEventListener('visibilitychange', onVis)

  function frame() {
    if (!alive || hidden || reduced) return
    const t = performance.now() / 1000 - t0
    const cyc = t % (CYCLE + FLIP)
    if (cyc < CYCLE) {
      shapeSand(cyc / CYCLE)
      shapeStream(t, true)
      glassG.rotation.z = 0
    } else {
      // the flip: half a turn; the glass is symmetric, the sand is re-shaped for the next hour
      const k = (cyc - CYCLE) / FLIP
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      glassG.rotation.z = Math.PI * e
      shapeSand(1)
      shapeStream(t, false)
    }
    const sway = 0.35 * Math.sin(t * 0.25)
    rig.rotation.y = sway + THREE.MathUtils.lerp(rig.rotation.y - sway, tx * 0.45, 0.06)
    rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, ty * 0.18 + 0.05, 0.06)
    renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }
  function still() {
    shapeSand(0.38); shapeStream(0, true); rig.rotation.y = 0.35; rig.rotation.x = 0.08
    renderer.render(scene, camera)
  }

  if (reduced) still(); else requestAnimationFrame(frame)

  return () => {
    alive = false
    ro.disconnect()
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('visibilitychange', onVis)
    pmrem.dispose()
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      const mat = (m as THREE.Mesh).material as THREE.Material | undefined
      if (mat && typeof mat.dispose === 'function') mat.dispose()
    })
    renderer.dispose()
  }
}
