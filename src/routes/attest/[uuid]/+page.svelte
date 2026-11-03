<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import IdentityPill from '$lib/components/IdentityPill.svelte';
	import { shortHash } from '$lib/format';
	import type { BuildResult, SessionPublic } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let session = $state<SessionPublic>(untrack(() => data.session));
	let liveLog = $state<string[]>([]);
	let copied = $state(false);

	// Per-result approval for signing (default all approved).
	let approved = $state<Record<number, boolean>>({});
	$effect(() => {
		for (let i = 0; i < session.results.length; i++)
			if (approved[i] === undefined) approved[i] = true;
	});
	const approvedResults = $derived(session.results.filter((_, i) => approved[i]));

	let signing = $state(false);
	let msg = $state<string | null>(null);
	let err = $state<string | null>(null);

	onMount(() => {
		const es = new EventSource(`/api/sessions/${session.uuid}/events`);
		es.addEventListener('state', (e) => {
			session = JSON.parse((e as MessageEvent).data) as SessionPublic;
		});
		es.addEventListener('result', (e) => {
			const r = JSON.parse((e as MessageEvent).data) as BuildResult;
			liveLog = [...liveLog, `${r.project} ✓ ${shortHash(r.artifactHash)} (${r.osArch})`];
		});
		return () => es.close();
	});

	async function copyLine() {
		try {
			await navigator.clipboard.writeText(data.contributeLine);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* ignore */
		}
	}

	async function attestWallet() {
		signing = true;
		err = null;
		msg = null;
		try {
			const { connectWallet, siweSignIn, signBatch } = await import('$lib/eas/offchain');
			const { signer, address } = await connectWallet();
			await siweSignIn(signer, address);
			msg = 'Signing one attestation for the approved results…';
			const { signed, signer: addr } = await signBatch(signer, approvedResults);
			const res = await fetch('/api/attestations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ signed, signer: addr, sessionUuid: session.uuid })
			});
			if (!res.ok) throw new Error(await res.text());
			msg = `Attested ${approvedResults.length} result(s). Thank you.`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Wallet attestation failed';
		} finally {
			signing = false;
		}
	}

	async function attestTwitter() {
		signing = true;
		err = null;
		msg = null;
		try {
			const approvedIdx = session.results.map((_, i) => i).filter((i) => approved[i]);
			const res = await fetch('/api/attest/twitter', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ sessionUuid: session.uuid, approved: approvedIdx })
			});
			if (!res.ok) throw new Error(await res.text());
			msg = `Attested ${approvedIdx.length} result(s) via @${data.twitter?.handle}.`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Twitter attestation failed';
		} finally {
			signing = false;
		}
	}

	const stateLabel: Record<string, string> = {
		created: 'Waiting for your agent to connect…',
		building: 'Building…',
		results_ready: 'Results ready: review and sign',
		attested: 'Attested',
		expired: 'Session expired',
		abandoned: 'Session abandoned'
	};
</script>

<section class="py-8">
	<h1 class="text-2xl font-semibold tracking-tight">
		Contribute to legit.build by building and attesting clients yourself
	</h1>
	<p class="mt-2 text-sm text-zinc-400">
		Paste this one line into your agent (Claude Code, Cursor, a cloud sandbox). It builds the
		selected projects against a pinned recipe and reports each hash back here, live.
	</p>

	<div class="mt-4 flex items-stretch gap-2">
		<code
			class="mono flex-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200"
			>{data.contributeLine}</code
		>
		<button
			onclick={copyLine}
			class="shrink-0 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition hover:bg-white"
		>
			{copied ? 'Copied' : 'Copy'}
		</button>
	</div>
	<p class="mt-2 text-xs text-zinc-600">
		Projects: {session.projects.join(', ')} · session {session.uuid.slice(0, 8)}…
	</p>
</section>

<div class="mb-6 flex items-center gap-3">
	<span
		class="inline-block h-2.5 w-2.5 rounded-full {session.state === 'building'
			? 'animate-pulse bg-amber-400'
			: session.state === 'results_ready' || session.state === 'attested'
				? 'bg-emerald-400'
				: 'bg-zinc-600'}"
	></span>
	<span class="text-sm text-zinc-300">{stateLabel[session.state] ?? session.state}</span>
</div>

<!-- Live build log -->
{#if session.results.length > 0 || session.state === 'building'}
	<section class="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
		<h2 class="mb-3 text-sm font-medium text-zinc-400">Results</h2>
		<div class="space-y-2">
			{#each session.results as r, i (i)}
				<div class="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2">
					<div class="flex items-center gap-3">
						{#if session.state === 'results_ready'}
							<input
								type="checkbox"
								bind:checked={approved[i]}
								class="h-4 w-4 accent-emerald-500"
							/>
						{/if}
						<span class="font-medium">{r.project}</span>
						<span class="mono text-xs text-zinc-500">{r.osArch}</span>
						{#if r.githubSig?.status === 'valid'}
							<span
								class="rounded-full border border-violet-700/50 bg-violet-950/40 px-2 py-0.5 text-xs text-violet-300"
								title="Verified GitHub key signature; already attested, no browser step needed"
							>
								✓ GitHub {r.githubSig.login}
							</span>
						{:else if r.githubSig?.status === 'invalid'}
							<span
								class="rounded-full border border-amber-700/50 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-300"
								title="GitHub signature did not verify; attest with your wallet or Twitter instead"
							>
								GitHub sig invalid
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<span class="mono text-sm text-emerald-300">{shortHash(r.artifactHash)}</span>
						<span class="mono text-xs text-zinc-600">{r.environment}</span>
					</div>
				</div>
			{/each}
			{#if session.results.length === 0}
				<p class="text-sm text-zinc-500">No results yet.</p>
			{/if}
		</div>
	</section>
{/if}

<!-- Sign -->
{#if session.state === 'results_ready'}
	<section class="rounded-xl border border-emerald-900/50 bg-emerald-950/10 p-5">
		<h2 class="text-lg font-medium">Attest the results you approve</h2>
		<p class="mt-1 text-sm text-zinc-400">
			You'll attest {approvedResults.length} of {session.results.length} result(s) in a single signature.
			Exactly this is recorded:
		</p>

		<div
			class="mono mt-3 max-h-48 overflow-y-auto rounded-lg border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-300"
		>
			{#each approvedResults as r (r.project + r.artifactHash)}
				<div>{r.project} {r.version} {r.osArch} → {shortHash(r.artifactHash, 16, 10)}</div>
			{:else}
				<div class="text-zinc-600">Nothing selected.</div>
			{/each}
		</div>

		{#if msg}
			<p
				class="mt-3 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300"
			>
				{msg}
			</p>
		{/if}
		{#if err}
			<p
				class="mt-3 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
			>
				{err}
			</p>
		{/if}

		<div class="mt-4 flex flex-wrap gap-3">
			<button
				onclick={attestWallet}
				disabled={signing || approvedResults.length === 0}
				class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
			>
				Wallet (gas-free, self-sovereign)
			</button>

			{#if data.twitter}
				<button
					onclick={attestTwitter}
					disabled={signing || approvedResults.length === 0}
					class="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-sky-950 transition hover:bg-sky-400 disabled:opacity-50"
				>
					Twitter (@{data.twitter.handle})
				</button>
			{:else}
				<a
					href={`/auth/twitter?returnTo=/attest/${session.uuid}`}
					class="rounded-lg border border-sky-700/60 px-4 py-2 text-sm text-sky-300 transition hover:bg-sky-950/40"
				>
					Sign in with Twitter to attest
				</a>
			{/if}
		</div>
	</section>
{:else if session.state === 'attested'}
	<section class="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
		<p class="text-emerald-300">This session's results have been attested. Thank you.</p>
	</section>
{/if}
