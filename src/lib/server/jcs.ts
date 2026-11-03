// RFC 8785 JSON Canonicalization Scheme. Agent and server must canonicalize the
// signed payload identically, byte for byte, or the signature check fails. Our
// result payloads are flat objects of strings, but this handles nested objects,
// arrays, finite numbers, booleans and null for completeness.
//
// String and number serialization defer to JSON.stringify, which already emits
// the ECMAScript JSON form RFC 8785 mandates; we only add sorted object keys and
// recursion. Non-finite numbers are rejected (JSON.stringify would emit `null`).
export function canonicalize(value: unknown): string {
	if (value === null) return 'null';
	const t = typeof value;
	if (t === 'boolean' || t === 'string') return JSON.stringify(value);
	if (t === 'number') {
		if (!Number.isFinite(value)) throw new Error('JCS: non-finite number');
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
	if (t === 'object') {
		const obj = value as Record<string, unknown>;
		const keys = Object.keys(obj).sort(); // default sort = UTF-16 code-unit order
		return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
	}
	throw new Error(`JCS: unsupported value of type ${t}`);
}
