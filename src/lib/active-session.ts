// One active session per browser, persisted across refreshes and revisits.
// localStorage (not sessionStorage) so the uuid is stable for the same user.
// The uploadToken is the agent's; keeping it here matches spec §7 (creating
// browser only). All access is guarded so private-mode / blocked storage never throws.
const KEY = 'lb_active_session';

export interface ActiveSession {
	uuid: string;
	uploadToken: string;
}

export function loadActive(): ActiveSession | null {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as ActiveSession) : null;
	} catch {
		return null;
	}
}

export function saveActive(a: ActiveSession): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(a));
	} catch {
		/* ignore */
	}
}

export function clearActive(): void {
	try {
		localStorage.removeItem(KEY);
	} catch {
		/* ignore */
	}
}

// Reuse the persisted session if the server still has it and it hasn't ended,
// otherwise provision one global session (all pinned projects) and persist it.
// Shared by the contribute box and the popup so a browser keeps one stable uuid.
export async function ensureSession(): Promise<ActiveSession> {
	const existing = loadActive();
	if (existing) {
		const check = await fetch(`/api/sessions/${existing.uuid}`);
		if (check.ok) {
			const s = (await check.json()) as { state: string };
			if (s.state !== 'expired' && s.state !== 'abandoned') return existing;
		}
		if (check.status === 404) clearActive();
	}

	const res = await fetch('/api/sessions', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({})
	});
	if (!res.ok) throw new Error(await res.text());
	const s = (await res.json()) as { uuid: string; uploadToken: string };
	const active = { uuid: s.uuid, uploadToken: s.uploadToken };
	saveActive(active);
	return active;
}

export function contributeLine(uuid: string): string {
	return `${location.origin}/contribute uuid=${uuid}`;
}

// A context-specific build instruction to append under the contribute line, scoping
// the (global) session to one project/version and the native target. Empty when no
// project context (the home box), so that copy stays the bare line.
export function buildInstruction(o: {
	projectName?: string;
	project?: string;
	version?: string;
}): string {
	if (!o.project) return '';
	const who = o.projectName ? `${o.projectName} (${o.project})` : o.project;
	return o.version
		? `build ${o.version} of ${who} only, for the native target`
		: `build the latest stable release of ${who} only, for the native target`;
}
