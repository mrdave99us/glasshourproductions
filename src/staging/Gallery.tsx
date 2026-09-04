import { useEffect, useState } from 'react'

/* Paul's samples: "those should be galleries with a lightbox". One component,
 * fed a list of images; it renders nothing at all until the list has items, so
 * an empty gallery never shows an empty frame. */
export type GalleryItem = { src: string; alt: string; caption?: string }

export function Gallery({ title, items }: { title: string; items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? null : (i + 1) % items.length))
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? null : (i - 1 + items.length) % items.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items.length])
  if (!items.length) return null
  return (
    <>
      <div className="gh-gallery" role="list" aria-label={`${title} samples`}>
        {items.map((it, i) => (
          <button className="gh-thumb" type="button" key={it.src} onClick={() => setOpen(i)} aria-label={`Open ${it.alt}`}>
            <img src={it.src} alt={it.alt} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="gh-lightbox" role="dialog" aria-modal="true" aria-label={items[open].alt} onClick={() => setOpen(null)}>
          <img src={items[open].src} alt={items[open].alt} onClick={(e) => e.stopPropagation()} />
          {items[open].caption && <p className="gh-lightbox-cap">{items[open].caption}</p>}
          <button className="gh-lightbox-x" type="button" aria-label="Close" onClick={() => setOpen(null)}>Close</button>
          {items.length > 1 && (
            <>
              <button className="gh-lightbox-nav prev" type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + items.length) % items.length) }}>&#8249;</button>
              <button className="gh-lightbox-nav next" type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % items.length) }}>&#8250;</button>
            </>
          )}
        </div>
      )}
    </>
  )
}
