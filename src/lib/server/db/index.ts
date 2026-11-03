import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

if (!env.DATABASE_URL) {
	// Fail loudly at import rather than producing confusing runtime errors.
	throw new Error('DATABASE_URL is not set. Run `vercel env pull` or set it in .env');
}

// Neon HTTP driver: one round-trip per query, ideal for serverless functions.
const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export { schema };
