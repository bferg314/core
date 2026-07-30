# Core

A personal knowledge base: technical how-tos, machine setup runbooks, and
cheatsheets.

Published at **<https://bferg314.github.io/core>**.

Built with [Astro Starlight](https://starlight.astro.build) — full-text search,
dark mode, and copy buttons on every code block, with content as plain Markdown.

## Adding a page

Create a Markdown file in the right folder. That's the whole process — the
sidebar for every section is generated from the filesystem, so there's no index
or route to update.

```
src/content/docs/
├── index.mdx           # landing page
├── setup/              # Machine Setup — provisioning a box from scratch
├── howto/              # How-To — one task, start to finish
├── cheatsheets/        # Cheatsheets — dense command references
└── meta/               # Meta — docs about this site
```

Minimum frontmatter:

```yaml
---
title: Configure Tailscale
description: Set up a tailnet and connect a headless Linux box to it.
---
```

Use `.mdx` instead of `.md` if you want components like tabs or steps.

Full conventions, including all the Starlight components worth knowing, are in
[`src/content/docs/meta/adding-knowledge.md`](src/content/docs/meta/adding-knowledge.md)
— which is also published as a page on the site.

Agents working in this repo should read [`AGENTS.md`](AGENTS.md).

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321/core` |
| `npm run build` | Check links, then build to `./dist/` |
| `npm run check` | Validate internal links only |
| `npm run preview` | Serve the built site locally |

`npm run build` is the check that matters before pushing: it catches broken
internal links, wrong file extensions, missing base paths, and invalid
frontmatter.

Link between pages with a relative path to the target file, extension included:

```md
See [the SSH guide](../howto/ssh-keys.mdx).
```

A small rehype plugin turns that into `/core/howto/ssh-keys/` at build time, so
no page has to know the base path.

## Deployment

Pushing to `main` builds and deploys via GitHub Actions
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source →
GitHub Actions**.

Because the site is served from a subpath, `astro.config.mjs` sets:

```js
site: 'https://bferg314.github.io',
base: '/core',
```

Both must stay in sync with the repo name or every asset URL breaks.
