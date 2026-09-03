import { useEffect, useRef } from 'react'
import { mountGlassHour } from './glass-scene'

/* The hero's WebGL moment, mounted once and disposed on unmount. */
export function GlassHour() {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!stage.current || !canvas.current) return
    return mountGlassHour(stage.current, canvas.current)
  }, [])
  return (
    <div className="st-stage" ref={stage} aria-hidden="true">
      <canvas className="st-canvas" ref={canvas} />
      <svg className="st-fallback" viewBox="0 0 120 180">
        <g fill="none" stroke="#d9c39a" strokeWidth="2" strokeLinecap="round">
          <path d="M18 10h84M18 170h84" />
          <path d="M30 14c0 44 26 56 30 76-4 20-30 32-30 76" />
          <path d="M90 14c0 44-26 56-30 76 4 20 30 32 30 76" />
        </g>
        <path d="M60 92v52" stroke="#e7b45a" strokeWidth="2" strokeDasharray="3 5" />
        <path d="M40 160c8-14 32-14 40 0z" fill="#e7b45a" />
      </svg>
    </div>
  )
}
