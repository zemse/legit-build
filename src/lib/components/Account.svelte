<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	// Header sign-in (X or GitHub). Identity is fetched client-side so public pages stay cacheable.
	type Me = { twitter: { handle: string } | null; github: { login: string } | null };
	let me = $state<{ label: string; profile: string; tone: string } | null>(null);
	let loaded = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/me');
			if (res.ok) {
				const d = (await res.json()) as Me;
				if (d.twitter)
					me = {
						label: `@${d.twitter.handle}`,
						profile: `/x/${d.twitter.handle}`,
						tone: 'text-sky-300 hover:text-sky-200'
					};
				else if (d.github)
					me = {
						label: d.github.login,
						profile: `/gh/${d.github.login}`,
						tone: 'text-violet-300 hover:text-violet-200'
					};
			}
		} catch {
			/* ignore */
		}
		loaded = true;
	});

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' });
		me = null;
		location.reload();
	}

	const returnTo = $derived(encodeURIComponent(page.url.pathname));
</script>

{#if loaded}
	{#if me}
		<a class="transition hover:text-zinc-100" href={me.profile}>My attestations</a>
		<a class="transition hover:text-zinc-100" href="/network">People you follow</a>
		<span class="flex items-center gap-2">
			<a class="transition {me.tone}" href={me.profile}>{me.label}</a>
			<button class="text-xs text-zinc-600 transition hover:text-zinc-300" onclick={signOut}
				>Sign out</button
			>
		</span>
	{:else}
		<span class="flex items-center gap-2">
			<span class="text-xs text-zinc-500">Sign in</span>
			<a
				class="rounded-full border border-sky-700/60 px-3 py-1 text-xs text-sky-300 transition hover:bg-sky-950/40"
				href={`/auth/twitter?returnTo=${returnTo}`}>X</a
			>
			<a
				class="rounded-full border border-violet-700/60 px-3 py-1 text-xs text-violet-300 transition hover:bg-violet-950/40"
				href={`/auth/github?returnTo=${returnTo}`}>GitHub</a
			>
		</span>
	{/if}
{/if}
