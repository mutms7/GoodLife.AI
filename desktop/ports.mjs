export const DEFAULT_PORT = 47823;

/** Keep the same localhost origin whenever possible so localStorage and the
 * model cache survive upgrades. If another application owns that port, try a
 * saved fallback first and then a small deterministic range. */
export function portCandidates(savedPort) {
  const saved = Number(savedPort);
  const validSaved = Number.isSafeInteger(saved) && saved >= 1024 && saved <= 65535 ? saved : null;
  return [...new Set([
    validSaved,
    DEFAULT_PORT,
    ...Array.from({ length: 10 }, (_, index) => DEFAULT_PORT + index + 1),
  ].filter((port) => port !== null))];
}
