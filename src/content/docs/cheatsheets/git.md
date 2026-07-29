---
title: Git
description: The git commands that never stick — undoing things, rewriting history, and recovering from mistakes.
sidebar:
  order: 1
---

Weighted toward undo and recovery, because those are the commands you need under
pressure and can never remember.

## Undoing things

The decision that matters is whether the change is already committed, and whether
it's already pushed.

| Situation | Command |
| --- | --- |
| Unstage a file, keep the edits | `git restore --staged file.txt` |
| Discard uncommitted edits to a file | `git restore file.txt` |
| Discard **all** uncommitted edits | `git reset --hard` |
| Undo last commit, keep changes staged | `git reset --soft HEAD~1` |
| Undo last commit, keep changes unstaged | `git reset HEAD~1` |
| Undo last commit, throw the work away | `git reset --hard HEAD~1` |
| Fix the last commit message | `git commit --amend` |
| Add a forgotten file to the last commit | `git add file && git commit --amend --no-edit` |
| Undo a commit that's already pushed | `git revert <sha>` |

:::danger
`git reset --hard` and `git restore` delete uncommitted work with no undo — the
reflog can't help, because it was never committed. Run `git stash` first if
you're unsure.
:::

Once a commit is pushed and others may have it, use `revert` (a new commit that
undoes it) rather than `reset` (rewriting shared history).

## The reflog saves you

Every position `HEAD` has held for the last 90 days, including commits you
"lost" to a bad reset or rebase:

```bash
git reflog
```

Go back to where you were:

```bash
git reset --hard HEAD@{2}
```

Or recover just the lost commit:

```bash
git cherry-pick <sha>
```

A deleted branch is recoverable the same way — find its last commit in the
reflog and `git branch recovered <sha>`.

## Stash

```bash
git stash push -m "half-done refactor"
git stash list
git stash show -p stash@{0}        # what's in it
git stash pop                      # apply and remove
git stash apply stash@{1}          # apply and keep
git stash drop stash@{0}
```

Include untracked files, which plain `stash` skips:

```bash
git stash push -u -m "wip with new files"
```

Stash only one file:

```bash
git stash push -m "just that one" path/to/file.js
```

## Rebase

Replay your commits on top of the latest upstream, for a linear history:

```bash
git pull --rebase origin main
```

Clean up your own commits before pushing — squash, reword, reorder, drop:

```bash
git rebase -i HEAD~5
```

In the editor, change `pick` to: `squash` (fold into previous), `reword` (change
message), `drop` (delete), or reorder the lines.

Escape hatches:

```bash
git rebase --continue
git rebase --skip
git rebase --abort      # back to before you started
```

:::caution
Only rebase commits you haven't shared. Rewriting pushed history forces everyone
else to recover manually. If you must, use `git push --force-with-lease` — it
refuses when someone else has pushed in the meantime, which `--force` happily
overwrites.
:::

## Inspecting

```bash
git log --oneline --graph --decorate --all
git log -p file.txt              # history of one file, with diffs
git log --follow -p file.txt     # ...including across renames
git log -S "functionName"        # commits that added/removed this string
git log --author="bryan" --since="2 weeks ago"
```

Who last touched each line, and why:

```bash
git blame file.txt
git show <sha>
```

What changed, precisely:

```bash
git diff                    # working tree vs staged
git diff --staged           # staged vs last commit
git diff main..feature      # between branches
git diff --stat             # summary only
```

Find the commit that introduced a bug, by bisection:

```bash
git bisect start
git bisect bad                  # current commit is broken
git bisect good v1.2.0          # this tag was fine
# test, then mark each step: git bisect good | git bisect bad
git bisect reset
```

## Branches

```bash
git switch -c feature/thing        # create and switch
git switch -                       # back to previous branch
git branch -d old-branch           # delete (safe — refuses if unmerged)
git branch -D old-branch           # delete (force)
git push origin --delete old-branch
```

Prune local refs to branches deleted on the remote:

```bash
git fetch --prune
```

List branches already merged into main, to clean up:

```bash
git branch --merged main
```

## Worktrees

Check out a second branch into its own directory, without stashing or switching:

```bash
git worktree add ../core-hotfix hotfix/urgent
git worktree list
git worktree remove ../core-hotfix
```

Much better than stashing when you need to fix something on main while
mid-feature — both trees stay usable and share one `.git` directory.

## Remotes

```bash
git remote -v
git remote set-url origin git@github.com:bferg314/core.git
git remote add upstream https://github.com/original/repo.git
```

Switch an existing clone from HTTPS to SSH — the fix when git suddenly starts
asking for a password:

```bash
git remote set-url origin git@github.com:bferg314/core.git
```

## Ignoring and untracking

A file already committed keeps being tracked even after you add it to
`.gitignore`. Untrack it without deleting it:

```bash
git rm --cached secrets.env
```

For a whole directory:

```bash
git rm -r --cached node_modules
```

Check why a path is being ignored — it names the rule and file:

```bash
git check-ignore -v path/to/file
```

## Cleaning

```bash
git clean -n          # dry run — ALWAYS do this first
git clean -fd         # delete untracked files and directories
git clean -fdx        # ...including ignored files (nukes node_modules, .env)
```

## Tags

```bash
git tag -a v1.0.0 -m "First release"
git push origin v1.0.0
git push origin --tags
git tag -d v1.0.0                    # local
git push origin --delete v1.0.0      # remote
```

## Config worth setting

```bash
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global push.autoSetupRemote true
git config --global diff.colorMoved zebra
git config --global rerere.enabled true
```

- **`push.autoSetupRemote`** — `git push` on a new branch just works, no
  `--set-upstream`.
- **`rerere.enabled`** — remembers how you resolved a conflict and replays it if
  the same one comes back. Pays for itself on any long rebase.

See where a setting came from:

```bash
git config --list --show-origin
```
