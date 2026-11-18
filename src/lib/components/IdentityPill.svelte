<script lang="ts">
	import type { Identity } from '$lib/types';
	import { identityLabel, profileHref } from '$lib/format';
	let { id }: { id: Identity } = $props();

	const style: Record<Identity['kind'], string> = {
		wallet: 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300',
		twitter: 'border-sky-700/50 bg-sky-950/40 text-sky-300',
		github: 'border-violet-700/50 bg-violet-950/40 text-violet-300'
	};
	const title = $derived(
		id.kind === 'wallet'
			? 'self-sovereign wallet EAS'
			: id.kind === 'twitter'
				? 'X account'
				: id.keyType === 'oauth'
					? 'GitHub account'
					: `GitHub key signature (${id.keyType})`
	);
	const href = $derived(profileHref(id));
</script>

{#if href}
	<a
		{href}
		class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs {style[id.kind]}"
		{title}
	>
		<span class="mono">{identityLabel(id)}</span>
	</a>
{:else}
	<span
		class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs {style[id.kind]}"
		{title}
	>
		<span class="mono">{identityLabel(id)}</span>
	</span>
{/if}
