// Seed/refresh the projects table. Standalone (no SvelteKit aliases): run with `pnpm db:seed`.
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { PROJECTS, seedId } from '../src/lib/projects-seed.ts';
import { projects } from '../src/lib/server/db/schema.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = drizzle(neon(url));

const rows = PROJECTS.map((p) => ({
	id: seedId(p),
	forge: p.forge,
	owner: p.owner,
	repo: p.repo,
	name: p.name,
	layer: p.layer ?? null,
	lang: p.lang ?? null
}));

await db
	.insert(projects)
	.values(rows)
	.onConflictDoUpdate({
		target: projects.id,
		set: {
			forge: sql`excluded.forge`,
			owner: sql`excluded.owner`,
			repo: sql`excluded.repo`,
			name: sql`excluded.name`,
			layer: sql`excluded.layer`,
			lang: sql`excluded.lang`
		}
	});

console.log(`Seeded ${rows.length} projects.`);
process.exit(0);
