import { type Contract } from '@midnight-ntwrk/bboard-contract';
import { type DeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

export type GhostCardContract = DeployedContract<Contract> | FoundContract<Contract>;

export type GhostCardCircuitKeys = 'toggleAccepting' | 'setRequiredBadgeHash' | 'verifyAccess';

export type GhostCardProviders = MidnightProviders<GhostCardCircuitKeys>;

export interface ProfileState {
  isAcceptingIntros: boolean;
  requiredBadgeHash: Uint8Array;
  ownerHash: Uint8Array;
}
