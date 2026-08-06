const RAY_TIPS: [number, number][] = [
  [19.2, 11],
  [17.4, 5.8],
  [12, 4],
  [6.6, 5.8],
  [4.8, 11],
];

/** The brand mark. It replaces the old asterisk and appears in the rail, the
 *  coach avatars, both phone headers and the site nav. */
export function Dandelion({ size = 20, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg className="dandelion" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
      <path d="M12 12c0 4 -0.8 7 -1 10" />
      {RAY_TIPS.map(([x, y]) => <path key={`ray-${x}-${y}`} d={`M12 12 ${x} ${y}`} />)}
      {RAY_TIPS.map(([x, y]) => <circle key={`seed-${x}-${y}`} cx={x} cy={y} r={strokeWidth + 0.1} fill="currentColor" stroke="none" />)}
    </svg>
  );
}

/** Lucide paths at the system's 2.75 stroke width. Inlined so the app shell
 *  still draws when it opens offline. */
const PATHS: Record<string, string[]> = {
  "arrow-up": ["M12 19V5", "m5 12 7-7 7 7"],
  check: ["M20 6 9 17l-5-5"],
  plus: ["M5 12h14", "M12 5v14"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
  sun: ["M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"],
  calendar: ["M8 2v4", "M16 2v4", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M3 10h18"],
  lightbulb: ["M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5", "M9 18h6", "M10 22h4"],
  user: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"],
  trash: ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
