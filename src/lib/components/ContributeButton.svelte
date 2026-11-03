<script lang="ts">
	import { clearActive, loadActive, saveActive } from '$lib/active-session';

	// Opens the contribute popup. One global session per browser: reuse the stored
	// session if it is still valid, otherwise provision a new one. No selection UI.
	let {
		label = 'Build & attest',
		variant = 'solid'
	}: { label?: string; variant?: 'solid' | 'ghost' } = $props();

	let dlg = $state<HTMLDialogElement>();
	let loading = $state(false);
	let line = $state<string | null>(null);
	let uuid = $state<string | null>(null);
	let err = $state<string | null>(null);
	let copied = $state(false);

	function lineFor(id: string): string {
		return `${location.origin}/contribute uuid=${id}`;
	}

	async function ensureSession() {
		if (line || loading) return;
		loading = true;
		err = null;
		try {
			// Reuse the persisted session if the server still has it and it hasn't ended.
			const existing = loadActive();
			if (existing) {
				const check = await fetch(`/api/sessions/${existing.uuid}`);
				if (check.ok) {
					const s = (await check.json()) as { state: string };
					if (s.state !== 'expired' && s.state !== 'abandoned') {
						uuid = existing.uuid;
						line = lineFor(existing.uuid);
						return;
					}
				}
				if (check.status === 404) clearActive();
			}

			// Otherwise create one global session (all pinned projects) and persist it.
			const res = await fetch('/api/sessions', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({})
			});
			if (!res.ok) throw new Error(await res.text());
			const s = (await res.json()) as { uuid: string; uploadToken: string; contributeLine: string };
			saveActive({ uuid: s.uuid, uploadToken: s.uploadToken });
			line = s.contributeLine;
			uuid = s.uuid;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Failed to create session';
		} finally {
			loading = false;
		}
	}

	async function open() {
		dlg?.showModal();
		await ensureSession();
	}

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

<button
	onclick={open}
	class={variant === 'solid'
		? 'rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400'
		: 'rounded-lg border border-emerald-700/60 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-950/40'}
>
	{label}
</button>

<dialog
	bind:this={dlg}
	onclick={(e) => {
		if (e.target === dlg) dlg?.close();
	}}
	class="m-auto w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-100 backdrop:bg-black/70"
>
	<div class="p-6">
		<div class="flex items-start justify-between gap-4">
			<h2 class="text-lg font-semibold">Contribute to legit.build</h2>
			<button
				onclick={() => dlg?.close()}
				class="text-zinc-500 transition hover:text-zinc-200"
				aria-label="Close">✕</button
			>
		</div>
		<p class="mt-2 text-sm text-zinc-400">
			Paste this into your coding agent (Claude Code, Cursor, a cloud sandbox). Add any build
			instructions on your side. The agent builds and reports each hash back; you review and sign.
		</p>

		{#if loading}
			<div
				class="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-500"
			>
				Provisioning session…
			</div>
		{:else if err}
			<p
				class="mt-5 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
			>
				{err}
			</p>
		{:else if line}
			<div class="mt-5 flex items-stretch gap-2">
				<code
					class="mono flex-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200"
					>{line}</code
				>
				<button
					onclick={copy}
					class="shrink-0 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition hover:bg-white"
				>
					{copied ? 'Copied' : 'Copy'}
				</button>
			</div>
			<a
				href={`/attest/${uuid}`}
				class="mt-4 inline-block text-sm text-emerald-400 transition hover:text-emerald-300"
			>
				Watch this session &amp; sign →
			</a>
		{/if}
	</div>
</dialog>
