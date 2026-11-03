<section class="prose-invert py-8">
	<h1 class="text-3xl font-semibold tracking-tight">How legit.build works</h1>

	<div class="mt-6 space-y-6 text-zinc-300">
		<div>
			<h2 class="text-lg font-medium text-zinc-100">The claim, not the proof</h2>
			<p class="mt-1 text-zinc-400">
				We do not run builds and we do not prove a build is honest. We record independent claims
				that a client release builds to a given binary hash, and surface where builders agree and
				where they diverge. Trust comes from N-of-M corroboration across identities, not from any
				single attestation.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-medium text-zinc-100">Build it yourself</h2>
			<p class="mt-1 text-zinc-400">
				Start a session, pick clients, and paste one line into your coding agent. It builds each
				client against a pinned, deterministic recipe and reports the binary hash back here live.
				You review every result and sign only what you approve.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-medium text-zinc-100">Two ways to attest</h2>
			<ul class="mt-1 list-disc space-y-1 pl-5 text-zinc-400">
				<li>
					<span class="text-emerald-300">Wallet</span> — you sign one gas-free EAS off-chain
					attestation covering the whole batch. Self-sovereign; identity shown via ENS / Farcaster.
				</li>
				<li>
					<span class="text-sky-300">Twitter</span> — you authenticate with X and our backend (a
					trusted issuer) signs on your behalf, recording your handle.
				</li>
			</ul>
			<p class="mt-2 text-sm text-zinc-500">
				On-chain publishing (a Base timestamp anchor, and opt-in full on-chain attestations) is
				coming later; v1 is off-chain.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-medium text-zinc-100">Architecture cohorts</h2>
			<p class="mt-1 text-zinc-400">
				Builders report whatever architecture they built on. Hashes are only comparable within the
				same os/arch, so a release page groups attestations by architecture first and flags
				divergence only within a cohort. Different hashes across architectures are expected.
			</p>
		</div>
	</div>
</section>
