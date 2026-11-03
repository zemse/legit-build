<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { saveUploadToken } from '$lib/session-token';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const prefill = page.url.searchParams.get('client');
	let selected = $state<Record<string, boolean>>(
		untrack(() =>
			Object.fromEntries(data.clients.map((c) => [c.id, prefill ? c.id === prefill : true]))
		)
	);
	let instructions = $state('');
	let busy = $state(false);
	let err = $state<string | null>(null);

	const chosen = $derived(data.clients.filter((c) => selected[c.id]).map((c) => c.id));

	function toggleAll(on: boolean) {
		selected = Object.fromEntries(data.clients.map((c) => [c.id, on]));
	}

	async function start() {
		if (chosen.length === 0) {
			err = 'Select at least one client.';
			return;
		}
		busy = true;
		err = null;
		try {
			const res = await fetch('/api/sessions', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ clients: chosen, instructions: instructions || undefined })
			});
			if (!res.ok) throw new Error(await res.text());
			const s = (await res.json()) as { uuid: string; uploadToken: string };
			// The uploadToken is returned only here; keep it in this browser only (spec §7).
			saveUploadToken(s.uuid, s.uploadToken);
			await goto(`/attest/${s.uuid}`);
		} catch (e) {
			err = e instanceof Error ? e.message : 'Failed to start session';
		} finally {
			busy = false;
		}
	}
</script>

<section class="py-8">
	<h1 class="text-3xl font-semibold tracking-tight">Build &amp; attest</h1>
	<p class="mt-3 max-w-2xl text-zinc-400">
		Select the clients to build. You'll get one line to paste into your agent (Claude Code, Cursor,
		a cloud sandbox); it builds against a pinned recipe and reports each binary hash back here. You
		sign only what you approve.
	</p>
</section>

<div class="mb-4 flex items-center gap-3 text-sm">
	<button class="text-zinc-400 hover:text-zinc-100" onclick={() => toggleAll(true)}
		>select all</button
	>
	<span class="text-zinc-700">·</span>
	<button class="text-zinc-400 hover:text-zinc-100" onclick={() => toggleAll(false)}>none</button>
	<span class="ml-auto text-zinc-500">{chosen.length} selected</span>
</div>

<div class="mb-6 grid gap-2 sm:grid-cols-2">
	{#each data.clients as c (c.id)}
		<label
			class="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition hover:border-zinc-700"
		>
			<input type="checkbox" bind:checked={selected[c.id]} class="h-4 w-4 accent-emerald-500" />
			<span class="font-medium">{c.name}</span>
			<span class="mono text-xs text-zinc-500">{c.layer}</span>
		</label>
	{/each}
</div>

<label class="mb-2 block text-sm text-zinc-400" for="instr">
	Extra instructions (optional) — e.g. "build on an AWS c7g instance", a sandbox to use, etc.
</label>
<textarea
	id="instr"
	bind:value={instructions}
	rows="3"
	class="mb-4 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-700"
	placeholder="Context passed to your agent. Treated as notes, not build steps — the pinned recipe governs the build."
></textarea>

{#if err}
	<p class="mb-4 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
		{err}
	</p>
{/if}

<button
	onclick={start}
	disabled={busy}
	class="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
>
	{busy ? 'Starting…' : 'Start session'}
</button>
