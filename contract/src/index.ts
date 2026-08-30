import { Contract, ledger, type Ledger } from './managed/bboard/contract/index.js';

// No custom witness functions required for GhostCard circuits
export const witnesses = {};

export { Contract, ledger, type Ledger };
export * from './managed/bboard/contract/index.js';