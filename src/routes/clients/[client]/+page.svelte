<script lang="ts">
	import { timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<section class="py-8">
	<a href="/" class="text-sm text-zinc-500 hover:text-zinc-300">← all clients</a>
	<h1 class="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight">
		{data.client.name}
		<span class="mono text-sm font-normal text-zinc-500">{data.client.repo}</span>
	</h1>
</section>

<div class="grid gap-2">
	{#each data.releases as r (r.id)}
		<a
			href={`/clients/${data.client.id}/releases/${encodeURIComponent(r.tag)}`}
			class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition hover:border-zinc-700"
		>
			<div class="flex items-center gap-3">
				<span class="mono font-medium">{r.tag}</span>
				{#if r.prerelease}
					<span class="rounded bg-amber-950/60 px-1.5 py-0.5 text-xs text-amber-400">pre</span>
				{/if}
			</div>
			<span class="text-xs text-zinc-500">{r.publishedAt ? timeAgo(r.publishedAt) : ''}</span>
		</a>
	{:else}
		<p class="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
			No releases cached yet. The poller backfills on a cron.
		</p>
	{/each}
</div>
