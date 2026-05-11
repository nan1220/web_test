const highlights = [
  {
    title: 'Designed for focus',
    text: 'A calm information hierarchy keeps the page readable while still feeling high-end.',
  },
  {
    title: 'Responsive by default',
    text: 'The layout collapses cleanly on smaller screens without losing visual rhythm.',
  },
  {
    title: 'Built to ship',
    text: 'The page is ready for real content, with reusable sections and simple structure.',
  },
]

const metrics = [
  { value: '24h', label: 'fast launch cycle' },
  { value: '3x', label: 'content sections' },
  { value: '100%', label: 'responsive layout' },
]

const steps = [
  'Introduce the product with a confident headline.',
  'Show the value in concise, scannable cards.',
  'Close with a clear action and visual contrast.',
]

function App() {
  return (
    <main className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="hero-card">
        <nav className="topbar" aria-label="Primary">
          <div>
            <p className="brand">Northstar Studio</p>
            <p className="brand-subtitle">A React page with an editorial edge</p>
          </div>
          <a className="topbar-link" href="#contact">
            Start a project
          </a>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">React landing page</p>
            <h1>Make the first screen feel like a finished product.</h1>
            <p className="lede">
              This page pairs a clean React structure with a more deliberate visual
              direction: warm gradients, bold typography, and crisp card-based content.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#highlights">
                Explore the layout
              </a>
              <a className="button button-secondary" href="#contact">
                View the call to action
              </a>
            </div>

            <ul className="metrics" aria-label="Key metrics">
              {metrics.map((metric) => (
                <li key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="hero-panel" aria-label="Preview panel">
            <div className="panel-window">
              <div className="panel-header">
                <span />
                <span />
                <span />
              </div>
              <div className="panel-body">
                <p className="panel-label">Today</p>
                <h2>One page. Three signals.</h2>
                <p>
                  The interface keeps the message sharp, the spacing generous, and the
                  motion subtle.
                </p>
                <div className="signal-row">
                  <span>Clarity</span>
                  <span>Motion</span>
                  <span>Contrast</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="content-grid" id="highlights">
        {highlights.map((item, index) => (
          <article className="info-card" key={item.title}>
            <p className="card-index">0{index + 1}</p>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="workflow-card">
        <div>
          <p className="eyebrow">Suggested flow</p>
          <h2>A compact page that still feels intentional.</h2>
        </div>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="cta-card" id="contact">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>Use this as the base for your own React site.</h2>
          <p>
            Replace the copy, wire in navigation, or expand it into a full multi-page
            app.
          </p>
        </div>
        <a className="button button-primary" href="mailto:hello@example.com">
          Contact us
        </a>
      </section>
    </main>
  )
}

export default App
