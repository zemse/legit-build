<script lang="ts">
	import type { Identity } from '$lib/types';
	import { identityLabel } from '$lib/format';
	let { id }: { id: Identity } = $props();
</script>

<span
	class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs {id.kind ===
	'wallet'
		? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300'
		: 'border-sky-700/50 bg-sky-950/40 text-sky-300'}"
	title={id.kind === 'wallet' ? 'self-sovereign wallet EAS' : 'backend-vouched Twitter'}
>
	<span class="mono">{identityLabel(id)}</span>
</span>
