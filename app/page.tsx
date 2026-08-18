import Link from "next/link";
import { CoachDemo } from "@/components/coach-demo";
import { Dandelion } from "@/components/marks";

const STEPS = [
  { title: "Describe a good day", body: "Think of a normal day you would be glad to repeat. Then choose up to three things that matter and say what feels stuck." },
  { title: "Get three small steps", body: "Your answers shape a short, practical plan. You decide what to keep and what to change." },
  { title: "Start the local coach", body: "The AI runs on your computer or phone after a one-time download. Chat opens when it is ready." },
];

const ROUTING = [
  { label: "Habits", value: "The model uses notes about cues, two-minute versions and getting back on track.", fixed: false },
  { label: "Money", value: "It sticks to general education and a buffer before interest. It never picks an investment or amount.", fixed: false },
  { label: "Health", value: "It can discuss routines, but cannot diagnose or suggest a medicine or dose. It points you to a clinician.", fixed: false },
  { label: "Hard days", value: "It avoids diagnosing or brushing things off, then points to real support.", fixed: false },
  { label: "Crisis", value: "The model routes here and stops. The response is fixed text, and the support numbers stay available before download.", fixed: true },
];

export default function Site() {
  return (
    <div className="site">
      <header className="site-nav">
        <Link className="site-brand" href="/">
          <span className="site-brand-mark"><Dandelion size={20} strokeWidth={1.4} /></span>
          <span className="site-wordmark">goodlife<span>.ai</span></span>
        </Link>
        <nav className="site-links">
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <Link href="/app#ideas">The ideas</Link>
          <Link className="btn btn-primary" href="/app">Start talking</Link>
        </nav>
      </header>

      <section className="site-hero">
        <div className="site-hero-copy">
          <span className="site-eyebrow">A private AI coach that runs locally.</span>
          <h1>A coach for the life you&apos;re actually living.</h1>
          <p>You do not need another list of what is wrong. Answer a few honest questions and get three small things to try on a normal Tuesday.</p>
          <div className="site-cta">
            <Link className="btn btn-primary" href="/app">Answer a few questions</Link>
            <span>Takes about four minutes</span>
          </div>
          <div className="site-stats">
            <div className="site-stat"><strong>3</strong><span>starting steps, not thirty</span></div>
            <div className="site-stat"><strong>7</strong><span>days before synced conversations disappear</span></div>
            <div className="site-stat"><strong>365</strong><span>days visible in Your Year</span></div>
          </div>
        </div>
        <CoachDemo />
      </section>

      <section className="site-band" id="how-it-works">
        <h2>Three questions, then one useful thing to do today.</h2>
        <div className="site-steps">
          {STEPS.map((step, index) => (
            <div className="site-step" key={step.title}>
              <span className="site-step-num">{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="site-privacy" id="privacy">
        <div className="site-privacy-copy">
          <span className="site-eyebrow terracotta">Privacy, the boring literal kind</span>
          <h2>Your answers stay local by default.</h2>
          <p>The AI runs on your computer or phone. Only the account details you choose are stored online, and conversations disappear after seven days.</p>
          <div className="site-chips">
            <span>Local storage only</span>
            <span>JSON export</span>
            <span>Installs as an app</span>
          </div>
        </div>
        <div className="site-routing">
          <strong>What goes where</strong>
          <dl>
            {ROUTING.map((row) => (
              <div key={row.label}>
                <dt className={row.fixed ? "fixed" : ""}>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="site-close">
        <div>
          <h2>Start with one honest answer.</h2>
          <p>Use it locally, or sync only the account information you choose.</p>
        </div>
        <Link className="btn btn-primary" href="/app">Describe a good day</Link>
      </section>

      <footer className="site-footer">
        <p>A reflection and education tool, not medical, mental-health, legal or financial advice. Investment returns aren&apos;t guaranteed. For urgent safety concerns, contact local emergency services or a crisis line in your area.</p>
        <nav>
          <a href="#privacy">Privacy</a>
          <Link href="/app#ideas">The ideas</Link>
          <a href="https://github.com/mutms7/GoodLife.AI" target="_blank" rel="noreferrer">Source</a>
        </nav>
      </footer>
    </div>
  );
}
