"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  classifyMessage,
  coachReply,
  getAdviceStarts,
  getFirstWeekPlan,
  labelForPriority,
  type Priority,
  type Profile,
  type Start,
} from "@/lib/advice";

type Screen = "today" | "coach" | "library" | "settings";
type ChatMessage = { role: "user" | "coach"; text: string };
type SavedData = { profile: Profile; done: string[]; streak?: number; completionDays?: string[]; chat: ChatMessage[] };
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const STORAGE_KEY = "goodlife-local-v1";
const defaultProfile: Profile = {
  name: "",
  vision: "",
  priorities: ["energy", "money"],
  energy: "steady",
  time: "some",
  moneyFeel: "okay",
  debt: "none",
  emergency: "some",
  housing: "exploring",
  sleep: "okay",
  social: "weekly",
  outdoor: "weekly",
  cooking: "sometimes",
  meditation: "curious",
};

const priorityOptions: { id: Priority; label: string; hint: string; icon: string }[] = [
  { id: "energy", label: "Energy & health", hint: "Sleep, movement, feeling capable", icon: "✦" },
  { id: "money", label: "Money calm", hint: "Room to breathe and future options", icon: "$" },
  { id: "relationships", label: "Relationships", hint: "Friends, family, community", icon: "◌" },
  { id: "meaning", label: "Meaning", hint: "Purpose, creativity, contribution", icon: "↗" },
  { id: "home", label: "A home that fits", hint: "Flexibility, stability, belonging", icon: "⌂" },
  { id: "confidence", label: "Self-trust", hint: "Follow-through without perfection", icon: "♡" },
];

const validPriorityIds = new Set<Priority>(priorityOptions.map((option) => option.id));
function sanitizeProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Profile>;
  if (typeof candidate.name !== "string") return null;
  const priorities = Array.isArray(candidate.priorities) ? candidate.priorities.filter((item): item is Priority => typeof item === "string" && validPriorityIds.has(item as Priority)).slice(0, 3) : defaultProfile.priorities;
  return { ...defaultProfile, ...candidate, name: candidate.name.slice(0, 80), vision: typeof candidate.vision === "string" ? candidate.vision.slice(0, 300) : "", priorities: priorities.length ? priorities : defaultProfile.priorities };
}

function sanitizeChat(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ChatMessage => Boolean(item && typeof item === "object" && ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "coach") && typeof (item as ChatMessage).text === "string")).map((item) => ({ ...item, text: item.text.slice(0, 2000) })).slice(-100);
}

function Choice({ label, hint, selected, onClick }: { label: string; hint?: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`choice ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      <span>{label}</span>{hint && <small>{hint}</small>}<span className="choice-mark" aria-hidden="true">{selected ? "✓" : ""}</span>
    </button>
  );
}

function Logo() {
  return <div className="brand"><span className="brand-mark">✳</span><span>good<span>life</span><small>.AI</small></span></div>;
}

function streakFor(days: string[]) {
  const unique = [...new Set(days)].sort().reverse();
  if (!unique.length) return 0;
  let count = 1;
  let cursor = new Date(`${unique[0]}T12:00:00`);
  for (let index = 1; index < unique.length; index += 1) {
    const next = new Date(`${unique[index]}T12:00:00`);
    const difference = Math.round((cursor.getTime() - next.getTime()) / 86400000);
    if (difference !== 1) break;
    count += 1; cursor = next;
  }
  return count;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Onboarding({ onDone }: { onDone: (profile: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((p) => ({ ...p, [key]: value }));
  const steps = [
    { eyebrow: "A gentle starting point", title: "What should we call you?", sub: "GoodLife.AI is a private, local-first guide. Nothing leaves this device.", body: "name" },
    { eyebrow: "The life you want", title: "In a few words, what is a good day like?", sub: "This becomes a small north star, not a performance target.", body: "vision" },
    { eyebrow: "The life you want", title: "What would feel meaningfully better?", sub: "Choose up to three. There is no wrong answer.", body: "priorities" },
    { eyebrow: "Your baseline", title: "How is your energy lately?", sub: "We will make the first step fit the season you are in.", body: "energy" },
    { eyebrow: "Money, without shame", title: "What is your money context?", sub: "A snapshot helps us keep advice practical, not prescriptive.", body: "money" },
    { eyebrow: "Your place in the world", title: "What is true about home right now?", sub: "Renting and owning can both be wise. We will compare the trade-offs.", body: "housing" },
    { eyebrow: "Small supports", title: "Which rhythms are already yours?", sub: "Pick the closest fit; this is a starting point, not a scorecard.", body: "rhythms" },
  ];
  const current = steps[step];
  const canNext = step === 0 ? profile.name.trim().length > 0 : step === 2 ? profile.priorities.length > 0 : true;
  const finish = () => onDone({ ...profile, name: profile.name.trim() });

  return <main className="onboarding"><div className="onboarding-top"><Logo /><span className="privacy-pill">⌁ stored on this device</span></div>
    <div className="progress-track" aria-label={`Step ${step + 1} of ${steps.length}`}><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
    <section className="onboarding-card"><div className="eyebrow">{current.eyebrow}<span>0{step + 1} / 0{steps.length}</span></div><h1>{current.title}</h1><p className="subhead">{current.sub}</p>
      {current.body === "name" && <div className="name-field"><label htmlFor="name">Your first name</label><input id="name" autoFocus value={profile.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Maya" onKeyDown={(e) => e.key === "Enter" && canNext && setStep(1)} /></div>}
      {current.body === "vision" && <div className="name-field"><label htmlFor="vision">A good day might include…</label><textarea id="vision" autoFocus value={profile.vision} onChange={(e) => update("vision", e.target.value)} placeholder="A slow breakfast, work I care about, and enough energy for a walk" rows={4} /></div>}
      {current.body === "priorities" && <div className="choice-grid">{priorityOptions.map((option) => <Choice key={option.id} label={`${option.icon}  ${option.label}`} hint={option.hint} selected={profile.priorities.includes(option.id)} onClick={() => update("priorities", profile.priorities.includes(option.id) ? profile.priorities.filter((x) => x !== option.id) : profile.priorities.length < 3 ? [...profile.priorities, option.id] : profile.priorities)} />)}</div>}
      {current.body === "energy" && <div className="choice-stack"><Choice label="Drained: I am getting through the day" selected={profile.energy === "drained"} onClick={() => update("energy", "drained")} /><Choice label="Steady: some good, some full" selected={profile.energy === "steady"} onClick={() => update("energy", "steady")} /><Choice label="Energized: ready for a stretch" selected={profile.energy === "energized"} onClick={() => update("energy", "energized")} /><div className="mini-label">Time for yourself</div><div className="choice-row"><Choice label="Scraps" selected={profile.time === "scraps"} onClick={() => update("time", "scraps")} /><Choice label="Some" selected={profile.time === "some"} onClick={() => update("time", "some")} /><Choice label="Room" selected={profile.time === "room"} onClick={() => update("time", "room")} /></div></div>}
      {current.body === "money" && <div className="choice-stack"><div className="mini-label">Money feels…</div><div className="choice-row"><Choice label="Stretched" selected={profile.moneyFeel === "stretched"} onClick={() => update("moneyFeel", "stretched")} /><Choice label="Okay" selected={profile.moneyFeel === "okay"} onClick={() => update("moneyFeel", "okay")} /><Choice label="Growing" selected={profile.moneyFeel === "growing"} onClick={() => update("moneyFeel", "growing")} /></div><div className="mini-label">High-interest debt?</div><div className="choice-row"><Choice label="None" selected={profile.debt === "none"} onClick={() => update("debt", "none")} /><Choice label="Some" selected={profile.debt === "some"} onClick={() => update("debt", "some")} /><Choice label="Yes" selected={profile.debt === "high-interest"} onClick={() => update("debt", "high-interest")} /></div><div className="mini-label">Accessible emergency savings</div><div className="choice-row"><Choice label="None" selected={profile.emergency === "none"} onClick={() => update("emergency", "none")} /><Choice label="Some" selected={profile.emergency === "some"} onClick={() => update("emergency", "some")} /><Choice label="3+ months" selected={profile.emergency === "three-months"} onClick={() => update("emergency", "three-months")} /></div></div>}
      {current.body === "housing" && <div className="choice-stack"><Choice label="Renting: flexibility matters" hint="Lower commitment; watch for rising rent and less control." selected={profile.housing === "renting"} onClick={() => update("housing", "renting")} /><Choice label="Owning: roots matter" hint="More control; include taxes, maintenance, interest, and opportunity cost." selected={profile.housing === "owning"} onClick={() => update("housing", "owning")} /><Choice label="Exploring: I am not sure yet" hint="A clear comparison can be a good next step." selected={profile.housing === "exploring"} onClick={() => update("housing", "exploring")} /></div>}
      {current.body === "rhythms" && <div className="rhythm-grid"><div><span className="mini-label">Sleep</span><Choice label="Inconsistent" selected={profile.sleep === "inconsistent"} onClick={() => update("sleep", "inconsistent")} /><Choice label="Okay" selected={profile.sleep === "okay"} onClick={() => update("sleep", "okay")} /><Choice label="Restful" selected={profile.sleep === "restful"} onClick={() => update("sleep", "restful")} /></div><div><span className="mini-label">Outside time</span><Choice label="Rarely" selected={profile.outdoor === "rarely"} onClick={() => update("outdoor", "rarely")} /><Choice label="Weekly" selected={profile.outdoor === "weekly"} onClick={() => update("outdoor", "weekly")} /><Choice label="Often" selected={profile.outdoor === "often"} onClick={() => update("outdoor", "often")} /></div><div><span className="mini-label">People time</span><Choice label="Rarely" selected={profile.social === "rarely"} onClick={() => update("social", "rarely")} /><Choice label="Weekly" selected={profile.social === "weekly"} onClick={() => update("social", "weekly")} /><Choice label="Often" selected={profile.social === "often"} onClick={() => update("social", "often")} /></div><div><span className="mini-label">Cooking</span><Choice label="Rarely" selected={profile.cooking === "rarely"} onClick={() => update("cooking", "rarely")} /><Choice label="Sometimes" selected={profile.cooking === "sometimes"} onClick={() => update("cooking", "sometimes")} /><Choice label="Often" selected={profile.cooking === "often"} onClick={() => update("cooking", "often")} /></div></div>}
      <div className="onboarding-actions"><button type="button" className="text-button" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>Back</button>{step < steps.length - 1 ? <button type="button" className="primary-button" onClick={() => canNext && setStep(step + 1)} disabled={!canNext}>Continue <span>→</span></button> : <button type="button" className="primary-button" onClick={finish}>Build my starting point <span>→</span></button>}</div>
    </section><p className="onboarding-note">You can edit or delete everything later. GoodLife.AI is a reflection tool, not a replacement for professional care.</p></main>;
}

function Nav({ screen, setScreen, onReset }: { screen: Screen; setScreen: (s: Screen) => void; onReset: () => void }) {
  const navItems: { id: Screen; label: string; icon: string }[] = [{ id: "today", label: "Today", icon: "◷" }, { id: "coach", label: "Coach", icon: "✦" }, { id: "library", label: "Principles", icon: "▤" }, { id: "settings", label: "Your data", icon: "⚙" }];
  return <aside className="sidebar"><Logo /><div className="nav-label">YOUR SPACE</div><nav>{navItems.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-bottom"><div className="offline-note"><span className="online-dot" />Local-first · private</div><button className="reset-link" onClick={onReset}>Start over</button></div></aside>;
}

function Header({ profile, screen }: { profile: Profile; screen: Screen }) {
  const labels: Record<Screen, string> = { today: "Today", coach: "Coach", library: "Principles", settings: "Your data" };
  return <header className="app-header"><div><span className="mobile-brand"><Logo /></span><div className="header-kicker">GOODLIFE.AI / {labels[screen].toUpperCase()}</div><h1>{screen === "today" ? `Good morning, ${profile.name || "friend"}.` : labels[screen]}</h1></div><div className="header-meta"><span className="date-chip">{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span><span className="avatar">{(profile.name || "G").slice(0, 1).toUpperCase()}</span></div></header>;
}

function StartCard({ start, done, toggle }: { start: Start; done: boolean; toggle: () => void }) {
  return <article className={`start-card ${done ? "is-done" : ""}`}><div className={`area-dot ${start.area}`} /><div className="start-content"><div className="start-top"><span className="start-area">{start.area}</span><span className="effort">{start.effort}</span></div><h3>{start.title}</h3><p>{start.why}</p><div className="start-action"><button type="button" className={`check-button ${done ? "checked" : ""}`} onClick={toggle} aria-label={done ? `Completed: ${start.title}` : `Mark complete: ${start.title}`}>{done ? "✓" : "○"}</button><span>{start.action}</span></div></div></article>;
}

function Today({ profile, done, toggle, streak, setScreen }: { profile: Profile; done: string[]; toggle: (id: string) => void; streak: number; setScreen: (s: Screen) => void }) {
  const starts = useMemo(() => getAdviceStarts(profile), [profile]);
  const week = useMemo(() => getFirstWeekPlan(profile), [profile]);
  const completed = starts.filter((s) => done.includes(s.id)).length;
  return <div className="page-content today-page"><section className="hero-card"><div><span className="eyebrow light">YOUR NORTH STAR</span><h2>{profile.vision ? `“${profile.vision}”` : "A life with more room to be yourself."}</h2><p>One small, honest action at a time. Your plan adapts as you learn.</p></div><div className="hero-spark">✳</div></section><div className="today-grid"><section><div className="section-heading"><div><span className="eyebrow">YOUR THREE STARTS</span><h2>High-impact, low-pressure</h2></div><span className="progress-count">{completed} / 3 complete</span></div><div className="start-list">{starts.map((start) => <StartCard key={start.id} start={start} done={done.includes(start.id)} toggle={() => toggle(start.id)} />)}</div></section><aside className="side-column"><div className="streak-card"><div className="streak-icon">♨</div><div><span className="eyebrow">KEEP THE THREAD</span><strong>{streak} day{streak === 1 ? "" : "s"}</strong><p>A real consecutive-day return, not a score.</p></div></div><div className="week-card"><div className="section-heading compact"><span className="eyebrow">FIRST WEEK</span><span className="tiny-link">7 gentle steps</span></div>{week.slice(0, 4).map((day) => <div className="week-row" key={day.day}><span className="week-day">{day.day}</span><span>{day.action}</span></div>)}<button className="outline-button" onClick={() => setScreen("library")}>See the principles →</button></div></aside></div><div className="disclaimer">GoodLife.AI offers general education and reflection prompts. It is not medical, mental-health, legal, or financial advice.</div></div>;
}

function Coach({ profile, chat, setChat }: { profile: Profile; chat: ChatMessage[]; setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>> }) {
  const [input, setInput] = useState("");
  const [localAI, setLocalAI] = useState(false);
  const [aiStatus, setAiStatus] = useState<"off" | "loading" | "ready" | "error">("off");
  const [aiProgress, setAiProgress] = useState("");
  const engineRef = useRef<{ chat: { completions: { create: (args: { messages: { role: string; content: string }[]; temperature?: number; max_tokens?: number }) => Promise<{ choices?: { message?: { content?: string } }[] }> } } } | null>(null);
  const enableLocalAI = async () => {
    if (aiStatus === "loading" || aiStatus === "ready") return;
    setAiStatus("loading"); setAiProgress("Downloading a small model (~1 GB)…");
    try {
      const webllm = await import("@mlc-ai/web-llm");
      const engine = await webllm.CreateMLCEngine("Qwen2.5-0.5B-Instruct-q4f16_1-MLC", { initProgressCallback: (report) => setAiProgress(report.text || "Preparing model…") });
      engineRef.current = engine; setLocalAI(true); setAiStatus("ready"); setAiProgress("Ready on this device");
    } catch { setAiStatus("error"); setAiProgress("Could not load here. The deterministic coach is still available."); }
  };
  const send = async () => { const value = input.trim(); if (!value) return; setInput(""); const domain = classifyMessage(value); const deterministic = coachReply(value, profile); setChat((messages) => [...messages, { role: "user", text: value }]); const modelSafe = domain === "general" || domain === "habits" || domain === "relationships" || domain === "meaning"; if (modelSafe && engineRef.current && localAI) { try { const result = await engineRef.current.chat.completions.create({ messages: [{ role: "system", content: `You are a warm, concise life coach. Use this person's north star: ${profile.vision || "not shared"}. Give practical, safe suggestions and no guarantees.`, }, { role: "user", content: value }], temperature: .4, max_tokens: 220 }); const modelText = result.choices?.[0]?.message?.content?.trim(); if (modelText) { setChat((messages) => [...messages, { role: "coach", text: modelText }]); return; } } catch { /* deterministic response below */ } } setChat((messages) => [...messages, { role: "coach", text: deterministic }]); };
  const prompts = ["How should I start with money?", "I keep missing my habits", "Is renting okay for me?", "I feel tired all the time"];
  return <div className="page-content coach-page"><div className="coach-intro"><div className="coach-orb">✦</div><div><span className="eyebrow">YOUR LOCAL COACH</span><h2>Think out loud. Start small.</h2><p>Personalized replies run on this device. No account, no feed, no judgment.</p></div></div><div className="local-ai-panel"><div><strong>Optional on-device AI</strong><p>{aiStatus === "ready" ? "Qwen is ready in your browser. Your messages stay local." : aiStatus === "loading" ? aiProgress : aiStatus === "error" ? aiProgress : "Try a small Qwen model for more open-ended replies. The first download is about 1 GB and needs a compatible device; deterministic advice always works without it."}</p></div>{aiStatus !== "ready" && <button className="outline-button" onClick={enableLocalAI} disabled={aiStatus === "loading"}>{aiStatus === "loading" ? "Loading…" : "Enable local AI"}</button>}</div><div className="chat-shell"><div className="chat-messages" aria-live="polite">{chat.map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}><span className="message-label">{message.role === "coach" ? (localAI && aiStatus === "ready" ? "GOODLIFE.AI · LOCAL AI" : "GOODLIFE.AI") : "YOU"}</span><p>{message.text}</p></div>)}</div><div className="prompt-row">{prompts.map((prompt) => <button key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>)}</div><div className="chat-input"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ask about the life you are building…" aria-label="Message your coach" rows={2} /><button className="primary-button" onClick={() => void send()} disabled={!input.trim()}>Send <span>↗</span></button></div></div><p className="coach-footnote">For urgent safety concerns, contact local emergency services. Coach replies are educational and cannot diagnose or manage an emergency.</p></div>;
}

function Library() {
  const cards = [{ title: "Pay yourself first", tag: "MONEY", text: "Automate a sustainable amount before lifestyle spending. Build liquidity and handle high-interest debt; invest for the long term in diversified, low-cost funds with a risk level and time horizon you understand.", source: "The Wealthy Barber · investor education" }, { title: "Make it tiny, make it yours", tag: "HABITS", text: "Choose an identity, attach a two-minute action to a cue, shape the environment, and track the return. Missing once is information; never miss twice.", source: "Atomic Habits · behavioral science" }, { title: "Connection is a practice", tag: "PEOPLE", text: "Be curious, remember what matters to people, and offer specific invitations. Warm consistency beats trying to impress.", source: "How to Win Friends and Influence People · social wisdom" }, { title: "Feelings are weather", tag: "MEANING", text: "Make room for difficult thoughts while choosing a small values-led action. You can carry discomfort without letting it choose your whole day.", source: "The Happiness Trap · acceptance and commitment principles" }, { title: "Protect the basics", tag: "HEALTH", text: "A regular sleep schedule, daylight, movement, nourishing food, and supportive people are powerful foundations. Persistent or concerning symptoms deserve a clinician.", source: "Why We Sleep · public health guidance" }, { title: "Enough is a direction", tag: "TIME", text: "There will always be more to optimize. Choose what deserves attention this season, then let a few things remain unfinished.", source: "Four Thousand Weeks · time perspective" }, { title: "Flexibility or roots?", tag: "HOME", text: "Renting can suit a changing season and keeps moving friction lower. Owning can offer control and stability, but compare taxes, insurance, fees, maintenance, interest, and opportunity cost, not only the mortgage.", source: "CFPB rent-vs-buy guidance" }];
  return <div className="page-content library-page"><div className="library-lead"><span className="eyebrow">A SMALL LIBRARY</span><h2>Ideas worth trying, never rules to obey.</h2><p>GoodLife.AI borrows generously and quotes sparingly. These are prompts to test in your own life.</p></div><div className="principle-grid">{cards.map((card) => <article className="principle-card" key={card.title}><span className="principle-tag">{card.tag}</span><h3>{card.title}</h3><p>{card.text}</p><small>{card.source}</small></article>)}</div><div className="sources"><span className="eyebrow">EVIDENCE NOTES</span><p>Public-health basics: <a href="https://www.cdc.gov/sleep/about/index.html" target="_blank" rel="noreferrer">CDC sleep guidance</a> and <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noreferrer">WHO movement guidance</a>. Investing prompts: <a href="https://www.investor.gov/introduction-investing" target="_blank" rel="noreferrer">Investor.gov diversification and risk</a> and <a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated" target="_blank" rel="noreferrer">fee education</a>. Housing context: <a href="https://www.consumerfinance.gov/archive/blog/making-decision-rent-or-buy/" target="_blank" rel="noreferrer">CFPB rent-vs-buy trade-offs</a>. GoodLife.AI does not promise outcomes.</p></div></div>;
}

function Settings({ profile, onExport, onReset, onInstall }: { profile: Profile; onExport: () => void; onReset: () => void; onInstall?: () => void }) {
  return <div className="page-content settings-page"><div className="settings-lead"><span className="eyebrow">YOUR DATA</span><h2>Private by default.</h2><p>Your profile, completions, and coach messages live in this browser’s local storage. Nothing is sent to a server.</p></div><div className="settings-panel"><div className="setting-row"><div><strong>Profile snapshot</strong><p>{profile.name} · focused on {profile.priorities.map(labelForPriority).join(", ")}</p></div><span className="local-badge">LOCAL</span></div><div className="setting-row"><div><strong>Install GoodLife.AI</strong><p>{onInstall ? "Add a fast, standalone shortcut to this device." : "Use your browser’s Share or Add to Home Screen menu when available."}</p></div>{onInstall && <button className="outline-button" onClick={onInstall}>Install app ↓</button>}</div><div className="setting-row"><div><strong>Export your data</strong><p>Download a portable JSON copy before clearing your browser.</p></div><button className="outline-button" onClick={onExport}>Export JSON ↓</button></div><div className="setting-row danger"><div><strong>Reset GoodLife.AI</strong><p>Delete your local profile, completions, and chat history.</p></div><button className="outline-button danger-button" onClick={onReset}>Reset data</button></div></div><div className="settings-note"><strong>A note on care</strong><p>GoodLife.AI is a reflection and education tool. For medical, mental-health, housing, or financial decisions, use it as a prompt for a qualified professional who knows your situation.</p></div></div>;
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [completionDays, setCompletionDays] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [screen, setScreen] = useState<Screen>("today");
  useEffect(() => { const timer = window.setTimeout(() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const saved = JSON.parse(raw) as SavedData; const nextProfile = sanitizeProfile(saved.profile); if (!nextProfile) return; const nextDone = Array.isArray(saved.done) ? saved.done.filter((item): item is string => typeof item === "string").slice(0, 50) : []; const nextDays = Array.isArray(saved.completionDays) ? saved.completionDays.filter((item): item is string => typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item)).slice(-400) : []; setProfile(nextProfile); setDone(nextDone); setCompletionDays(nextDays); setStreak(streakFor(nextDays)); setChat(sanitizeChat(saved.chat)); } } catch { /* malformed JSON or unavailable storage: start fresh in memory */ } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (profile) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, done, completionDays, streak, chat } satisfies SavedData)); } catch { /* storage quota or privacy mode: app still works in memory */ } } }, [profile, done, completionDays, streak, chat]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  useEffect(() => { const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); }; window.addEventListener("beforeinstallprompt", handler); return () => window.removeEventListener("beforeinstallprompt", handler); }, []);
  const completeOnboarding = (next: Profile) => { setProfile(next); setChat([{ role: "coach", text: `Welcome, ${next.name}. I found three gentle starts for this season. You can change them anytime.` }]); };
  const toggle = (id: string) => { if (done.includes(id)) { setDone(done.filter((item) => item !== id)); return; } const day = localDateKey(); setDone([...done, id]); setCompletionDays((days) => { const next = days.includes(day) ? days : [...days, day]; setStreak(streakFor(next)); return next; }); };
  const reset = () => { if (window.confirm("Delete your GoodLife.AI data from this browser?")) { try { localStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ } setProfile(null); setDone([]); setCompletionDays([]); setStreak(0); setChat([]); setScreen("today"); } };
  const exportData = () => { if (!profile) return; const blob = new Blob([JSON.stringify({ profile, done, completionDays, streak, chat }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "goodlife-ai-data.json"; link.click(); URL.revokeObjectURL(url); };
  const install = () => { if (!installPrompt) return; void installPrompt.prompt(); void installPrompt.userChoice.finally(() => setInstallPrompt(null)); };
  if (!profile) return <Onboarding onDone={completeOnboarding} />;
  return <div className="app-shell"><Nav screen={screen} setScreen={setScreen} onReset={reset} /><div className="main-column"><Header profile={profile} screen={screen} />{screen === "today" && <Today profile={profile} done={done} toggle={toggle} streak={streak} setScreen={setScreen} />}{screen === "coach" && <Coach profile={profile} chat={chat} setChat={setChat} />}{screen === "library" && <Library />}{screen === "settings" && <Settings profile={profile} onExport={exportData} onReset={reset} onInstall={installPrompt ? install : undefined} />}</div></div>;
}
