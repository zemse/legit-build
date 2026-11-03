// The uploadToken is returned only to the creating browser (spec §7). We keep it
// in sessionStorage so it survives a reload but never travels with the shareable
// uuid URL. Everything is wrapped so private-mode / blocked storage never throws.
const key = (uuid: string) => `lb_upload_${uuid}`;

export function saveUploadToken(uuid: string, token: string): void {
	try {
		sessionStorage.setItem(key(uuid), token);
	} catch {
		/* ignore */
	}
}

export function loadUploadToken(uuid: string): string | null {
	try {
		return sessionStorage.getItem(key(uuid));
	} catch {
		return null;
	}
}
