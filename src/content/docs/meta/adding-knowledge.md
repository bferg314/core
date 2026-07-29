---
title: Adding Knowledge
description: The conventions for adding a page to this knowledge base — written for both humans and AI agents.
sidebar:
  order: 1
---

This page is the contract. Follow it and a new page shows up in the right place
in the nav with no config changes.

## The short version

1. Create a Markdown file in the right folder under `src/content/docs/`.
2. Give it `title` and `description` frontmatter.
3. Done. The sidebar picks it up automatically.

There is no index to update and no route to register. The sidebar for every
section uses Starlight's `autogenerate`, so **the filesystem is the navigation.**

## Where things go

| Folder | Section | What belongs there |
| --- | --- | --- |
| `setup/` | Machine Setup | Provisioning a machine from scratch. One page per platform. |
| `howto/` | How-To | A single task with a beginning and an end. "Configure X", "Set up Y". |
| `cheatsheets/` | Cheatsheets | Dense command references you scan, not read. |
| `philosophy/` | Philosophy | Non-technical thinking. Essays, principles, notes. |
| `meta/` | Meta | Docs about this site itself. |

If a page doesn't fit any of these, put it in the closest match rather than
inventing a folder. New folders require a `sidebar` entry in
`astro.config.mjs`, so they're a deliberate decision, not a default.

## Required frontmatter

Only two fields are required:

```yaml
---
title: Configure Tailscale
description: Set up a Tailscale tailnet and connect a headless Linux box to it.
---
```

`title` becomes the `<h1>`, the sidebar label, and the browser tab. Never write
your own `# Heading` at the top of the body — Starlight renders the title for
you, and a second one looks broken.

`description` is used for search results and link previews. Write a full
sentence describing what the reader will accomplish.

## Useful optional frontmatter

```yaml
---
title: New Windows Machine
description: Provision a fresh Windows install with winget.
sidebar:
  order: 1        # lower numbers sort first; unordered pages go last, alphabetically
  label: Windows  # shorter text for the sidebar only
  badge: New      # a little pill next to the nav entry
tableOfContents:
  maxHeadingLevel: 4   # default only shows h2 and h3
---
```

## Writing style

This is a personal reference, not documentation for strangers. Optimize for the
reader being **you, in a hurry, six months from now.**

- **Lead with the command.** Explain after, if at all. Don't make someone read a
  paragraph to find the one line they need.
- **One code block per step.** A block should be safe to copy whole and paste
  into a terminal. Don't mix a command and its output in one block.
- **Real values, not metasyntax.** Write `ssh-keygen -t ed25519 -C "bryan@desktop"`,
  not `ssh-keygen -t <type> -C "<comment>"`. Concrete examples are faster to adapt.
- **Say which shell and which OS.** A block that only works in PowerShell must
  say so. Use tabs (below) when a task differs by platform.
- **Prefer flags over interactive prompts.** Anything that can be a one-liner
  should be one.

## Components worth knowing

To use components, the file must be `.mdx` rather than `.md`, and you import
them at the top of the body:

```mdx
import { Tabs, TabItem, Steps, Aside, Code, FileTree } from '@astrojs/starlight/components';
```

### Tabs — for per-platform variants

````mdx
<Tabs syncKey="os">
	<TabItem label="Windows">
		```powershell
		winget install Git.Git
		```
	</TabItem>
	<TabItem label="Linux">
		```bash
		sudo apt install -y git
		```
	</TabItem>
</Tabs>
````

`syncKey="os"` is worth applying consistently — tab groups sharing a key switch
together across the whole site, and the choice is remembered between pages.

### Steps — for ordered procedures

```mdx
<Steps>

1. Do the first thing.

2. Do the second thing.

</Steps>
```

### Asides — for warnings and side notes

```md
:::caution
This overwrites an existing key without asking.
:::

:::tip[Faster way]
Use `ssh-copy-id` if the server allows password auth.
:::
```

Available types: `note`, `tip`, `caution`, `danger`.

## Code block features

Code fences run through Expressive Code, so a copy button comes for free. A few
annotations are worth using:

````md
```bash title="~/.ssh/config"
Host github.com
	IdentityFile ~/.ssh/id_ed25519
```

```bash {2} "id_ed25519"
# line 2 is highlighted, and every "id_ed25519" is marked
ssh-add ~/.ssh/id_ed25519
```

```bash frame="none"
# no window chrome
```
````

Use `title=` whenever a block is a **file's contents** rather than a command to
run. It's the clearest signal of the difference, and it makes the copy button
mean the right thing.

## Linking between pages

Link to other pages using a **relative path to the target file, including its
real extension** — `.mdx` for pages that use components, `.md` otherwise:

```md
See [the SSH guide](../howto/ssh-keys.mdx) for key generation.
See [the git cheatsheet](../cheatsheets/git.md) for recovery commands.
```

A local rehype plugin (`plugins/rehype-doc-links.mjs`) rewrites these into real
URLs at build time and applies the `/core` base path, so
`../howto/ssh-keys.mdx` becomes `/core/howto/ssh-keys/`. Anchors are preserved:
`../setup/linux.mdx#lock-down-ssh` works.

The reason to write links this way rather than as finished URLs: pages stay
movable, the base path exists in exactly one place, and a typo becomes a build
failure instead of a 404 you find months later.

Don't hand-write site-absolute links like `/howto/ssh-keys/` in prose. Without
the base path they 404 in production, and the link checker rejects them.

:::caution[The one exception]
The landing page (`src/content/docs/index.mdx`) uses `<LinkCard>` and hero
`actions`, which take raw hrefs that nothing rewrites. Those must spell out the
base path: `/core/howto/ssh-keys/`.
:::

## Check your work

```bash
npm run dev
```

The dev server runs at `localhost:4321/core` — note the base path; the bare root
will 404.

Before pushing:

```bash
npm run build
```

This runs the link checker first, then the Astro build. It fails on a broken
internal link, a wrong extension, a missing base path, and on invalid frontmatter
or MDX syntax — so a green build is a real signal.

To check links alone, without a full build:

```bash
npm run check
```
