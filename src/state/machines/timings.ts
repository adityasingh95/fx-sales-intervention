// Tunable timing constants for the SI / RFS state machines.
// Object form (not `export const`) so tests can do
// `timings.ackDelayMs = 0` to make `*Sent → *` transitions synchronous.
// See docs/03-trade-state-model.md §7.
export const timings = {
  ackDelayMs: 250,
};
