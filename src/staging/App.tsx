/* Staging pass one (2026-09-03), built on Paul's first draft: his lockup, his
 * tagline, his three "Build Your Vision" lines, his full-scope list, who he has
 * worked with. Black and chrome, glass and light, wide-set thin capitals, the
 * way his logo sheet reads. Sample galleries are wired and stay hidden until
 * his links land. */
import { GlassHour } from './GlassHour'
import { Gallery, type GalleryItem } from './Gallery'
import { Lockup } from './Lockup'

const NAV = [
  ['#vision', 'Vision'],
  ['#scope', 'Services'],
  ['#work', 'Worked with'],
  ['#contact', 'Contact'],
] as const

// Paul: "I'll get you all the links to samples. Those should be galleries with a lightbox."
const SAMPLES: Record<string, GalleryItem[]> = { web: [], graphic: [], song: [], photo: [] }

const VISION = [
  { key: 'web', title: 'Website Designs', sub: 'Design and administration', line: 'A site built to be run, not just launched.' },
  { key: 'graphic', title: 'Graphic Design', sub: 'Logos, flyers, ad designs, business solutions', line: 'The mark, the poster, the campaign, the paperwork behind it.' },
  { key: 'song', title: 'Songwriting', sub: 'Words and music', line: 'Songs written to order and songs written to be sung by someone else.' },
]

const SCOPE = [
  'Artist Management and Development',
  'Entertainment Consulting',
  'Marketing Strategies',
  'Talent Booking',
  'Concert and Event Promotion',
  'Talent Scouting',
  'Photo and Video Creations / Scene Innovator',
  'Digital Media Management',
  'Social Media Ad Campaigns',
  'Musician Mentor',
  'Fashion Imaging and Style Consulting / Personal Shopper',
  'Vocal and Stage Coaching',
  'Creative Solutions / Idea Generator / Problem Solver',
]

const WORKED = [
  { head: 'Bands', items: ['Magical Mystery Doors', 'Go Go Gadjet', 'Blurryface'], notes: ['Beatles, Zeppelin, Doors and Zeppelin Reimagined', 'International high-end event band', 'Twenty One Pilots tribute'] },
  { head: 'Companies', items: ['Three Hive Studios', 'Midnight Sun'], notes: ['', ''] },
  { head: 'Partnered with', items: ['Run Rabbit Run'], notes: [''] },
]

export function App() {
  return (
    <div className="gh">
      <header className="gh-head">
        <a className="gh-mark" href="/staging/" aria-label="Glass Hour Productions">
          <Lockup size="small" />
        </a>
        <nav className="gh-nav" aria-label="Sections">
          {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <span className="gh-chip">Staging</span>
      </header>

      <section className="gh-hero" id="top">
        <div className="gh-hero-copy">
          <Lockup size="hero" />
          <p className="gh-tagline">Glass Hour Productions was designed to bring dreamers together and shape larger than life visions.</p>
          <a className="gh-cta" href="#vision">Build your vision with us</a>
        </div>
        <div className="gh-hero-glass" aria-hidden="true">
          <GlassHour />
        </div>
      </section>

      <section className="gh-sec" id="vision">
        <p className="gh-kick">Build your vision with us</p>
        <div className="gh-vision">
          {VISION.map((v) => (
            <article className="gh-card" key={v.key}>
              <h2>{v.title}</h2>
              <p className="gh-sub">{v.sub}</p>
              <p className="gh-line">{v.line}</p>
              <Gallery title={v.title} items={SAMPLES[v.key]} />
              {!SAMPLES[v.key].length && <p className="gh-soon">Samples arriving</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="gh-sec" id="scope">
        <p className="gh-kick">Our full scope</p>
        <h2 className="gh-h">Services and expertise</h2>
        <ul className="gh-scope">
          {SCOPE.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <Gallery title="Photo and Video" items={SAMPLES.photo} />
      </section>

      <section className="gh-sec" id="work">
        <p className="gh-kick">Who we have worked with</p>
        <div className="gh-worked">
          {WORKED.map((g) => (
            <div className="gh-group" key={g.head}>
              <h3>{g.head}</h3>
              <ul>
                {g.items.map((name, i) => (
                  <li key={name}><span className="gh-name">{name}</span>{g.notes[i] && <span className="gh-note">{g.notes[i]}</span>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="gh-sec gh-contact" id="contact">
        <p className="gh-kick">Contact</p>
        <h2 className="gh-h">Tell us the vision.</h2>
        <a className="gh-cta" href="mailto:glasshourproductions@gmail.com">glasshourproductions@gmail.com</a>
      </section>

      <footer className="gh-foot">
        <span>&copy; 2026 Glass Hour Productions</span>
        <a href="#top">Back to top</a>
      </footer>
    </div>
  )
}
