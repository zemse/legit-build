<script lang="ts">
	import '../app.css';
	import SessionIndicator from '$lib/components/SessionIndicator.svelte';
	let { children } = $props();
</script>

<div class="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
	<header class="flex items-center justify-between py-5">
		<a href="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight">
			<span class="inline-block h-3 w-3 rounded-sm bg-emerald-400"></span>
			<span>legit<span class="text-zinc-500">.build</span></span>
		</a>
		<nav class="flex items-center gap-4 text-sm text-zinc-400">
			<SessionIndicator />
			<a class="transition hover:text-zinc-100" href="/about">How it works</a>
		</nav>
	</header>

	<main class="flex-1 pb-16">
		{@render children()}
	</main>

	<footer class="border-t border-zinc-800 py-6 text-xs text-zinc-500">
		<p>
			An open index of independent attestations that a release builds to a given binary hash. We
			don't run the builds and we don't vouch for them. We show where builders agree and where they
			don't.
		</p>
	</footer>
</div>
