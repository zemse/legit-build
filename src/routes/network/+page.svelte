<script lang="ts">
	import { onMount } from 'svelte';
	import { releaseHref, shortHash, timeAgo } from '$lib/format';
	import type { AttestationView, TwitterIdentity } from '$lib/types';

	// Everything attested by X accounts the viewer follows (and the viewer).
	let status = $state<'loading' | 'signed-out' | 'ready' | 'error'>('loading');
	let items = $state<AttestationView[]>([]);
	let viewer = $state('');
	let checked = $state(0);
	let truncated = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/x/network');
			if (res.status === 401) {
				status = 'signed-out';
				return;
			}
			if (!res.ok) throw new Error();
			const d = (await res.json()) as {
				viewer: string;
				followingChecked: number;
				truncated: boolean;
				items: AttestationView[];
			};
			items = d.items;
			viewer = d.viewer;
			checked = d.followingChecked;
			truncated = d.truncated;
			status = 'ready';
		} catch {
			status = 'error';
		}
	});

	const handleOf = (i: AttestationView) => (i.identity as TwitterIdentity).handle;
</script>

<svelte:head><title>People you follow · legit.build</title></svelte:head>

<section class="py-8">
	<h1 class="text-2xl font-semibold tracking-tight">Attested by people you follow</h1>
	<p class="mt-2 text-sm text-zinc-400">
		Release binaries that people you follow on X rebuilt from source and attested.
	</p>
</section>

{#if status === 'loading'}
	<p class="text-sm text-zinc-500">Checking who you follow…</p>
{:else if status === 'signed-out'}
	<a
		href="/auth/twitter?returnTo=/network"
		class="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-sky-950 transition hover:bg-sky-400"
		>Sign in with X</a
	>
{:else if status === 'error'}
	<p class="text-sm text-zinc-500">Couldn't load your network right now. Try again shortly.</p>
{:else}
	<p class="mb-4 text-xs text-zinc-600">
		Signed in as @{viewer} · checked {checked.toLocaleString()} account{checked === 1 ? '' : 's'} you
		follow{truncated ? ' (the 1,000 most recent)' : ''}
	</p>
	{#if items.length === 0}
		<p class="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
			Nobody you follow has attested a build yet.
		</p>
	{:else}
		<div class="space-y-2">
			{#each items as i (i.id)}
				<div
					class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
				>
					<div class="flex flex-wrap items-center gap-3">
						<a class="text-sky-300 hover:text-sky-200" href={`/x/${handleOf(i)}`}>@{handleOf(i)}</a>
						<a class="font-medium hover:underline" href={releaseHref(i.project, i.version)}
							>{i.project.split('/').pop()} {i.version}</a
						>
						<span class="mono text-xs text-zinc-500">{i.osArch}</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="mono text-sm text-emerald-300">{shortHash(i.artifactHash)}</span>
						{#if i.proofTweetId}
							<a
								class="text-xs text-zinc-500 underline hover:text-zinc-300"
								href={`https://x.com/${handleOf(i)}/status/${i.proofTweetId}`}
								target="_blank"
								rel="noopener">post</a
							>
						{/if}
						<span class="text-xs text-zinc-600">{timeAgo(i.createdAt)}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
{/if}
