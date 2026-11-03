import { env } from '$env/dynamic/private';

const GH = 'https://api.github.com';

function headers() {
	const h: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'legit.build-release-poller'
	};
	if (env.GITHUB_TOKEN) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
	return h;
}

interface GhAsset {
	name: string;
}
interface GhRelease {
	tag_name: string;
	name: string | null;
	html_url: string;
	prerelease: boolean;
	draft: boolean;
	published_at: string | null;
	assets: GhAsset[];
}

export interface PolledRelease {
	tag: string;
	name: string | null;
	url: string;
	prerelease: boolean;
	publishedAt: string | null;
	platforms: string[];
	commit: string | null;
}

// Heuristic os/arch extraction from release asset filenames.
const OS_TOKENS = ['linux', 'darwin', 'macos', 'windows', 'win'];
const ARCH_TOKENS = ['amd64', 'x86_64', 'x64', 'arm64', 'aarch64', 'armv7', '386'];

function platformsFromAssets(assets: GhAsset[]): string[] {
	const set = new Set<string>();
	for (const a of assets) {
		const n = a.name.toLowerCase();
		const os = OS_TOKENS.find((t) => n.includes(t));
		const arch = ARCH_TOKENS.find((t) => n.includes(t));
		if (os && arch) set.add(`${normOs(os)}/${normArch(arch)}`);
	}
	return [...set].sort();
}

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

async function resolveTagCommit(repo: string, tag: string): Promise<string | null> {
	// Annotated tags need one extra dereference; lightweight tags point straight at a commit.
	const refRes = await fetch(`${GH}/repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`, {
		headers: headers()
	});
	if (!refRes.ok) return null;
	const ref = (await refRes.json()) as { object: { sha: string; type: string } };
	if (ref.object.type === 'commit') return ref.object.sha;
	if (ref.object.type === 'tag') {
		const tagRes = await fetch(`${GH}/repos/${repo}/git/tags/${ref.object.sha}`, {
			headers: headers()
		});
		if (!tagRes.ok) return ref.object.sha;
		const annotated = (await tagRes.json()) as { object: { sha: string } };
		return annotated.object.sha;
	}
	return ref.object.sha;
}

/** Fetch the most recent `limit` published releases for a repo, newest first. */
export async function pollReleases(repo: string, limit = 8): Promise<PolledRelease[]> {
	const res = await fetch(`${GH}/repos/${repo}/releases?per_page=${limit}`, { headers: headers() });
	if (!res.ok) throw new Error(`GitHub releases ${repo}: ${res.status} ${await res.text()}`);
	const raw = (await res.json()) as GhRelease[];

	const out: PolledRelease[] = [];
	for (const r of raw) {
		if (r.draft) continue;
		const commit = await resolveTagCommit(repo, r.tag_name);
		out.push({
			tag: r.tag_name,
			name: r.name,
			url: r.html_url,
			prerelease: r.prerelease,
			publishedAt: r.published_at,
			platforms: platformsFromAssets(r.assets),
			commit
		});
	}
	return out;
}
