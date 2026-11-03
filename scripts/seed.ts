// Seed/refresh the clients table. Standalone (no SvelteKit aliases): run with `pnpm db:seed`.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { CLIENTS } from '../src/lib/clients-seed.ts';
import { clients } from '../src/lib/server/db/schema.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = drizzle(neon(url));

const rows = CLIENTS.map((c) => ({
	id: c.id,
	name: c.name,
	repo: c.repo,
	layer: c.layer,
	lang: c.lang
}));

await db
	.insert(clients)
	.values(rows)
	.onConflictDoUpdate({
		target: clients.id,
		set: {
			name: clients.name,
			repo: clients.repo,
			layer: clients.layer,
			lang: clients.lang
		}
	});

console.log(`Seeded ${rows.length} clients.`);
process.exit(0);
