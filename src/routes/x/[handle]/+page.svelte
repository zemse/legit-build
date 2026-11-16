<script lang="ts">
	import { releaseHref, shortHash, timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>@{data.handle} · legit.build</title></svelte:head>

<section class="py-8">
	<h1 class="text-2xl font-semibold tracking-tight">
		<a
			class="text-sky-300 hover:text-sky-200"
			href={`https://x.com/${data.handle}`}
			target="_blank"
			rel="noopener">@{data.handle}</a
		>
	</h1>
	<p class="mt-2 text-sm text-zinc-400">
		Release binaries @{data.handle} rebuilt from source and attested.
	</p>
</section>

{#if data.items.length === 0}
	<p class="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
		No attestations from @{data.handle} yet.
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
					{#if i.proofTweetId}
						<a
							class="text-xs text-zinc-500 underline hover:text-zinc-300"
							href={`https://x.com/${data.handle}/status/${i.proofTweetId}`}
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
