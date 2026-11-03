import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

type DB = NeonHttpDatabase<typeof schema>;

let instance: DB | null = null;

function init(): DB {
	if (instance) return instance;
	if (!env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set. Run `vercel env pull` or set it in .env');
	}
	// Neon HTTP driver: one round-trip per query, ideal for serverless functions.
	instance = drizzle(neon(env.DATABASE_URL), { schema });
	return instance;
}

// Lazy proxy so merely importing `db` never throws at build/analyse time; the
// connection is created (and DATABASE_URL required) on first actual query.
export const db = new Proxy({} as DB, {
	get(_target, prop, receiver) {
		const real = init();
		const value = Reflect.get(real as object, prop, receiver);
		return typeof value === 'function' ? value.bind(real) : value;
	}
});

export { schema };
