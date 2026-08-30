import {
  GhostCardAPI,
  type GhostCardProviders,
  type GhostCardContract,
} from '@midnight-ntwrk/bboard-api';

export type DeployedGhostCardAPI = GhostCardAPI;

export interface BoardDeployment {
  contractAddress: string;
  status: string;
}

export interface DeployedBoardAPIProvider {
  resolve(contract: GhostCardContract): GhostCardAPI;
}

export class BrowserDeployedBoardManager implements DeployedBoardAPIProvider {
  constructor(
    private readonly logger?: any,
    private readonly providers?: GhostCardProviders
  ) { }

  resolve(contract: GhostCardContract): GhostCardAPI {
    return new GhostCardAPI(contract, this.providers as GhostCardProviders);
  }
}