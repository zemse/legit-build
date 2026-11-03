// Seed set of tracked Ethereum clients (spec §4, from the build audit [05]).
// Execution + consensus layer. Extend by adding rows here and re-running `pnpm db:seed`.

export interface ClientSeed {
	id: string;
	name: string;
	repo: string; // GitHub owner/name
	layer: 'execution' | 'consensus';
	lang: string;
}

export const CLIENTS: ClientSeed[] = [
	// Execution layer
	{ id: 'geth', name: 'Geth', repo: 'ethereum/go-ethereum', layer: 'execution', lang: 'Go' },
	{
		id: 'nethermind',
		name: 'Nethermind',
		repo: 'NethermindEth/nethermind',
		layer: 'execution',
		lang: 'C#'
	},
	{ id: 'besu', name: 'Besu', repo: 'hyperledger/besu', layer: 'execution', lang: 'Java' },
	{ id: 'erigon', name: 'Erigon', repo: 'erigontech/erigon', layer: 'execution', lang: 'Go' },
	{ id: 'reth', name: 'Reth', repo: 'paradigmxyz/reth', layer: 'execution', lang: 'Rust' },

	// Consensus layer
	{
		id: 'lighthouse',
		name: 'Lighthouse',
		repo: 'sigp/lighthouse',
		layer: 'consensus',
		lang: 'Rust'
	},
	{ id: 'prysm', name: 'Prysm', repo: 'prysmaticlabs/prysm', layer: 'consensus', lang: 'Go' },
	{ id: 'teku', name: 'Teku', repo: 'Consensys/teku', layer: 'consensus', lang: 'Java' },
	{
		id: 'nimbus',
		name: 'Nimbus',
		repo: 'status-im/nimbus-eth2',
		layer: 'consensus',
		lang: 'Nim'
	},
	{
		id: 'lodestar',
		name: 'Lodestar',
		repo: 'ChainSafe/lodestar',
		layer: 'consensus',
		lang: 'TypeScript'
	},
	{
		id: 'grandine',
		name: 'Grandine',
		repo: 'grandinetech/grandine',
		layer: 'consensus',
		lang: 'Rust'
	}
];
