<script lang="ts">
	import { releaseHref, shortHash, timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.login} · legit.build</title></svelte:head>

<section class="py-8">
	<h1 class="text-2xl font-semibold tracking-tight">
		<a
			class="text-violet-300 hover:text-violet-200"
			href={`https://github.com/${data.login}`}
			target="_blank"
			rel="noopener">{data.login}</a
		>
	</h1>
	<p class="mt-2 text-sm text-zinc-400">
		Release binaries {data.login} rebuilt from source and attested with their GitHub account.
	</p>
</section>

{#if data.items.length === 0}
	<p class="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
		No attestations from {data.login} yet.
	</p>
{:else}
	<div class="space-y-2">
		{#each data.items as i (i.id)}
			<div
				class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
			>
				<div class="flex flex-wrap items-center gap-3">
					<a class="font-medium hover:underline" href={releaseHref(i.project, i.version)}
						>{i.project.split('/').pop()} {i.version}</a
					>
					<span class="mono text-xs text-zinc-500">{i.osArch}</span>
				</div>
				<div class="flex items-center gap-3">
					<span class="mono text-sm text-emerald-300">{shortHash(i.artifactHash)}</span>
					{#if i.identity.kind === 'github' && i.identity.keyType === 'gpg'}
						<span class="text-xs text-violet-400" title="Signed with a GPG key published on GitHub"
							>GPG signed</span
						>
					{/if}
					<span class="text-xs text-zinc-600">{timeAgo(i.createdAt)}</span>
				</div>
			</div>
		{/each}
	</div>
{/if}
