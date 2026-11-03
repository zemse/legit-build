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
