<script lang="ts">
	import { onMount } from 'svelte';
	import { clearActive, loadActive } from '$lib/active-session';

	// Top-right pill linking to the active session, shown only once that session
	// has at least one submitted result. Checked on load; stale sessions are cleared.
	let uuid = $state<string | null>(null);
	let results = $state(0);

	onMount(async () => {
		const a = loadActive();
		if (!a) return;
		try {
			const res = await fetch(`/api/sessions/${a.uuid}`);
			if (res.status === 404) {
				clearActive();
				return;
			}
			if (!res.ok) return;
			const s = (await res.json()) as { state: string; results: unknown[] };
			if (s.state === 'expired' || s.state === 'abandoned') {
				clearActive();
				return;
			}
			if (Array.isArray(s.results) && s.results.length > 0) {
				uuid = a.uuid;
				results = s.results.length;
			}
		} catch {
			/* ignore */
		}
	});
</script>

{#if uuid && results > 0}
	<a
		href={`/attest/${uuid}`}
		class="flex items-center gap-1.5 rounded-full border border-emerald-700/60 bg-emerald-950/40 px-2.5 py-1 text-xs text-emerald-300 transition hover:bg-emerald-900/40"
		title="Your session has new build results to review and sign"
	>
		<span class="relative flex h-1.5 w-1.5">
			<span
				class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
			></span>
			<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
		</span>
		{results} result{results === 1 ? '' : 's'}
	</a>
{/if}
