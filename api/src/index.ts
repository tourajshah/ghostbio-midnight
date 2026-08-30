import { ledger, type Ledger, type Contract } from '@midnight-ntwrk/bboard-contract';
import { type FinalizedCallTxData } from '@midnight-ntwrk/midnight-js-contracts';
import {
  type GhostCardContract,
  type GhostCardProviders,
  type ProfileState,
} from './common-types.js';

export * from './common-types.js';

/**
 * Enterprise API client for GhostCard zero-knowledge profile interactions on Midnight.
 */
export class GhostCardAPI {
  constructor(
    public readonly contract: GhostCardContract,
    private readonly providers: GhostCardProviders
  ) { }

  /**
   * Reads public ledger state directly from the Midnight network indexer.
   */
  async getProfileState(): Promise<ProfileState | null> {
    const contractAddress = (
      'contractAddress' in this.contract
        ? this.contract.contractAddress
        : this.contract.deployTxData.public.contractAddress
    ) as string;

    if (!contractAddress) return null;

    const state = await this.providers.publicDataProvider.queryContractState(contractAddress);
    if (!state?.data) return null;

    const ledgerState: Ledger = ledger(state.data);
    return {
      isAcceptingIntros: ledgerState.isAcceptingIntros,
      requiredBadgeHash: ledgerState.requiredBadgeHash,
      ownerHash: ledgerState.ownerHash,
    };
  }

  /**
   * Owner: Toggle intro request availability on-chain using ZK owner authorization.
   */
  async toggleAccepting(
    ownerSecret: Uint8Array,
    newState: boolean
  ): Promise<FinalizedCallTxData<Contract, 'toggleAccepting'>> {
    return await this.contract.callTx.toggleAccepting(ownerSecret, newState);
  }

  /**
   * Owner: Update event badge hash commitment on-chain using ZK owner authorization.
   */
  async setRequiredBadgeHash(
    ownerSecret: Uint8Array,
    newHash: Uint8Array
  ): Promise<FinalizedCallTxData<Contract, 'setRequiredBadgeHash'>> {
    return await this.contract.callTx.setRequiredBadgeHash(ownerSecret, newHash);
  }

  /**
   * Visitor: Prove valid event badge ownership in ZK without exposing key or identity.
   */
  async verifyAccess(
    visitorSecret: Uint8Array
  ): Promise<FinalizedCallTxData<Contract, 'verifyAccess'>> {
    return await this.contract.callTx.verifyAccess(visitorSecret);
  }
}