<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
	<header class="flex items-center justify-between py-5">
		<a href="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight">
			<span class="inline-block h-3 w-3 rounded-sm bg-emerald-400"></span>
			legit<span class="text-zinc-500">.build</span>
		</a>
		<nav class="flex items-center gap-5 text-sm text-zinc-400">
			<a class="transition hover:text-zinc-100" href="/">Clients</a>
			<a class="transition hover:text-zinc-100" href="/about">How it works</a>
			<a
				class="transition hover:text-zinc-100"
				href="https://github.com/ethereum-attestation-service"
				target="_blank"
				rel="noreferrer">EAS</a
			>
		</nav>
	</header>

	<main class="flex-1 pb-16">
		{@render children()}
	</main>

	<footer class="border-t border-zinc-800 py-6 text-xs text-zinc-500">
		<p>
			legit.build records independent attestations that an Ethereum client release builds to a
			given binary hash. We do not run builds and do not prove honesty — we surface agreement and
			divergence.
		</p>
	</footer>
</div>
