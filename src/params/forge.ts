import type { ParamMatcher } from '@sveltejs/kit';

// Forges whose projects live at the site root: /<forge>/<owner>/<repo>.
export const match: ParamMatcher = (param) => param === 'github' || param === 'gitlab';
