import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Rewrites relative links between docs pages so authors can write a plain
 * relative path to the target file:
 *
 *     [SSH Keys](../howto/ssh-keys.mdx)  ->  /core/howto/ssh-keys/
 *     [Git](../cheatsheets/git.md#stash) ->  /core/cheatsheets/git/#stash
 *
 * Astro does not resolve these inside content collections, and hand-writing
 * absolute URLs means hard-coding the `/core` base path into every page. This
 * keeps pages base-agnostic and safe to move between folders.
 *
 * A link whose target is missing is left untouched and warned about here;
 * `scripts/check-links.mjs` is what actually fails the build, because errors
 * thrown from a rehype plugin don't change Astro's exit code.
 */
export function rehypeDocLinks({ base = '', docsDir }) {
	const root = path.resolve(docsDir);
	const prefix = base.replace(/\/$/, '');

	return function transformer(tree, file) {
		const from = file?.path ?? file?.history?.[0];
		if (!from) return;

		visitAnchors(tree, (node) => {
			const href = node.properties?.href;
			if (typeof href !== 'string') return;

			// Only touch relative links that point at a Markdown file.
			if (!/^\.{1,2}\//.test(href) && !/^[\w.-]+\.mdx?(#|$)/.test(href)) return;

			const [target, hash = ''] = splitHash(href);
			if (!/\.mdx?$/.test(target)) return;

			const absolute = path.resolve(path.dirname(from), target);
			if (!existsSync(absolute)) {
				console.warn(
					`[doc-links] Broken link in ${path.relative(process.cwd(), from)}: ` +
						`"${href}" points at a file that does not exist.`
				);
				return;
			}

			node.properties.href = prefix + toUrlPath(absolute, root) + hash;
		});
	};
}

function splitHash(href) {
	const i = href.indexOf('#');
	return i === -1 ? [href, ''] : [href.slice(0, i), href.slice(i)];
}

/** `<docs>/setup/linux.mdx` -> `/setup/linux/`; an `index` file -> its folder. */
function toUrlPath(absolute, root) {
	const segments = path
		.relative(root, absolute)
		.split(path.sep)
		.join('/')
		.replace(/\.mdx?$/, '')
		.split('/');

	if (segments.at(-1) === 'index') segments.pop();

	return segments.length ? `/${segments.join('/')}/` : '/';
}

function visitAnchors(node, fn) {
	if (node.type === 'element' && node.tagName === 'a') fn(node);
	for (const child of node.children ?? []) visitAnchors(child, fn);
}
