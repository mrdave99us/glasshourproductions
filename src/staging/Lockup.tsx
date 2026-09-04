/* The lockup, typeset. Paul's own PNG (GH_03.png) replaces this the moment it is
 * in public/brand/: the component prefers the file and falls back to type only
 * when the file is not there, so the page never shows a broken image. The mark
 * follows his sheet: two facing triangles, chrome edges, light on the glass. */
import { useState } from 'react'

export function Lockup({ size = 'hero' }: { size?: 'hero' | 'small' }) {
  const [hasFile, setHasFile] = useState(true)
  const cls = `gh-lockup gh-lockup-${size}`
  if (hasFile) {
    return (
      <picture>
        <source type="image/webp" srcSet="/brand/gh-lockup-800.webp 800w, /brand/gh-lockup.webp 1600w" sizes={size === 'hero' ? 'min(88vw, 720px)' : '150px'} />
        <img className={cls} src="/brand/gh-lockup.png" srcSet="/brand/gh-lockup-800.png 800w, /brand/gh-lockup.png 1600w" sizes={size === 'hero' ? 'min(88vw, 720px)' : '150px'}
          width="1600" height="1161" alt="Glass Hour Productions" decoding="async" fetchPriority={size === 'hero' ? 'high' : 'auto'} onError={() => setHasFile(false)} />
      </picture>
    )
  }
  return (
    <div className={cls} role="img" aria-label="Glass Hour Productions">
      <svg className="gh-lockup-mark" viewBox="0 0 120 130" aria-hidden="true">
        <defs>
          <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".35" stopColor="#b9c2cc" />
            <stop offset=".5" stopColor="#f4f7fa" />
            <stop offset=".7" stopColor="#7d8791" />
            <stop offset="1" stopColor="#e6ebf0" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".14" />
            <stop offset="1" stopColor="#a9cff0" stopOpacity=".05" />
          </linearGradient>
        </defs>
        <polygon points="8,6 112,6 60,65" fill="url(#glass)" stroke="url(#chrome)" strokeWidth="3.2" strokeLinejoin="round" />
        <polygon points="60,65 112,124 8,124" fill="url(#glass)" stroke="url(#chrome)" strokeWidth="3.2" strokeLinejoin="round" />
        <polygon points="22,12 98,12 60,55" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1" />
        <polygon points="60,75 98,118 22,118" fill="none" stroke="#ffffff" strokeOpacity=".2" strokeWidth="1" />
      </svg>
      <span className="gh-lockup-name">Glass Hour</span>
      <span className="gh-lockup-sub">Productions</span>
    </div>
  )
}
