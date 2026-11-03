import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// SSR by default; relay (SSE) routes run as Node serverless functions.
		adapter: adapter({ runtime: 'nodejs22.x' })
	}
};

export default config;
