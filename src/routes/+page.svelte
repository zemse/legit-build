<script lang="ts">
	import { timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Row = PageData['execution'][number];
</script>

<section class="py-8">
	<h1 class="text-3xl font-semibold tracking-tight">Who rebuilt the client, and to what hash?</h1>
	<p class="mt-3 max-w-2xl text-zinc-400">
		Pick a client and release to see every independent attestation of its binary hash — grouped by
		architecture, with divergence flagged. Or build the clients yourself and attest the result.
	</p>
</section>

{#snippet clientList(title: string, rows: Row[])}
	<section class="mb-10">
		<h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">{title}</h2>
		<div class="grid gap-2">
			{#each rows as c (c.id)}
				<a
					href={c.latest ? `/clients/${c.id}/releases/${encodeURIComponent(c.latest.tag)}` : `/clients/${c.id}`}
					class="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900"
				>
					<div class="flex items-center gap-3">
						<span class="font-medium">{c.name}</span>
						<span class="mono text-xs text-zinc-500">{c.lang}</span>
					</div>
					<div class="flex items-center gap-4 text-sm">
						{#if c.latest}
							<span class="mono text-zinc-300">{c.latest.tag}</span>
							<span class="hidden text-xs text-zinc-500 sm:inline">
								{c.latest.publishedAt ? timeAgo(c.latest.publishedAt) : ''}
							</span>
						{:else}
							<span class="text-xs text-zinc-600">no releases yet</span>
						{/if}
						<span
							class="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 group-hover:border-emerald-700/60 group-hover:text-emerald-300"
							title="attestations on record"
						>
							{c.attestations}
						</span>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/snippet}

{@render clientList('Execution layer', data.execution)}
{@render clientList('Consensus layer', data.consensus)}

{#if data.execution.length === 0 && data.consensus.length === 0}
	<p class="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
		No clients seeded yet. Run <span class="mono">pnpm db:seed</span>.
	</p>
{/if}
