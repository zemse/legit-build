<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	// Header sign-in with X. Identity is fetched client-side so public pages stay cacheable.
	let handle = $state<string | null>(null);
	let loaded = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/me');
			if (res.ok)
				handle =
					((await res.json()) as { twitter: { handle: string } | null }).twitter?.handle ?? null;
		} catch {
			/* ignore */
		}
		loaded = true;
	});

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' });
		handle = null;
		location.reload();
	}
</script>

{#if loaded}
	{#if handle}
		<a class="transition hover:text-zinc-100" href="/network">People you follow</a>
		<span class="flex items-center gap-2">
			<a class="text-sky-300 transition hover:text-sky-200" href={`/x/${handle}`}>@{handle}</a>
			<button class="text-xs text-zinc-600 transition hover:text-zinc-300" onclick={signOut}
				>Sign out</button
			>
		</span>
	{:else}
		<a
			class="rounded-full border border-sky-700/60 px-3 py-1 text-xs text-sky-300 transition hover:bg-sky-950/40"
			href={`/auth/twitter?returnTo=${encodeURIComponent(page.url.pathname)}`}>Sign in with X</a
		>
	{/if}
{/if}
