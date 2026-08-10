"use client";

import { Dandelion, Icon, type IconName } from "@/components/marks";
import type { Conversation, RecentDay } from "@/lib/storage";

export type Screen = "today" | "week" | "year" | "habits" | "ideas" | "data" | "settings";

/* Desktop and mobile now offer the same destinations. The rail used to omit
 * Week, which left the screen reachable only by clicking a past day. */
const NAV: { id: Screen; label: string }[] = [
  { id: "today", label: "Your day" },
  { id: "week", label: "Your week" },
  { id: "year", label: "Your year" },
  { id: "habits", label: "Habits" },
  { id: "ideas", label: "Ideas" },
  { id: "data", label: "Your Data" },
  { id: "settings", label: "Settings" },
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

export function Rail({ screen, setScreen, days, streak, conversations = [], activeConversationId, onOpenDay, onOpenConversation, onNewConversation }: {
  screen: Screen;
  setScreen: (next: Screen) => void;
  days: RecentDay[];
  streak: number;
  onOpenDay: (key: string) => void;
  conversations?: Conversation[];
  activeConversationId?: string;
  onOpenConversation?: (id: string) => void;
  onNewConversation: () => void;
}) {
  return (
    <aside className="rail">
      <div className="rail-brand">
        <span className="rail-brand-mark"><Dandelion size={20} strokeWidth={1.4} /></span>
        <span className="rail-wordmark">goodlife<span>.ai</span></span>
      </div>
      <button type="button" className="btn rail-new" onClick={onNewConversation}>
        <Icon name="plus" size={15} /> New conversation
      </button>

      <div className="rail-label">Your days</div>
      <div className="rail-list">
        {days.slice(0, RAIL_DAYS).map((day) => (
          <div key={day.key} className="rail-day-group">
            <button
              type="button"
              className={`rail-row rail-day ${day.isToday && screen === "today" ? "is-active" : ""}`}
              onClick={() => (day.isToday ? setScreen("today") : onOpenDay(day.key))}
            >
              {day.label}
              <span className={`rail-count ${day.done ? "" : "is-skipped"}`}>{day.done ? `${day.done}/${day.served}` : "skipped"}</span>
            </button>
            {conversations.filter((conversation) => conversation.date === day.key).map((conversation) => (
              <button key={conversation.id} type="button" className={`rail-row rail-conversation ${conversation.id === activeConversationId ? "is-active" : ""}`} onClick={() => onOpenConversation?.(conversation.id)}>
                <span aria-hidden="true">•</span>
                <span>{conversation.title || "Conversation"}</span>
              </button>
            ))}
          </div>
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

export function AccountButton({ label = "Account", onClick, onSignOut, menuOpen, onToggleMenu }: { label?: string; onClick?: () => void; onSignOut?: () => void; menuOpen?: boolean; onToggleMenu?: () => void }) {
  const toggle = onToggleMenu ?? onClick;
  return (
    <div className="account-wrap">
      <button type="button" className="account-button" onClick={toggle} aria-haspopup="menu" aria-expanded={menuOpen ?? false}>
        <span className="screen-avatar" aria-hidden="true"><Icon name="user" size={14} /></span>
        <span>{label}</span>
      </button>
      {menuOpen && (
        <div className="account-menu" role="menu">
          <button type="button" role="menuitem" onClick={onClick}>Account settings</button>
          {onSignOut && <button type="button" role="menuitem" onClick={onSignOut}>Sign out</button>}
        </div>
      )}
    </div>
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
