<script lang="ts">
	import IdentityPill from '$lib/components/IdentityPill.svelte';
	import { shortHash } from '$lib/format';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<section class="py-8">
	<a href={`/clients/${data.client.id}`} class="text-sm text-zinc-500 hover:text-zinc-300">
		← {data.client.name} releases
	</a>
	<div class="mt-2 flex flex-wrap items-center justify-between gap-4">
		<h1 class="flex items-center gap-3 text-3xl font-semibold tracking-tight">
			{data.client.name}
			<span class="mono text-xl text-emerald-400">{data.release.tag}</span>
		</h1>
		<a
			href={`/start?client=${data.client.id}`}
			class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
		>
			Contribute — build &amp; attest
		</a>
	</div>
	{#if data.release.commit}
		<p class="mono mt-2 text-xs text-zinc-500">commit {shortHash(data.release.commit, 10, 8)}</p>
	{/if}
</section>

<div class="mb-6 flex flex-wrap gap-4 text-sm">
	<span class="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-1.5">
		{data.total} attestation{data.total === 1 ? '' : 's'}
	</span>
	<span class="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-1.5">
		{data.distinctIdentities} distinct identit{data.distinctIdentities === 1 ? 'y' : 'ies'}
	</span>
	{#if data.anyDivergent}
		<span class="rounded-lg border border-red-800/70 bg-red-950/40 px-3 py-1.5 text-red-300">
			⚠ divergence within a cohort
		</span>
	{/if}
</div>

{#each data.cohorts as cohort (cohort.osArch + cohort.recipeHash)}
	<section class="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/30">
		<header class="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
			<div class="flex items-center gap-3">
				<span class="mono text-sm font-medium">{cohort.osArch}</span>
				<span class="mono text-xs text-zinc-500">recipe {shortHash(cohort.recipeHash, 6, 4)}</span>
			</div>
			{#if cohort.divergent}
				<span class="rounded bg-red-950/60 px-2 py-0.5 text-xs text-red-300">
					{cohort.groups.length} competing hashes
				</span>
			{:else}
				<span class="rounded bg-emerald-950/50 px-2 py-0.5 text-xs text-emerald-300">agreement</span
				>
			{/if}
		</header>

		<div class="divide-y divide-zinc-800">
			{#each cohort.groups as g (g.artifactHash)}
				<div class="px-4 py-3">
					<div class="flex items-center justify-between">
						<span class="mono text-sm {cohort.divergent ? 'text-red-300' : 'text-emerald-300'}">
							{shortHash(g.artifactHash, 12, 8)}
						</span>
						<span class="text-xs text-zinc-500">
							{g.count} attestation{g.count === 1 ? '' : 's'}
						</span>
					</div>
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each g.identities as id, i (i)}
							<IdentityPill {id} />
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>
{:else}
	<div class="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-center">
		<p class="text-zinc-400">No attestations yet for this release.</p>
		<a
			href={`/start?client=${data.client.id}`}
			class="mt-3 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
		>
			Be the first — build &amp; attest
		</a>
	</div>
{/each}
