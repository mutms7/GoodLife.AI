"use client";

import { Dandelion, Icon, type IconName } from "@/components/marks";
import type { RecentDay } from "@/lib/storage";

export type Screen = "today" | "week" | "onboard" | "ideas" | "data";

/* Desktop and mobile now offer the same destinations. The rail used to omit
 * Week, which left the screen reachable only by clicking a past day. */
const NAV: { id: Screen; label: string }[] = [
  { id: "today", label: "Today's thread" },
  { id: "week", label: "Your week" },
  { id: "ideas", label: "Ideas" },
  { id: "data", label: "Your data" },
  { id: "onboard", label: "First run" },
];

const TABS: { id: Screen; label: string; icon: IconName }[] = [
  { id: "today", label: "Today", icon: "sun" },
  { id: "week", label: "Week", icon: "calendar" },
  { id: "ideas", label: "Ideas", icon: "lightbulb" },
  { id: "data", label: "You", icon: "user" },
];

/** The rail lists four days to stay inside the viewport. The Week screen shows
 *  all seven. */
const RAIL_DAYS = 4;

export function Rail({ screen, setScreen, days, streak, onOpenDay, onNewConversation, clearArmed }: {
  screen: Screen;
  setScreen: (next: Screen) => void;
  days: RecentDay[];
  streak: number;
  onOpenDay: (key: string) => void;
  onNewConversation: () => void;
  clearArmed: boolean;
}) {
  return (
    <aside className="rail">
      <div className="rail-brand">
        <span className="rail-brand-mark"><Dandelion size={20} strokeWidth={1.4} /></span>
        <span className="rail-wordmark">goodlife<span>.ai</span></span>
      </div>
      <button type="button" className={`btn rail-new ${clearArmed ? "is-armed" : ""}`} onClick={onNewConversation}>
        <Icon name="plus" size={15} /> {clearArmed ? "Clear the thread?" : "New conversation"}
      </button>

      <div className="rail-label">Your days</div>
      <div className="rail-list">
        {days.slice(0, RAIL_DAYS).map((day) => (
          <button
            key={day.key}
            type="button"
            className={`rail-row rail-day ${day.isToday && screen === "today" ? "is-active" : ""}`}
            onClick={() => (day.isToday ? setScreen("today") : onOpenDay(day.key))}
          >
            {day.label}
            <span className={`rail-count ${day.done ? "" : "is-skipped"}`}>{day.done ? `${day.done}/${day.served}` : "skipped"}</span>
          </button>
        ))}
      </div>

      <div className="rail-divider" />
      <nav className="rail-list">
        {NAV.map((item) => (
          <button key={item.id} type="button" className={`rail-row ${screen === item.id ? "is-active" : ""}`} onClick={() => setScreen(item.id)} aria-current={screen === item.id ? "page" : undefined}>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="rail-bottom">
        <div className="rail-streak">
          <strong>{streak} {streak === 1 ? "day" : "days"} back</strong>
          <span>A returning streak, not a score.</span>
        </div>
        <div className="rail-privacy"><i />Private and local</div>
      </div>
    </aside>
  );
}

export function MobileHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <header className="mobile-header">
      <div className="mobile-brand">
        <span className="mobile-brand-mark"><Dandelion size={17} strokeWidth={1.5} /></span>
        <strong>{title}</strong>
      </div>
      <span className="mobile-meta">{meta}</span>
    </header>
  );
}

export function TabBar({ screen, setScreen }: { screen: Screen; setScreen: (next: Screen) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <button key={tab.id} type="button" className={screen === tab.id ? "is-active" : ""} onClick={() => setScreen(tab.id)} aria-current={screen === tab.id ? "page" : undefined}>
          <Icon name={tab.icon} size={18} />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
