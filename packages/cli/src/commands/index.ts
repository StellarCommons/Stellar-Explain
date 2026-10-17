// Fix: wire up or remove unused CLI modules (#1332)
// Previously imported but never registered: truncate, addressDisplay,
// networks, cacheTtl, noCacheFlag, history.
// Removed unused imports; only registered commands remain.

export { txCommand } from './tx';
export { accountCommand } from './account';
export { healthCommand } from './health';
export { batchCommand } from './batch';
// TODO: implement and re-add: cache, version, history commands
