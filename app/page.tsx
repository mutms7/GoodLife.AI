import Link from "next/link";
import { CoachDemo } from "@/components/coach-demo";
import { Dandelion } from "@/components/marks";

const STEPS = [
  { title: "You describe a good day", body: "The ordinary kind, not the holiday version. Then you pick up to three things that matter right now and say where you're stuck." },
  { title: "You get three small steps", body: "Ranked from your answers by plain, testable logic. No black box deciding whether you should build an emergency fund." },
  { title: "You download the coach", body: "Conversation runs a small model on your own hardware, so it starts with a one-time download rather than an account. No download, no chat, and the app says so instead of quietly answering with something else." },
];

const ROUTING = [
  { label: "Habits", value: "The model answers, carrying the notes on cues, two-minute versions and never missing twice.", fixed: false },
  { label: "Money", value: "The model answers, held to buffer-then-interest and general education. Never a specific investment or amount.", fixed: false },
  { label: "Health", value: "The model answers, held to wake-time basics. It can't diagnose or name a medication, and it points at a clinician.", fixed: false },
  { label: "Heavier days", value: "The model answers, told not to diagnose or minimise. A pointer to real support is appended afterwards, not left to the model.", fixed: false },
  { label: "Crisis", value: "A fixed response, matched on literal phrases before anything runs. The model is not involved, and it works before the download.", fixed: true },
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
          <span className="site-eyebrow">Runs on your device. No account, no server.</span>
          <h1>A coach for the life you&apos;re actually living.</h1>
          <p>You don&apos;t need another list of everything that&apos;s wrong. You need to know what to do first, and you need it small enough to do on a normal Tuesday. Answer a few honest questions and I&apos;ll give you three.</p>
          <div className="site-cta">
            <Link className="btn btn-primary" href="/app">Answer a few questions</Link>
            <span>Takes about four minutes</span>
          </div>
          <div className="site-stats">
            <div className="site-stat"><strong>3</strong><span>starting steps, not thirty</span></div>
            <div className="site-stat"><strong>0</strong><span>messages sent to a server</span></div>
            <div className="site-stat"><strong>7</strong><span>days in the first plan</span></div>
          </div>
        </div>
        <CoachDemo />
      </section>

      <section className="site-band" id="how-it-works">
        <h2>Three questions in, and you have something to do today. Then you decide about the coach.</h2>
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
          <h2>Your answers never leave the browser you typed them into.</h2>
          <p>There&apos;s no inference server and no API key. The coach downloads once and runs on your own hardware, which is why it can&apos;t start until the download finishes. That&apos;s the honest limit: a small local model is less capable than a big cloud one. So the guidance lives in a plain markdown playbook the model routes against, your words are fenced off from the instructions so they can&apos;t rewrite them, and the disclaimers get added after the model is done rather than asked of it.</p>
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
          <p>No account, no email, no trial. Close the tab and nothing follows you.</p>
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
