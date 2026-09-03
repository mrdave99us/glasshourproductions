/* The staging skeleton: the shell the real site grows in. React for the page,
 * three.js for the moments (see GlassHour). Sections are frames, not copy. */
import { GlassHour } from './GlassHour'

const NAV = [
  ['#work', 'Work'],
  ['#about', 'About'],
  ['#contact', 'Contact'],
] as const

export function App() {
  return (
    <div className="st">
      <header className="st-head">
        <a className="st-mark" href="/staging/">
          <svg className="st-glyph" viewBox="0 0 24 32" aria-hidden="true"><path d="M3 2h18M3 30h18M6 3c0 7 5 9 6 13-1 4-6 6-6 13M18 3c0 7-5 9-6 13 1 4 6 6 6 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <span>Glass Hour Productions</span>
        </a>
        <nav className="st-nav" aria-label="Sections">
          {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <span className="st-chip">Staging</span>
      </header>

      <section className="st-hero" id="top">
        <div className="st-copy">
          <p className="st-kick">Glass Hour Productions</p>
          <h1 className="st-title">The site starts here.</h1>
          <p className="st-lead">This is the staging build. The shell is React, the moments are WebGL, and every section below is a frame waiting for the real thing.</p>
          <div className="st-actions">
            <a className="st-btn" href="#work">See the frames</a>
            <a className="st-ghost" href="/">Back to the live page</a>
          </div>
        </div>
        <GlassHour />
      </section>

      <section className="st-sec" id="work">
        <h2>Work</h2>
        <p className="st-muted">Three case studies, each with a still, a clip and one paragraph.</p>
        <div className="st-grid">
          {['One', 'Two', 'Three'].map((n) => (
            <article className="st-card" key={n}>
              <div className="st-thumb" aria-hidden="true" />
              <h3>Case study {n}</h3>
              <p>Title, client, year and what Glass Hour did.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="st-sec" id="about">
        <h2>About</h2>
        <p className="st-muted">Who Glass Hour is, in Paul's words, with one portrait.</p>
      </section>

      <section className="st-sec" id="contact">
        <h2>Contact</h2>
        <p className="st-muted">One address, one phone number, the socials that matter.</p>
        <a className="st-btn" href="mailto:glasshourproductions@gmail.com">glasshourproductions@gmail.com</a>
      </section>

      <footer className="st-foot">
        <span>&copy; 2026 Glass Hour Productions</span>
        <a href="#top">Back to top</a>
      </footer>
    </div>
  )
}
