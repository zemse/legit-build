<section class="py-10">
	<h1 class="text-3xl font-semibold tracking-tight">How legit.build works</h1>
	<p class="mt-3 max-w-2xl text-zinc-400">
		An open index of independent attestations that a release builds to a given binary hash. Three
		steps, no gatekeepers.
	</p>

	<!-- 3-step flow: horizontal on desktop with connectors, stacked on mobile -->
	<div class="mt-10 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
		<!-- Step 1 -->
		<div
			class="relative flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-emerald-700/40"
		>
			<div class="flex items-center gap-3">
				<span
					class="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700/50 bg-emerald-950/40 text-emerald-300"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m4 17 6-6-6-6" />
						<path d="M12 19h8" />
					</svg>
				</span>
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500">Step 1</span>
			</div>
			<h2 class="mt-4 text-lg font-semibold text-zinc-100">Anyone can attest</h2>
			<p class="mt-2 text-sm text-zinc-400">
				Paste one line into your coding agent and it does the work: clones the client's source and
				builds the release locally, on your own machine, against a pinned deterministic recipe, then
				reports the binary hash it got. No account, no gatekeeping.
			</p>
		</div>

		<!-- connector -->
		<div class="flex items-center justify-center lg:w-10" aria-hidden="true">
			<svg
				class="rotate-90 text-zinc-700 lg:rotate-0"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M5 12h14" />
				<path d="m12 5 7 7-7 7" />
			</svg>
		</div>

		<!-- Step 2 -->
		<div
			class="relative flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-emerald-700/40"
		>
			<div class="flex items-center gap-3">
				<span
					class="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700/50 bg-emerald-950/40 text-emerald-300"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 20h9" />
						<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
					</svg>
				</span>
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500">Step 2</span>
			</div>
			<h2 class="mt-4 text-lg font-semibold text-zinc-100">Publish your attestation</h2>
			<p class="mt-2 text-sm text-zinc-400">
				Review the hash the agent reported and sign it in your trusted context. Your signed
				attestation is published to the public index, where it counts toward or against agreement on
				that release.
			</p>
		</div>

		<!-- connector -->
		<div class="flex items-center justify-center lg:w-10" aria-hidden="true">
			<svg
				class="rotate-90 text-zinc-700 lg:rotate-0"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M5 12h14" />
				<path d="m12 5 7 7-7 7" />
			</svg>
		</div>

		<!-- Step 3 -->
		<div
			class="relative flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-emerald-700/40"
		>
			<div class="flex items-center gap-3">
				<span
					class="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700/50 bg-emerald-950/40 text-emerald-300"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				</span>
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500">Step 3</span>
			</div>
			<h2 class="mt-4 text-lg font-semibold text-zinc-100">View by who you trust</h2>
			<p class="mt-2 text-sm text-zinc-400">
				See where independent builders agree on a hash and where they diverge, filtered to the
				identities you actually trust:
			</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<span
					class="rounded-full border border-sky-700/50 bg-sky-950/40 px-2.5 py-0.5 text-xs text-sky-300"
					>Twitter</span
				>
				<span
					class="rounded-full border border-violet-700/50 bg-violet-950/40 px-2.5 py-0.5 text-xs text-violet-300"
					>GitHub GPG</span
				>
				<span
					class="rounded-full border border-emerald-700/50 bg-emerald-950/40 px-2.5 py-0.5 text-xs text-emerald-300"
					>ENS</span
				>
			</div>
		</div>
	</div>

	<!-- supporting notes -->
	<div class="mt-12 grid gap-4 sm:grid-cols-2">
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
			<h3 class="text-sm font-semibold text-zinc-100">The claim, not the proof</h3>
			<p class="mt-1.5 text-sm text-zinc-400">
				We don't run the builds and we don't vouch for them. We record independent claims and
				surface agreement and divergence. Trust comes from many corroborating identities, not any
				single attestation.
			</p>
		</div>
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
			<h3 class="text-sm font-semibold text-zinc-100">Compared per architecture</h3>
			<p class="mt-1.5 text-sm text-zinc-400">
				Hashes are only comparable within the same os/arch, so a release groups attestations by
				target first and flags divergence only within a cohort. Different hashes across
				architectures are expected, not a conflict.
			</p>
		</div>
	</div>
</section>
