// Register the batch off-chain schema (spec §9) on Base Sepolia.
// Run once: `pnpm eas:register`. Prints the schema UID -> set PUBLIC_EAS_SCHEMA_UID.
import { SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';

const BATCH_SCHEMA =
	'string[] client,string[] version,string[] osArch,bytes32[] artifactHash,bytes32[] sourceCommit,bytes32[] recipeHash,bytes32[] toolchainHash';

const SCHEMA_REGISTRY = '0x4200000000000000000000000000000000000020'; // Base Sepolia
const RPC = process.env.EAS_RPC_URL ?? 'https://sepolia.base.org';

const pk = process.env.EAS_ISSUER_PRIVATE_KEY;
if (!pk) throw new Error('EAS_ISSUER_PRIVATE_KEY is not set');

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(pk, provider);

const registry = new SchemaRegistry(SCHEMA_REGISTRY);
registry.connect(signer);

console.log('Registering schema from', await signer.getAddress());
console.log('Schema:', BATCH_SCHEMA);

const tx = await registry.register({
	schema: BATCH_SCHEMA,
	resolverAddress: ethers.ZeroAddress,
	revocable: true
});

const uid = await tx.wait();
console.log('\nSchema UID:', uid);
console.log('Set PUBLIC_EAS_SCHEMA_UID=' + uid + ' in your env.');
process.exit(0);
