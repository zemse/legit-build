import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Old /p/<forge>/<owner>/<repo>[/releases/<tag>] links: projects now live at the root.
export const GET: RequestHandler = ({ params, url }) => {
	throw redirect(308, `/${params.path}${url.search}`);
};
