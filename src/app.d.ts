// See https://svelte.dev/docs/kit/types#app.d.ts
import type { TwitterIdentity, WalletIdentity } from '$lib/types';

declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			// Set by hooks.server.ts from the signed session cookie.
			twitter?: TwitterIdentity;
			wallet?: WalletIdentity;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}

	interface Window {
		ethereum?: import('ethers').Eip1193Provider & {
			on?: (event: string, handler: (...args: unknown[]) => void) => void;
			removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
		};
	}
}

export {};
