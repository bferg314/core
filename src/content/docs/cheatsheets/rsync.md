---
title: rsync
description: Copy and sync files locally or over SSH — the flags that matter, the trailing slash rule, and how not to delete the wrong side.
sidebar:
  order: 2
---

Only transfers the parts of files that changed, which is why it beats `cp` and
`scp` for anything large or repeated.

## The trailing slash rule

This is the one thing to get right, and the only rsync mistake that silently
does the wrong thing rather than failing.

| Command | Result |
| --- | --- |
| `rsync -av ~/photos/ /mnt/backup/photos/` | Contents of `photos` land **in** `backup/photos` |
| `rsync -av ~/photos /mnt/backup/photos/` | Creates `/mnt/backup/photos/photos` |

A trailing slash on the **source** means "the contents of this directory." No
slash means "this directory itself." The destination's slash doesn't matter.

## Everyday copies

Local, preserving everything:

```bash
rsync -av ~/photos/ /mnt/backup/photos/
```

To a remote host, compressed:

```bash
rsync -avz ~/photos/ bryan@10.0.0.14:/srv/backup/photos/
```

Pulling the other direction — source and destination just swap:

```bash
rsync -avz bryan@10.0.0.14:/srv/backup/photos/ ~/photos/
```

With a `Host` alias from your [SSH config](../howto/ssh-keys.mdx#write-an-ssh-config),
the user and port come along for free:

```bash
rsync -avz ~/photos/ homelab:/srv/backup/photos/
```

## Flags

| Flag | What it does |
| --- | --- |
| `-a` | Archive mode — recursive, preserves permissions, times, symlinks, ownership |
| `-v` | Verbose. `-vv` for more than you want |
| `-z` | Compress in transit. Worth it over a WAN, a waste on a LAN or to local disk |
| `-h` | Human-readable sizes |
| `-n` | Dry run. Same as `--dry-run` |
| `-e 'ssh -p 2222'` | Use a non-default SSH port |
| `--progress` | Per-file progress. Add `--info=progress2` for one total instead |
| `--partial` | Keep partially transferred files so an interrupted run resumes |
| `--delete` | Remove files at the destination that no longer exist at the source |
| `--exclude=PATTERN` | Skip matching paths. Repeatable |
| `--bwlimit=1000` | Cap at 1000 KB/s |
| `--backup --backup-dir=DIR` | Move overwritten files aside instead of losing them |
| `--chown=user:group` | Set ownership at the destination (needs root) |

`-a` already implies `-r`, so `-avr` is redundant.

## Dry run first

```bash
rsync -avn --delete ~/photos/ /mnt/backup/photos/
```

Prints exactly what would be transferred and deleted, changing nothing. Drop the
`n` once the output looks right.

## Mirroring

```bash
rsync -av --delete ~/photos/ /mnt/backup/photos/
```

:::danger
`--delete` makes the destination match the source by **deleting** anything else
there. One misplaced trailing slash, or the two paths in the wrong order, and it
empties the wrong directory. Always run it with `-n` first.
:::

Safer variant — overwritten and deleted files move aside instead of vanishing:

```bash
rsync -av --delete --backup --backup-dir=/mnt/backup/replaced-$(date +%F) ~/photos/ /mnt/backup/photos/
```

## Excluding things

```bash
rsync -av --exclude='*.log' --exclude='node_modules/' --exclude='.cache/' ~/code/ homelab:/srv/backup/code/
```

Keep a list in a file instead, one pattern per line:

```bash
rsync -av --exclude-from=$HOME/.rsync-ignore ~/code/ homelab:/srv/backup/code/
```

Include only one type, which needs the catch-all exclude **after** the include:

```bash
rsync -av --include='*/' --include='*.txt' --exclude='*' ~/notes/ /mnt/backup/notes/
```

Order matters: rsync takes the first rule that matches. `--include='*/'` is what
lets it walk into subdirectories at all.

## Big or flaky transfers

Resumable, with a single overall progress line:

```bash
rsync -avz --partial --info=progress2 ~/isos/ homelab:/srv/isos/
```

Retry until it finishes, for a link that keeps dropping:

```bash
until rsync -avz --partial ~/isos/ homelab:/srv/isos/; do sleep 10; done
```

Leave bandwidth for everything else:

```bash
rsync -avz --bwlimit=2000 ~/isos/ homelab:/srv/isos/
```

## Checking without copying

What differs between two trees, transferring nothing:

```bash
rsync -avn --delete --itemize-changes ~/photos/ /mnt/backup/photos/
```

The `--itemize-changes` prefix tells you *why* each file is listed — `>f.st....`
means a file whose size and time differ. The letters after `>f` are the
attributes that changed.

Compare contents rather than size and timestamp, which is slow but catches
corruption:

```bash
rsync -avnc ~/photos/ /mnt/backup/photos/
```

## Gotchas

- **`sudo` on the local side doesn't apply to the remote side.** To preserve
  ownership onto a remote host you need root *there*:
  `rsync -av --rsync-path="sudo rsync" ~/etc-backup/ homelab:/srv/etc/`
- **Ownership silently downgrades** without root — files arrive owned by the
  connecting user. `-a` asked for ownership; it just couldn't deliver it.
- **`--delete` does nothing without `-r` or `-a`.** No recursion, no deletion.
- **Windows paths need care.** From Git Bash, `rsync -av /c/Users/bryan/photos/`
  works; `C:\Users\...` does not — rsync reads `C:` as a hostname.
