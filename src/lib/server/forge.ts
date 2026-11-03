import { env } from '$env/dynamic/private';

// Forge-agnostic release polling. A project id is `<forge>/<owner>/<repo>`;
// owner may itself contain slashes (gitlab subgroups). Add a forge by
// implementing pollX and wiring it into pollReleases().

export interface PolledRelease {
	tag: string;
	name: string | null;
	url: string;
	prerelease: boolean;
	publishedAt: string | null;
	platforms: string[];
	commit: string | null;
}

export interface ProjectRef {
	forge: string; // 'github' | 'gitlab'
	owner: string;
	repo: string;
}

/** Parse a project id `<forge>/<owner...>/<repo>` into its parts. */
export function parseProjectId(id: string): ProjectRef | null {
	const parts = id.split('/').filter(Boolean);
	if (parts.length < 3) return null;
	const [forge, ...rest] = parts;
	const repo = rest.pop()!;
	return { forge, owner: rest.join('/'), repo };
}

export function projectId(ref: ProjectRef): string {
	return `${ref.forge}/${ref.owner}/${ref.repo}`;
}

// ---- platform inference (shared) ----

const OS_TOKENS = ['linux', 'darwin', 'macos', 'windows', 'win'];
const ARCH_TOKENS = ['amd64', 'x86_64', 'x64', 'arm64', 'aarch64', 'armv7', '386'];

function normOs(os: string) {
	if (os === 'macos') return 'darwin';
	if (os === 'win') return 'windows';
	return os;
}
function normArch(arch: string) {
	if (arch === 'x86_64' || arch === 'x64') return 'amd64';
	if (arch === 'aarch64') return 'arm64';
	return arch;
}
function platformsFromNames(names: string[]): string[] {
	const set = new Set<string>();
	for (const raw of names) {
		const n = raw.toLowerCase();
		const os = OS_TOKENS.find((t) => n.includes(t));
		const arch = ARCH_TOKENS.find((t) => n.includes(t));
		if (os && arch) set.add(`${normOs(os)}/${normArch(arch)}`);
	}
	return [...set].sort();
}

// ---- GitHub ----

const GH = 'https://api.github.com';
function ghHeaders() {
	const h: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'legit.build-release-poller'
	};
	if (env.GITHUB_TOKEN) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
	return h;
}

interface GhRelease {
	tag_name: string;
	name: string | null;
	html_url: string;
	prerelease: boolean;
	draft: boolean;
	published_at: string | null;
	assets: { name: string }[];
}

async function ghResolveCommit(ref: ProjectRef, tag: string): Promise<string | null> {
	const repo = `${ref.owner}/${ref.repo}`;
	const res = await fetch(`${GH}/repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`, {
		headers: ghHeaders()
	});
	if (!res.ok) return null;
	const r = (await res.json()) as { object: { sha: string; type: string } };
	if (r.object.type === 'commit') return r.object.sha;
	if (r.object.type === 'tag') {
		const t = await fetch(`${GH}/repos/${repo}/git/tags/${r.object.sha}`, { headers: ghHeaders() });
		if (!t.ok) return r.object.sha;
		return ((await t.json()) as { object: { sha: string } }).object.sha;
	}
	return r.object.sha;
}

async function pollGithub(ref: ProjectRef, limit: number): Promise<PolledRelease[]> {
	const repo = `${ref.owner}/${ref.repo}`;
	const perPage = Math.min(limit, 100);
	const res = await fetch(`${GH}/repos/${repo}/releases?per_page=${perPage}`, {
		headers: ghHeaders()
	});
	if (!res.ok) throw new Error(`GitHub releases ${repo}: ${res.status}`);
	const raw = (await res.json()) as GhRelease[];
	// Commit is resolved lazily (ghResolveCommit) when a release is first viewed,
	// so the cron stays one request per project even across deep history.
	return raw
		.filter((r) => !r.draft)
		.map((r) => ({
			tag: r.tag_name,
			name: r.name,
			url: r.html_url,
			prerelease: r.prerelease,
			publishedAt: r.published_at,
			platforms: platformsFromNames(r.assets.map((a) => a.name)),
			commit: null
		}));
}

// ---- GitLab ----

const GL = 'https://gitlab.com/api/v4';
function glHeaders() {
	const h: Record<string, string> = { 'User-Agent': 'legit.build-release-poller' };
	if (env.GITLAB_TOKEN) h['PRIVATE-TOKEN'] = env.GITLAB_TOKEN;
	return h;
}

interface GlRelease {
	tag_name: string;
	name: string | null;
	upcoming_release: boolean;
	released_at: string | null;
	_links?: { self?: string };
	commit?: { id: string };
	assets?: { links?: { name: string }[] };
}

async function pollGitlab(ref: ProjectRef, limit: number): Promise<PolledRelease[]> {
	// GitLab identifies a project by URL-encoded `owner/repo` (subgroups included).
	const encoded = encodeURIComponent(`${ref.owner}/${ref.repo}`);
	const res = await fetch(`${GL}/projects/${encoded}/releases?per_page=${limit}`, {
		headers: glHeaders()
	});
	if (!res.ok) throw new Error(`GitLab releases ${ref.owner}/${ref.repo}: ${res.status}`);
	const raw = (await res.json()) as GlRelease[];
	return raw.map((r) => ({
		tag: r.tag_name,
		name: r.name,
		url: r._links?.self ?? `https://gitlab.com/${ref.owner}/${ref.repo}/-/releases/${r.tag_name}`,
		prerelease: Boolean(r.upcoming_release),
		publishedAt: r.released_at,
		platforms: platformsFromNames((r.assets?.links ?? []).map((l) => l.name)),
		commit: r.commit?.id ?? null // GitLab returns the tagged commit inline
	}));
}

/** Poll the most recent `limit` releases for a project (full history up to 100), newest first. */
export async function pollReleases(ref: ProjectRef, limit = 100): Promise<PolledRelease[]> {
	switch (ref.forge) {
		case 'github':
			return pollGithub(ref, limit);
		case 'gitlab':
			return pollGitlab(ref, limit);
		default:
			throw new Error(`Unsupported forge: ${ref.forge}`);
	}
}

/** Resolve a tag -> commit sha on demand (GitHub only; GitLab returns it inline). */
export async function resolveCommit(ref: ProjectRef, tag: string): Promise<string | null> {
	if (ref.forge === 'github') return ghResolveCommit(ref, tag);
	return null;
}
