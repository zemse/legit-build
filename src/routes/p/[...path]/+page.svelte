<script lang="ts">
	import ContributeButton from '$lib/components/ContributeButton.svelte';
	import IdentityPill from '$lib/components/IdentityPill.svelte';
	import { releaseHref, shortHash, timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<section class="py-8">
	<a href="/" class="text-sm text-zinc-500 hover:text-zinc-300">← all projects</a>
	<div class="mt-2 flex flex-wrap items-center justify-between gap-4">
		<h1 class="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">
			{data.project.name ?? data.project.repo}
			{#if data.view === 'release'}
				<span class="mono text-xl text-emerald-400">{data.release.tag}</span>
			{/if}
		</h1>
		<ContributeButton
			label="Build &amp; attest"
			project={data.project.id}
			projectName={data.project.name ?? data.project.repo}
			version={data.view === 'release' ? data.release.tag : undefined}
		/>
	</div>
	<p class="mono mt-2 text-xs text-zinc-500">{data.project.id}</p>
</section>

{#if data.view === 'project'}
	<div class="grid gap-3">
		{#each data.cards as c (c.tag)}
			<a
				href={releaseHref(data.project.id, c.tag)}
				class="block rounded-xl border border-zinc-800 bg-zinc-900/40 transition hover:border-zinc-700"
			>
				<header class="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
					<div class="flex items-center gap-3">
						<span class="mono font-medium">{c.tag}</span>
						{#if c.prerelease}
							<span class="rounded bg-amber-950/60 px-1.5 py-0.5 text-xs text-amber-400">pre</span>
						{/if}
					</div>
					<div class="flex items-center gap-3 text-xs text-zinc-500">
						<span>{c.totalAttestations} attestation{c.totalAttestations === 1 ? '' : 's'}</span>
						<span>{c.publishedAt ? timeAgo(c.publishedAt) : ''}</span>
					</div>
				</header>

				{#if c.targets.length > 0}
					<ul class="divide-y divide-zinc-800/70">
						{#each c.targets as t (t.osArch)}
							<li class="flex items-center justify-between px-4 py-2 text-sm">
								<span class="mono text-zinc-300">{t.osArch}</span>
								{#if t.attested}
									<span class="flex items-center gap-3">
										<span
											class="text-emerald-400"
											title="attestations agreeing on the dominant hash"
										>
											✓ {t.positive}
										</span>
										<span
											class={t.negative > 0 ? 'text-red-400' : 'text-zinc-600'}
											title="attestations on a divergent hash"
										>
											✗ {t.negative}
										</span>
										{#if t.divergent}
											<span class="rounded bg-red-950/60 px-1.5 py-0.5 text-xs text-red-300">
												divergent
											</span>
										{/if}
									</span>
								{:else}
									<span class="text-xs text-zinc-600">no attestations yet</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="px-4 py-3 text-sm text-zinc-600">No targets or attestations yet.</p>
				{/if}
			</a>
		{:else}
			<p class="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
				No releases cached yet. The poller backfills daily.
			</p>
		{/each}
	</div>
{:else}
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
					<span class="mono text-xs text-zinc-500">recipe {shortHash(cohort.recipeHash, 6, 4)}</span
					>
				</div>
				{#if cohort.divergent}
					<span class="rounded bg-red-950/60 px-2 py-0.5 text-xs text-red-300">
						{cohort.groups.length} competing hashes
					</span>
				{:else}
					<span class="rounded bg-emerald-950/50 px-2 py-0.5 text-xs text-emerald-300"
						>agreement</span
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
		<div
			class="flex flex-col items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-center"
		>
			<p class="text-zinc-400">No attestations yet for this release.</p>
			<ContributeButton
				label="Be the first to build &amp; attest"
				project={data.project.id}
				projectName={data.project.name ?? data.project.repo}
				version={data.release.tag}
			/>
		</div>
	{/each}
{/if}
