---
title: Zellij
description: Panes, tabs, and sessions in Zellij — the modal keybindings, the CLI, and what the tmux equivalents are.
sidebar:
  order: 4
---

Zellij is modal like vim: a prefix key puts you in a mode, and then single letters
act. The status bar always shows the current mode and its keys, which is why you can
get productive before memorizing anything.

Everything below assumes the default keybindings. If you came from tmux, skip to
[the translation table](#coming-from-tmux).

## Modes

<kbd>Esc</kbd> or <kbd>Enter</kbd> returns to normal mode from any of these.

| Prefix | Mode | For |
| --- | --- | --- |
| <kbd>Ctrl</kbd>+<kbd>p</kbd> | Pane | Splitting, closing, focusing panes |
| <kbd>Ctrl</kbd>+<kbd>t</kbd> | Tab | Creating and moving between tabs |
| <kbd>Ctrl</kbd>+<kbd>n</kbd> | Resize | Growing and shrinking the focused pane |
| <kbd>Ctrl</kbd>+<kbd>h</kbd> | Move | Relocating a pane within the layout |
| <kbd>Ctrl</kbd>+<kbd>s</kbd> | Scroll / Search | Scrollback and searching it |
| <kbd>Ctrl</kbd>+<kbd>o</kbd> | Session | Detaching, session manager, config |
| <kbd>Ctrl</kbd>+<kbd>g</kbd> | Lock | Passes every key through to the program inside |
| <kbd>Ctrl</kbd>+<kbd>q</kbd> | — | Quit Zellij, killing the session |

:::caution
Those prefixes collide with things you already use — <kbd>Ctrl</kbd>+<kbd>p</kbd>
and <kbd>Ctrl</kbd>+<kbd>n</kbd> in shell history, <kbd>Ctrl</kbd>+<kbd>s</kbd> in
reverse search, <kbd>Ctrl</kbd>+<kbd>o</kbd> in vim's jump list, and
<kbd>Ctrl</kbd>+<kbd>t</kbd> in fzf. This is the single most common reason people
bounce off Zellij.

Two ways out: <kbd>Ctrl</kbd>+<kbd>g</kbd> to lock while you work in the offending
program, or switch to the shipped **unlock-first** preset, where nothing is bound
until you press <kbd>Ctrl</kbd>+<kbd>g</kbd> first. Dump the config (below) — the
presets are in there with comments.
:::

## Panes

<kbd>Ctrl</kbd>+<kbd>p</kbd>, then:

| Key | Does |
| --- | --- |
| `n` | New pane |
| `d` | Split down |
| `r` | Split right |
| `h` `j` `k` `l` | Focus left, down, up, right |
| `p` | Focus the next pane in order |
| `x` | Close the focused pane |
| `f` | Toggle fullscreen for the focused pane |
| `w` | Toggle floating panes |
| `e` | Embed a floating pane, or float an embedded one |
| `c` | Rename the pane |
| `z` | Toggle pane frames |

Without entering pane mode at all, from normal mode:

| Key | Does |
| --- | --- |
| <kbd>Alt</kbd>+<kbd>n</kbd> | New pane |
| <kbd>Alt</kbd>+<kbd>h</kbd>/<kbd>j</kbd>/<kbd>k</kbd>/<kbd>l</kbd> | Move focus |
| <kbd>Alt</kbd>+<kbd>=</kbd> / <kbd>Alt</kbd>+<kbd>-</kbd> | Grow / shrink |
| <kbd>Alt</kbd>+<kbd>f</kbd> | Toggle floating panes |
| <kbd>Alt</kbd>+<kbd>[</kbd> / <kbd>Alt</kbd>+<kbd>]</kbd> | Cycle swap layouts |

The <kbd>Alt</kbd> bindings are what you'll actually use day to day. Mode prefixes
are for the less frequent operations.

Floating panes are the underrated feature — <kbd>Alt</kbd>+<kbd>f</kbd> gets you a
scratch shell over the top of your layout without disturbing it, and again to
dismiss it.

## Tabs

<kbd>Ctrl</kbd>+<kbd>t</kbd>, then:

| Key | Does |
| --- | --- |
| `n` | New tab |
| `x` | Close tab |
| `r` | Rename tab |
| `h` `l` | Previous, next tab |
| `1`–`9` | Jump to tab N |
| <kbd>Tab</kbd> | Toggle between the last two tabs |
| `s` | Sync — typing goes to **every pane in the tab at once** |
| `b` | Break the focused pane out into its own tab |
| `]` `[` | Move the focused pane to the next / previous tab |

Sync mode is how you run the same command on four servers at once. It's also easy
to leave on by accident, so watch the status bar.

## Resize and move

<kbd>Ctrl</kbd>+<kbd>n</kbd> for resize: `h` `j` `k` `l` grow toward that
direction, `+` and `-` scale the pane as a whole.

<kbd>Ctrl</kbd>+<kbd>h</kbd> for move: `h` `j` `k` `l` relocate the pane itself,
<kbd>Tab</kbd> cycles it through positions.

## Scrollback and search

<kbd>Ctrl</kbd>+<kbd>s</kbd>, then:

| Key | Does |
| --- | --- |
| `j` `k` | Scroll a line |
| <kbd>Ctrl</kbd>+<kbd>f</kbd> / <kbd>Ctrl</kbd>+<kbd>b</kbd> | Page forward, back |
| `d` `u` | Half page |
| `s` | Search — then `n` / `p` for next and previous hit |
| `e` | Open the whole scrollback in `$EDITOR` |

`e` is the one to remember. Rather than fighting a pager, you get the entire buffer
in vim, where you can search, yank, and save it.

## Sessions

<kbd>Ctrl</kbd>+<kbd>o</kbd>, then `d` detaches — the session keeps running with
everything in it. `w` opens the session manager, which lists sessions and lets you
switch or resurrect them without leaving Zellij.

From the shell:

```bash
zellij                             # start a new session, auto-named
zellij -s core                     # start one called "core"
zellij ls                          # list sessions, running and exited
zellij a core                      # attach
zellij a -c core                   # attach, creating it if it doesn't exist
zellij a -f core                   # force-attach, detaching whoever else is on it
```

Cleaning up:

```bash
zellij kill-session core
zellij ka                          # kill all sessions
zellij delete-session core         # remove a dead session's saved state
zellij da                          # delete all dead sessions
```

Zellij serializes exited sessions to disk, so `zellij ls` shows dead ones and
`zellij a` on a dead name resurrects the layout. That's also why `kill` and
`delete` are separate verbs.

## Driving it from outside

Every keybinding is also a CLI action, which makes Zellij scriptable in a way tmux
mostly isn't:

```bash
zellij run -- htop                             # open a new pane running htop
zellij run --floating -- htop                  # ...as a floating pane
zellij run -d right -- npm run dev             # ...split to the right
zellij edit ~/.config/zellij/config.kdl        # open a file in a new pane
zellij action new-tab --name logs
zellij action rename-pane "build"
zellij action write-chars "npm test"
zellij action close-pane
```

`zellij action` only affects the session you're inside; add `-s NAME` to target
another one. This is how you script a project workspace without writing a layout
file.

## Layouts

Layouts are KDL files that describe a set of tabs and panes, optionally with
commands already running:

```kdl title="~/.config/zellij/layouts/core.kdl"
layout {
    tab name="edit" focus=true {
        pane command="nvim"
    }
    tab name="build" {
        pane split_direction="vertical" {
            pane command="npm" {
                args "run" "dev"
            }
            pane
        }
    }
}
```

```bash
zellij --layout core
```

A layout named `default.kdl` in that directory applies to every new session. Point
at a file anywhere with `zellij --layout ./project-layout.kdl`, which is worth
committing alongside a repo.

## Config

```bash
mkdir -p ~/.config/zellij
zellij setup --dump-config > ~/.config/zellij/config.kdl
```

That writes the full default config with every option commented — the fastest way
to learn what's available.

```kdl title="~/.config/zellij/config.kdl"
theme "gruvbox-dark"
default_shell "bash"
pane_frames false               // reclaim a line and a column per pane
mouse_mode true
copy_on_select true
scroll_buffer_size 50000
copy_command "wl-copy"          // xclip -sel clip on X11, pbcopy on macOS
session_serialization true       // survive a reboot
```

Rebind a single key without redefining everything:

```kdl title="~/.config/zellij/config.kdl"
keybinds {
    normal {
        unbind "Ctrl o"          // give vim's jump list back
    }
}
```

Check a config before it bites you:

```bash
zellij setup --check
```

## Coming from tmux

| tmux | Zellij |
| --- | --- |
| `tmux new -s name` | `zellij -s name` |
| `tmux attach -t name` | `zellij a name` |
| `tmux ls` | `zellij ls` |
| `tmux kill-session -t name` | `zellij kill-session name` |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `%` | <kbd>Ctrl</kbd>+<kbd>p</kbd> `r` |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `"` | <kbd>Ctrl</kbd>+<kbd>p</kbd> `d` |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `o` / arrows | <kbd>Alt</kbd>+<kbd>h</kbd>/<kbd>j</kbd>/<kbd>k</kbd>/<kbd>l</kbd> |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `z` | <kbd>Ctrl</kbd>+<kbd>p</kbd> `f` |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `c` | <kbd>Ctrl</kbd>+<kbd>t</kbd> `n` |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `,` | <kbd>Ctrl</kbd>+<kbd>t</kbd> `r` |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `d` | <kbd>Ctrl</kbd>+<kbd>o</kbd> `d` |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `[` | <kbd>Ctrl</kbd>+<kbd>s</kbd> |
| <kbd>Ctrl</kbd>+<kbd>b</kbd> `x` | <kbd>Ctrl</kbd>+<kbd>p</kbd> `x` |
| `setw synchronize-panes` | <kbd>Ctrl</kbd>+<kbd>t</kbd> `s` |
| `.tmux.conf` | `~/.config/zellij/config.kdl` (KDL, not shell) |
| `tmuxinator` / `tmux source` | Layouts, built in |

The differences that matter beyond keys:

- **No prefix-then-key for everything.** Frequent operations are direct
  <kbd>Alt</kbd> chords; modes are for the rest.
- **The status bar teaches itself.** You don't need a cheatsheet open, which is
  faintly ironic given this page.
- **Sessions persist across reboots** with `session_serialization`, including pane
  layout — tmux needs `tmux-resurrect` for that.
- **Floating panes** have no real tmux equivalent (popups are close, but transient).
- **No nested-session prefix problem.** SSH into a box running Zellij and lock the
  outer one with <kbd>Ctrl</kbd>+<kbd>g</kbd>.

## Gotchas

- **Locked mode looks broken.** If no keybinding responds, you're in locked mode —
  <kbd>Ctrl</kbd>+<kbd>g</kbd> to get out. The status bar says `LOCK`.
- **Copy needs a helper on Linux.** Set `copy_command` to `wl-copy` on Wayland or
  `xclip -sel clip` on X11, otherwise copies only reach Zellij's internal buffer.
- **`Ctrl+q` kills the session, it doesn't detach.** Detach is
  <kbd>Ctrl</kbd>+<kbd>o</kbd> `d`. Worth rebinding if muscle memory keeps costing
  you a session.
- **Dead sessions accumulate.** `zellij ls` lists exited ones taking up disk;
  `zellij da` clears them.
- **`pane_frames false` breaks mouse pane-resizing** — the frame is the drag
  handle. Keep frames if you resize with the mouse.
