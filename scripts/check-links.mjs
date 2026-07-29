/**
 * Validates internal links across the knowledge base, then exits non-zero if
 * any are broken. Runs as part of `npm run build`.
 *
 * Checks:
 *   - relative links to a Markdown file resolve to a file that exists
 *   - absolute site links include the `/core` base path
 *   - absolute site links point at a page that exists
 *
 * Links inside fenced code blocks and inline code are ignored, so documentation
 * that shows example links doesn't trip the checker.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const BASE = '/core';
const DOCS = path.resolve('src/content/docs');

const errors = [];
const warnings = [];

for (const file of walk(DOCS)) {
	const rel = path.relative(process.cwd(), file);
	const source = stripCode(readFileSync(file, 'utf8'));

	for (const href of extractLinks(source)) {
		if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;

		if (href.startsWith('/')) {
			checkAbsolute(href, rel);
		} else if (/\.mdx?($|#)/.test(href)) {
			checkRelativeFile(href, file, rel);
		} else if (/^\.{1,2}\//.test(href)) {
			warnings.push(
				`${rel}: "${href}" is relative but not a Markdown file path. ` +
					`Prefer a path to the file itself, e.g. ../howto/ssh-keys.mdx`
			);
		}
	}
}

function checkAbsolute(href, rel) {
	if (!href.startsWith(BASE + '/') && href !== BASE) {
		errors.push(
			`${rel}: "${href}" is missing the ${BASE} base path, so it will 404 in ` +
				`production. Use a relative Markdown path in prose, or "${BASE}${href}" ` +
				`in components that take a raw href.`
		);
		return;
	}
	if (!resolvePage(href.slice(BASE.length))) {
		errors.push(`${rel}: "${href}" does not match any page.`);
	}
}

function checkRelativeFile(href, file, rel) {
	const target = href.split('#')[0];
	const absolute = path.resolve(path.dirname(file), target);

	if (!existsSync(absolute)) {
		const swapped = absolute.replace(/\.mdx?$/, (e) => (e === '.md' ? '.mdx' : '.md'));
		const hint = existsSync(swapped) ? ` Did you mean "${path.basename(swapped)}"?` : '';
		errors.push(`${rel}: "${href}" points at a file that does not exist.${hint}`);
		return;
	}
	if (!absolute.startsWith(DOCS)) {
		errors.push(`${rel}: "${href}" points outside src/content/docs.`);
	}
}

/** `/setup/windows/` -> the file backing that route, or undefined. */
function resolvePage(urlPath) {
	const slug = urlPath.replace(/^\/|\/$/g, '');
	const candidates = slug
		? [`${slug}.md`, `${slug}.mdx`, `${slug}/index.md`, `${slug}/index.mdx`]
		: ['index.md', 'index.mdx'];
	return candidates.find((c) => existsSync(path.join(DOCS, c)));
}

/** Markdown links, JSX href attributes, and frontmatter `link:` values. */
function extractLinks(source) {
	const patterns = [
		/\]\(\s*([^\s)]+)/g, // [text](href)
		/href=["']([^"']+)["']/g, // <LinkCard href="..." />
		/^\s*link:\s*["']?([^\s"']+)/gm, // hero actions in frontmatter
	];
	return patterns.flatMap((re) => [...source.matchAll(re)].map((m) => m[1]));
}

/** Remove fenced blocks and inline code so examples aren't validated. */
function stripCode(source) {
	return source
		.replace(/^([ \t]*)(`{3,}|~{3,})[\s\S]*?^\1?\2[ \t]*$/gm, '')
		.replace(/`[^`\n]*`/g, '');
}

function walk(dir) {
	return readdirSync(dir).flatMap((entry) => {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) return walk(full);
		return /\.mdx?$/.test(entry) ? [full] : [];
	});
}

for (const w of warnings) console.warn(`warning  ${w}`);
for (const e of errors) console.error(`error    ${e}`);

if (errors.length) {
	console.error(`\n${errors.length} broken link(s) found.`);
	process.exit(1);
}
console.log(`Links OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}.`);
