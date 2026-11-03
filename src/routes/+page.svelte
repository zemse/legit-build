<script lang="ts">
	import ContributeButton from '$lib/components/ContributeButton.svelte';
	import { projectHref, releaseHref, timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Row = PageData['execution'][number];

	const allProjectIds = $derived(
		[...data.execution, ...data.consensus, ...data.other].map((p) => p.id)
	);
</script>

<section class="py-8">
	<h1 class="text-3xl font-semibold tracking-tight">Who rebuilt the project, and to what hash?</h1>
	<p class="mt-3 max-w-2xl text-zinc-400">
		Pick a project and release to see every independent attestation of its binary hash — grouped by
		target architecture, with divergence flagged. Or build the projects yourself and attest the
		result.
	</p>
	{#if allProjectIds.length > 0}
		<div class="mt-5">
			<ContributeButton projects={allProjectIds} label="Build &amp; attest" />
		</div>
	{/if}
</section>

{#snippet projectList(title: string, rows: Row[])}
	{#if rows.length > 0}
		<section class="mb-10">
			<h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">{title}</h2>
			<div class="grid gap-2">
				{#each rows as p (p.id)}
					<a
						href={p.latest ? releaseHref(p.id, p.latest.tag) : projectHref(p.id)}
						class="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900"
					>
						<div class="flex min-w-0 items-center gap-3">
							<span class="font-medium">{p.name ?? p.repo}</span>
							<span class="mono truncate text-xs text-zinc-600">{p.id}</span>
						</div>
						<div class="flex shrink-0 items-center gap-4 text-sm">
							{#if p.latest}
								<span class="mono text-zinc-300">{p.latest.tag}</span>
								<span class="hidden text-xs text-zinc-500 sm:inline">
									{p.latest.publishedAt ? timeAgo(p.latest.publishedAt) : ''}
								</span>
							{:else}
								<span class="text-xs text-zinc-600">no releases yet</span>
							{/if}
							<span
								class="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 group-hover:border-emerald-700/60 group-hover:text-emerald-300"
								title="attestations on record"
							>
								{p.attestations}
							</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}
{/snippet}

{@render projectList('Execution layer', data.execution)}
{@render projectList('Consensus layer', data.consensus)}
{@render projectList('Other', data.other)}

{#if data.execution.length === 0 && data.consensus.length === 0 && data.other.length === 0}
	<p class="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
		No projects seeded yet. Run <span class="mono">pnpm db:seed</span>.
	</p>
{/if}
