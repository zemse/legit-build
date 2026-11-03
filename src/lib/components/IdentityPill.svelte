<script lang="ts">
	import type { Identity } from '$lib/types';
	import { identityLabel } from '$lib/format';
	let { id }: { id: Identity } = $props();

	const style: Record<Identity['kind'], string> = {
		wallet: 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300',
		twitter: 'border-sky-700/50 bg-sky-950/40 text-sky-300',
		github: 'border-violet-700/50 bg-violet-950/40 text-violet-300'
	};
	const title: Record<Identity['kind'], string> = {
		wallet: 'self-sovereign wallet EAS',
		twitter: 'backend-vouched Twitter',
		github: 'GitHub key signature (gpg)'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs {style[id.kind]}"
	title={title[id.kind]}
>
	<span class="mono">{identityLabel(id)}</span>
</span>
