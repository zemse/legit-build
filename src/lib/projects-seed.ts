// Seed set of tracked projects (spec §4, from the build audit [05]). Identity is
// forge-qualified so new repos (on GitHub or GitLab) can be added by appending
// rows here and re-running `pnpm db:seed`.

export interface ProjectSeed {
	forge: 'github' | 'gitlab';
	owner: string;
	repo: string;
	name: string;
	layer?: 'execution' | 'consensus';
	lang?: string;
}

export function seedId(p: ProjectSeed): string {
	return `${p.forge}/${p.owner}/${p.repo}`;
}

export const PROJECTS: ProjectSeed[] = [
	// Execution layer
	{
		forge: 'github',
		owner: 'ethereum',
		repo: 'go-ethereum',
		name: 'Geth',
		layer: 'execution',
		lang: 'Go'
	},
	{
		forge: 'github',
		owner: 'NethermindEth',
		repo: 'nethermind',
		name: 'Nethermind',
		layer: 'execution',
		lang: 'C#'
	},
	{
		forge: 'github',
		owner: 'hyperledger',
		repo: 'besu',
		name: 'Besu',
		layer: 'execution',
		lang: 'Java'
	},
	{
		forge: 'github',
		owner: 'erigontech',
		repo: 'erigon',
		name: 'Erigon',
		layer: 'execution',
		lang: 'Go'
	},
	{
		forge: 'github',
		owner: 'paradigmxyz',
		repo: 'reth',
		name: 'Reth',
		layer: 'execution',
		lang: 'Rust'
	},

	// Consensus layer
	{
		forge: 'github',
		owner: 'sigp',
		repo: 'lighthouse',
		name: 'Lighthouse',
		layer: 'consensus',
		lang: 'Rust'
	},
	{
		forge: 'github',
		owner: 'prysmaticlabs',
		repo: 'prysm',
		name: 'Prysm',
		layer: 'consensus',
		lang: 'Go'
	},
	{
		forge: 'github',
		owner: 'Consensys',
		repo: 'teku',
		name: 'Teku',
		layer: 'consensus',
		lang: 'Java'
	},
	{
		forge: 'github',
		owner: 'status-im',
		repo: 'nimbus-eth2',
		name: 'Nimbus',
		layer: 'consensus',
		lang: 'Nim'
	},
	{
		forge: 'github',
		owner: 'ChainSafe',
		repo: 'lodestar',
		name: 'Lodestar',
		layer: 'consensus',
		lang: 'TypeScript'
	},
	{
		forge: 'github',
		owner: 'grandinetech',
		repo: 'grandine',
		name: 'Grandine',
		layer: 'consensus',
		lang: 'Rust'
	}
];
