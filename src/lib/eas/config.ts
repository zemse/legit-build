import { env as pub } from '$env/dynamic/public';

// Base Sepolia defaults (EAS v1.2.0). Override via PUBLIC_* env for another chain.
export const EAS_CHAIN_ID = Number(pub.PUBLIC_EAS_CHAIN_ID ?? '84532');
export const EAS_CONTRACT = pub.PUBLIC_EAS_CONTRACT ?? '0x4200000000000000000000000000000000000021';
export const SCHEMA_REGISTRY = '0x4200000000000000000000000000000000000020';
export const EAS_SCHEMA_UID = pub.PUBLIC_EAS_SCHEMA_UID ?? '';
export const EASSCAN_GRAPHQL =
	pub.PUBLIC_EASSCAN_GRAPHQL ?? 'https://base-sepolia.easscan.org/graphql';
