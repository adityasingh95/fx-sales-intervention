// Tunable timing constants for the SI / RFS state machines.
// Object form (not `export const`) so tests can do
// `timings.ackDelayMs = 0` to make `*Sent → *` transitions synchronous.
// See docs/03-trade-state-model.md §7.
export const timings = {
  ackDelayMs: 250,
  // 5-second blotter removal rule per docs/02 §Active Blotter +
  // docs/03 §7. Every terminal SI state stays visible for this long
  // before the row unmounts.
  removalDelayMs: 5000,
};
