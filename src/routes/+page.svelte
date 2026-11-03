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
		Pick a project and release to see every independent attestation of its binary hash, grouped by
		target architecture, with divergence flagged.
	</p>
</section>

{#snippet projectGrid(title: string, rows: Row[])}
	{#if rows.length > 0}
		<section class="mb-10">
			<h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">{title}</h2>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each rows as p (p.id)}
					<a
						href={p.latest ? releaseHref(p.id, p.latest.tag) : projectHref(p.id)}
						class="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-emerald-700/50 hover:bg-zinc-900"
					>
						<div class="flex items-center justify-between gap-2">
							<span class="truncate font-medium">{p.name ?? p.repo}</span>
							<span
								class="shrink-0 rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 group-hover:border-emerald-700/60 group-hover:text-emerald-300"
								title="attestations on the latest release"
							>
								{p.attestations}
							</span>
						</div>
						<p class="mono mt-1 truncate text-xs text-zinc-600">{p.id}</p>
						<div
							class="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3 text-sm"
						>
							{#if p.latest}
								<span class="mono text-emerald-400">{p.latest.tag}</span>
								<span class="text-xs text-zinc-500">
									{p.latest.publishedAt ? timeAgo(p.latest.publishedAt) : ''}
								</span>
							{:else}
								<span class="text-xs text-zinc-600">no releases yet</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}
{/snippet}

{@render projectGrid('Execution layer', data.execution)}
{@render projectGrid('Consensus layer', data.consensus)}
{@render projectGrid('Other', data.other)}

{#if allProjectIds.length === 0}
	<p class="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
		No projects seeded yet. Run <span class="mono">pnpm db:seed</span>.
	</p>
{:else}
	<section
		class="mt-14 rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-8 text-center sm:p-10"
	>
		<h2 class="text-2xl font-semibold tracking-tight">Attest binaries yourself</h2>
		<p class="mx-auto mt-3 max-w-xl text-zinc-400">
			Rebuild any release with your own agent, in your own environment, and publish a signed
			attestation of the binary hash. One paste to start. You review and sign only what comes back.
		</p>
		<div class="mt-6 flex justify-center">
			<ContributeButton label="I want to attest binaries" />
		</div>
	</section>
{/if}
