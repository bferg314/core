# Core — agent instructions

This repo is a personal knowledge base published with Astro Starlight to
<https://bferg314.github.io/core>. Its content is technical how-tos, machine
setup runbooks, cheatsheets, and philosophical writing.

**Most requests here are "add or edit a page," not "change the site."** Adding
knowledge should touch exactly one Markdown file. If you find yourself editing
`astro.config.mjs` to publish a page, stop — you're doing it the hard way.

## Adding a page

1. Pick the folder from the table below.
2. Create a `.md` file (or `.mdx` if you need components).
3. Frontmatter needs `title` and `description`. Nothing else is required.

The sidebar is `autogenerate`d per directory, so the file appears in the nav on
its own. There is no index to update.

| Folder under `src/content/docs/` | Section | Contents |
| --- | --- | --- |
| `setup/` | Machine Setup | Provisioning a machine from scratch, one page per platform |
| `howto/` | How-To | A single task with a beginning and an end |
| `cheatsheets/` | Cheatsheets | Dense command references, meant to be scanned |
| `philosophy/` | Philosophy | Non-technical writing, essays, principles |
| `meta/` | Meta | Docs about this site itself |

Creating a **new top-level folder** requires adding a `sidebar` entry in
`astro.config.mjs`. Don't do it casually — prefer the closest existing section.
If nothing fits, ask.

## Writing conventions

The full, canonical version of these lives in
`src/content/docs/meta/adding-knowledge.md` — read it before writing a page, and
update it if conventions change. In short:

- **No `# Heading` at the top of the body.** Starlight renders `title` as the h1.
- **Lead with the command**, explain after. The reader is in a hurry.
- **One copy-pasteable block per step.** Never mix a command and its output in the
  same fence — it breaks the copy button's usefulness.
- **Use real values, not placeholders.** `-C "bryan@desktop"`, not `-C "<comment>"`.
- **Label file contents with `title=`**, e.g. ```` ```bash title="~/.ssh/config" ````.
  Commands to run get no title.
- **State the shell and OS** when it matters. Use `<Tabs syncKey="os">` for
  per-platform variants so the whole site switches together.
- **Warn before destructive commands** with `:::caution` or `:::danger`.

## Links between pages

Use a relative path to the target file, **with its real extension**:

```md
See [SSH Keys](../howto/ssh-keys.mdx) and [Git](../cheatsheets/git.md).
```

The extension must match the real file. `plugins/rehype-doc-links.mjs` rewrites
these at build time and applies the `/core` base path, preserving `#anchors`.
Astro does **not** do this on its own for content collections, so don't remove
the plugin. Never hand-write site-absolute paths like `/howto/ssh-keys/` in
prose — they 404 under the base path.

The exception is `src/content/docs/index.mdx`, where `<LinkCard>` and hero
`actions` take raw hrefs that nothing rewrites. Those must include the base:
`/core/howto/ssh-keys/`.

## Verifying

```bash
npm run build
```

This runs `scripts/check-links.mjs` and then `astro build`. It fails on broken
internal links, wrong extensions, missing base paths, bad frontmatter, and MDX
syntax errors. Run it before reporting a content change as done.

Links only, for a fast loop:

```bash
npm run check
```

Note that errors thrown from inside a rehype plugin do **not** fail `astro
build` — that's why link validation is a separate script rather than part of the
plugin.

For a dev server, use background mode so it doesn't block:

```bash
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. `site` and `base` in `astro.config.mjs` must stay
`https://bferg314.github.io` and `/core` respectively, or every asset URL breaks.

## Reference

- Starlight components and frontmatter: <https://starlight.astro.build>
- Astro content collections: <https://docs.astro.build/en/guides/content-collections/>
