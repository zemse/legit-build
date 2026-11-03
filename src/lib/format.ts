import type { Identity } from './types';

export function shortHash(h: string, head = 8, tail = 6): string {
	const clean = h.replace(/^0x/, '').replace(/^sha256:/, '');
	if (clean.length <= head + tail) return clean;
	return `${clean.slice(0, head)}…${clean.slice(-tail)}`;
}

export function shortAddr(a: string): string {
	return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function identityLabel(id: Identity): string {
	if (id.kind === 'twitter') return `@${id.handle}`;
	return id.ens || shortAddr(id.address);
}

export function timeAgo(iso: string | Date): string {
	const d = Date.now() - new Date(iso).getTime();
	const s = Math.floor(d / 1000);
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}
