import { and, eq, inArray, like, ne, sql } from 'drizzle-orm';
import { env as pub } from '$env/dynamic/public';
import { db } from './db';
import { attestations, projects } from './db/schema';
import { releaseHref } from '$lib/format';

/**
 * The public X post a builder makes to announce their attestation. It is written for
 * their followers (what was rebuilt, the hashes, where to compare), and the short
 * hashes in it are what bind the post to the attestation when we verify it.
 */

const HASH_CHARS = 12;
const MAX_WEIGHT = 280;
const URL_WEIGHT = 23; // X counts every link as 23 characters

export function postHash(artifactHash: string): string {
	return artifactHash
		.replace(/^0x/, '')
		.replace(/^sha256:/, '')
		.slice(0, HASH_CHARS)
		.toLowerCase();
}

export interface ProofSubject {
	project: string;
	version: string;
	osArch: string;
	artifactHash: string;
	attester: string;
}

export interface ComposedPost {
	text: string;
	hashes: string[]; // short hashes included in the text; all must appear in the post
	intentUrl: string;
}

function weight(text: string): number {
	let w = 0;
	for (const ch of text.replace(/https?:\/\/\S+/g, '')) w += ch.codePointAt(0)! > 0x2fff ? 2 : 1;
	return w + (text.match(/https?:\/\/\S+/g)?.length ?? 0) * URL_WEIGHT;
}

/** Rows of one attestation batch, identified by its uid prefix. */
export async function getBatch(uid: string) {
	return db
		.select()
		.from(attestations)
		.where(like(attestations.id, `${uid.replace(/[%_]/g, '\\$&')}#%`))
		.orderBy(attestations.id);
}

/** How many other attesters reported the same hash for the same release and target. */
async function agreeing(s: ProofSubject): Promise<number> {
	const [r] = await db
		.select({ n: sql<number>`count(distinct ${attestations.attester})::int` })
		.from(attestations)
		.where(
			and(
				eq(attestations.project, s.project),
				eq(attestations.version, s.version),
				eq(attestations.osArch, s.osArch),
				eq(attestations.artifactHash, s.artifactHash),
				ne(attestations.attester, s.attester)
			)
		);
	return r?.n ?? 0;
}

export async function composePost(subjects: ProofSubject[], handle: string): Promise<ComposedPost> {
	const base = pub.PUBLIC_BASE_URL || 'https://legit.build';
	const ids = [...new Set(subjects.map((s) => s.project))];
	const names = new Map(
		(
			await db
				.select({ id: projects.id, name: projects.name, repo: projects.repo })
				.from(projects)
				.where(inArray(projects.id, ids.length ? ids : ['']))
		).map((p) => [p.id, p.name || p.repo])
	);
	const name = (s: ProofSubject) => names.get(s.project) ?? s.project.split('/').pop()!;

	let text: string;
	let included: ProofSubject[];

	if (subjects.length === 1) {
		const s = subjects[0];
		const n = await agreeing(s);
		const match =
			n > 0
				? `It matches ${n} other independent build${n === 1 ? '' : 's'}.`
				: `I'm the first to publish this hash. Rebuild it and check.`;
		text =
			`I rebuilt ${name(s)} ${s.version} from source on my own machine.\n\n` +
			`${s.osArch} binary sha256: ${postHash(s.artifactHash)}…\n${match}\n\n` +
			`Don't trust release binaries, verify them 👇\n` +
			`${base}${releaseHref(s.project, s.version)}`;
		included = [s];
	} else {
		const head = `I rebuilt ${subjects.length} clients from source on my own machine. Binary sha256:\n\n`;
		const tail = `\n\nDon't trust release binaries, verify them. Compare with other builders 👇\n${base}/x/${handle}`;
		const lines = subjects.map((s) => `${name(s)} ${s.version} → ${postHash(s.artifactHash)}`);
		let k = lines.length;
		const build = (k: number) =>
			head +
			lines.slice(0, k).join('\n') +
			(k < lines.length ? `\n+${lines.length - k} more` : '') +
			tail;
		while (k > 1 && weight(build(k)) > MAX_WEIGHT) k--;
		text = build(k);
		included = subjects.slice(0, k);
	}

	return {
		text,
		hashes: included.map((s) => postHash(s.artifactHash)),
		intentUrl: `https://x.com/intent/post?${new URLSearchParams({ text })}`
	};
}

/** A post proves the batch when its author is the attester and it carries every hash we asked for. */
export function postProves(
	post: { authorId: string; text: string },
	userId: string,
	hashes: string[]
): boolean {
	if (post.authorId !== userId) return false;
	const t = post.text.toLowerCase();
	return hashes.length > 0 && hashes.every((h) => t.includes(h));
}
