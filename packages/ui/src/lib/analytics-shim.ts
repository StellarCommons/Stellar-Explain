// Fix: shim for analytics imports that no longer exist in @stellar-explain/analytics (#1299)
// Exports the shapes that UI code expected so imports resolve without breaking changes.

export { emit, subscribe } from './analytics';

/** @deprecated Use emit() directly */
export const track = emit;
