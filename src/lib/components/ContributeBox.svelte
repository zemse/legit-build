<script lang="ts">
	import { onMount } from 'svelte';
	import { contributeLine, ensureSession } from '$lib/active-session';

	// Inline contribute line, rendered directly on the page (no button, no popup).
	// Provisions one global session per browser on mount and shows the copy box.
	let line = $state<string | null>(null);
	let uuid = $state<string | null>(null);
	let err = $state<string | null>(null);
	let copied = $state(false);

	onMount(async () => {
		try {
			const s = await ensureSession();
			uuid = s.uuid;
			line = contributeLine(s.uuid);
		} catch (e) {
			err = e instanceof Error ? e.message : 'Failed to provision session';
		}
	});

	async function copy() {
		if (!line) return;
		try {
			await navigator.clipboard.writeText(line);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* ignore */
		}
	}
</script>

{#if err}
	<p class="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
		{err}
	</p>
{:else}
	<div class="flex items-stretch gap-2">
		<code
			class="mono flex-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-left text-sm text-zinc-200"
			>{line ?? 'Provisioning session…'}</code
		>
		<button
			onclick={copy}
			disabled={!line}
			class="shrink-0 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
		>
			{copied ? 'Copied' : 'Copy'}
		</button>
	</div>
	{#if uuid}
		<a
			href={`/attest/${uuid}`}
			class="mt-3 inline-block text-sm text-emerald-400 transition hover:text-emerald-300"
		>
			Watch this session &amp; sign &rarr;
		</a>
	{/if}
{/if}
