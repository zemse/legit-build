<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { shortHash } from '$lib/format';
	import type { AttestationView, TwitterIdentity } from '$lib/types';

	// "Attested by people you follow" for one release. Loaded client-side (per viewer).
	let { project, tag }: { project: string; tag: string } = $props();

	type Item = AttestationView & { agrees: boolean | null };
	let status = $state<'loading' | 'signed-out' | 'ready' | 'error'>('loading');
	let items = $state<Item[]>([]);
	let viewer = $state('');
	let truncated = $state(false);

	onMount(async () => {
		try {
			const res = await fetch(`/api/x/network?${new URLSearchParams({ project, tag })}`);
			if (res.status === 401) {
				status = 'signed-out';
				return;
			}
			if (!res.ok) throw new Error();
			const d = (await res.json()) as { viewer: string; truncated: boolean; items: Item[] };
			items = d.items;
			viewer = d.viewer;
			truncated = d.truncated;
			status = 'ready';
		} catch {
			status = 'error';
		}
	});

	const handleOf = (i: Item) => (i.identity as TwitterIdentity).handle;
</script>

<section class="mb-6 rounded-xl border border-sky-900/40 bg-sky-950/10 p-4">
	<h2 class="text-sm font-medium text-sky-200">People you follow</h2>
	{#if status === 'loading'}
		<p class="mt-2 text-sm text-zinc-500">Checking who you follow…</p>
	{:else if status === 'signed-out'}
		<p class="mt-2 text-sm text-zinc-400">
			<a
				class="text-sky-300 underline"
				href={`/auth/twitter?returnTo=${encodeURIComponent(page.url.pathname)}`}>Sign in with X</a
			> to see which of these builds were attested by people you follow.
		</p>
	{:else if status === 'error'}
		<p class="mt-2 text-sm text-zinc-500">Couldn't load your network right now.</p>
	{:else if items.length === 0}
		<p class="mt-2 text-sm text-zinc-500">Nobody you follow has attested this release yet.</p>
	{:else}
		<div class="mt-3 space-y-2">
			{#each items as i (i.id)}
				<div
					class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900/60 px-3 py-2"
				>
					<div class="flex items-center gap-3">
						<a class="text-sky-300 hover:text-sky-200" href={`/x/${handleOf(i)}`}
							>@{handleOf(i)}{handleOf(i) === viewer ? ' (you)' : ''}</a
						>
						<span class="mono text-xs text-zinc-500">{i.osArch}</span>
						{#if i.proofTweetId}
							<a
								class="text-xs text-zinc-500 underline hover:text-zinc-300"
								href={`https://x.com/${handleOf(i)}/status/${i.proofTweetId}`}
								target="_blank"
								rel="noopener">post</a
							>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<span class="mono text-sm {i.agrees === false ? 'text-red-300' : 'text-emerald-300'}"
							>{shortHash(i.artifactHash)}</span
						>
						{#if i.agrees === true}
							<span class="text-xs text-emerald-400">matches majority</span>
						{:else if i.agrees === false}
							<span class="text-xs text-red-400">diverges</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
	{#if status === 'ready' && truncated}
		<p class="mt-2 text-xs text-zinc-600">
			Based on the 1,000 accounts you most recently followed.
		</p>
	{/if}
</section>
