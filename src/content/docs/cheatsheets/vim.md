---
title: Vim
description: Modes, motions, operators, and text objects — plus how to get out of it.
sidebar:
  order: 3
---

Vim's keys aren't a list to memorize, they're a grammar: **operator + motion or
text object**. `d2w` is "delete two words" the same way `ci"` is "change inside
quotes." Learn the pieces and the combinations come free.

## Getting out

The thing you need first, and the reason vim has a reputation.

| Keys | Result |
| --- | --- |
| `:w` | Write |
| `:q` | Quit — refuses if there are unsaved changes |
| `:wq` or `:x` | Write and quit |
| `:q!` | Quit, discarding changes |
| `:qa!` | Quit all windows, discarding everything |
| `ZZ` | Write and quit, from normal mode |
| `:w !sudo tee %` | Write a root-owned file you opened without `sudo` |

## Modes

Everything below assumes you're in **normal** mode. <kbd>Esc</kbd> always gets you
back there; <kbd>Ctrl</kbd>+<kbd>[</kbd> does the same thing without reaching.

| Mode | Enter with | For |
| --- | --- | --- |
| Normal | <kbd>Esc</kbd> | Navigation and commands. The resting state |
| Insert | `i` `a` `I` `A` `o` `O` | Typing text |
| Visual | `v` `V` <kbd>Ctrl</kbd>+<kbd>v</kbd> | Selecting by character, line, block |
| Command | `:` | `:w`, `:s`, `:g`, and everything else |
| Replace | `R` | Overtyping |

The insert-mode keys differ in *where* they put you: `i` before the cursor, `a`
after it, `I` at the first non-blank of the line, `A` at end of line, `o` on a
new line below, `O` above.

## Moving

| Keys | Moves to |
| --- | --- |
| `h` `j` `k` `l` | Left, down, up, right |
| `w` `b` | Start of next / previous word |
| `e` `ge` | End of next / previous word |
| `0` `^` `$` | Start of line, first non-blank, end of line |
| `gg` `G` | First line, last line |
| `42G` or `:42` | Line 42 |
| `{` `}` | Previous / next paragraph |
| `%` | Matching bracket — sitting on one jumps to its pair |
| `f x` / `F x` | Next / previous `x` on this line |
| `t x` / `T x` | Just before next / after previous `x` |
| `;` `,` | Repeat the last `f`/`t` forward, backward |
| <kbd>Ctrl</kbd>+<kbd>d</kbd> / <kbd>Ctrl</kbd>+<kbd>u</kbd> | Half page down / up |
| <kbd>Ctrl</kbd>+<kbd>o</kbd> / <kbd>Ctrl</kbd>+<kbd>i</kbd> | Back / forward in the jump list |
| `zz` `zt` `zb` | Scroll so the current line is centered, at top, at bottom |

## Operators

An operator waits for a motion or text object.

| Operator | Does |
| --- | --- |
| `d` | Delete (and yank to the unnamed register) |
| `c` | Change — delete, then insert |
| `y` | Yank (copy) |
| `>` `<` | Indent, dedent |
| `=` | Auto-indent |
| `gu` `gU` | Lowercase, uppercase |
| `gq` | Reflow to `textwidth` |

Doubling an operator applies it to the whole line: `dd`, `yy`, `cc`, `>>`.

## Text objects

`i` means *inner* (contents only), `a` means *around* (including the delimiters
or trailing whitespace).

| Object | Is |
| --- | --- |
| `w` `W` | Word, WORD (whitespace-delimited) |
| `s` | Sentence |
| `p` | Paragraph |
| `"` `'` `` ` `` | Quoted string |
| `(` `)` or `b` | Parentheses |
| `{` `}` or `B` | Braces |
| `[` `]` | Brackets |
| `<` `>` | Angle brackets |
| `t` | HTML/XML tag |

Combine them:

```vim
di(        " delete inside parentheses
ci"        " change inside quotes
ca{        " change the braces and their contents
yip        " yank this paragraph
dit        " delete the contents of an HTML tag
d3w        " delete three words
ct;        " change up to the next semicolon
y$         " yank to end of line
dG         " delete to end of file
>i{        " indent everything inside the braces
ggVG       " select the entire file
```

## Repeating and undoing

| Keys | Does |
| --- | --- |
| `.` | Repeat the last change. The highest-value key in vim |
| `u` / <kbd>Ctrl</kbd>+<kbd>r</kbd> | Undo / redo |
| `U` | Undo all changes on the current line |
| `:earlier 5m` | Undo the last five minutes |
| `3.` | Repeat the last change three times |

`.` combined with a search is the everyday refactor: `/oldName`, then `cwnewName`
<kbd>Esc</kbd>, then `n.` `n.` `n.` for each remaining hit you want changed.

## Search and replace

| Keys | Does |
| --- | --- |
| `/pattern` `?pattern` | Search forward, backward |
| `n` `N` | Next, previous match |
| `*` `#` | Search for the word under the cursor, forward / backward |
| `:%s/old/new/g` | Replace everywhere |
| `:%s/old/new/gc` | ...confirming each one |
| `:%s/old/new/gi` | ...case-insensitively |
| `:s/old/new/g` | Current line only |
| `:'<,'>s/old/new/g` | Within the visual selection |
| `:noh` | Clear the search highlighting |

Run a command on every matching line:

```vim
:g/error/d           " delete all lines containing 'error'
:g!/error/d          " delete all lines NOT containing 'error'
:g/TODO/normal A !!  " append ' !!' to every TODO line
```

Use a different delimiter when the pattern has slashes in it — `:%s#/usr/local#/opt#g`
is much easier to read than escaping every one.

## Visual mode

| Keys | Does |
| --- | --- |
| `v` `V` | Select by character, by line |
| <kbd>Ctrl</kbd>+<kbd>v</kbd> | Block select — columns |
| `o` | Jump to the other end of the selection |
| `gv` | Reselect the last selection |
| `I` / `A` (block mode) | Insert / append on every selected line |

Block insert is how you comment out a range: <kbd>Ctrl</kbd>+<kbd>v</kbd>, `jjj`,
`I`, `# `, <kbd>Esc</kbd>.

## Registers, marks, macros

```vim
"ayy       " yank this line into register a
"ap        " paste from register a
:reg       " list all registers
```

The unnamed register is clobbered by every delete, which is why a delete-then-paste
pastes the wrong thing. Yank to a named register when you need it to survive, or
use `"0p` — register `0` holds the last *yank* specifically.

```vim
ma         " set mark a
```

Then `` `a `` jumps to that exact position, `'a` to the start of its line, and
`` `. `` to the last change. Marks are per-file for lowercase letters, global for
uppercase.

Macros are just recorded keystrokes:

```vim
qa         " start recording into register a
q          " stop recording
@a         " play it back
@@         " play the last macro again
100@a      " play it 100 times, stopping at the first error
```

## System clipboard

```vim
"+y        " yank to the system clipboard
"+p        " paste from it
```

Make it the default:

```vim
set clipboard=unnamedplus
```

Check your build actually supports it — `-clipboard` in the output means no:

```bash
vim --version | grep clipboard
```

On Debian/Ubuntu the fix is a fuller build:

```bash
sudo apt install vim-gtk3
```

## Files, buffers, windows

| Command | Does |
| --- | --- |
| `:e path/to/file` | Open a file |
| `:ls` | List buffers |
| `:b 3` / `:bn` / `:bp` | Go to buffer 3, next, previous |
| `:sp` / `:vs` | Split horizontally, vertically |
| <kbd>Ctrl</kbd>+<kbd>w</kbd> then `hjkl` | Move between splits |
| <kbd>Ctrl</kbd>+<kbd>w</kbd> then `q` | Close this split |
| `:tabnew` / `gt` / `gT` | New tab, next, previous |

## A starting `.vimrc`

```vim title="~/.vimrc"
set number relativenumber   " absolute on the cursor line, relative elsewhere
set expandtab               " spaces, not tabs
set shiftwidth=4 tabstop=4  " ...four of them
set ignorecase smartcase    " case-insensitive until you type a capital
set incsearch hlsearch      " highlight as you type
set hidden                  " switch buffers without saving first
set scrolloff=5             " keep context above and below the cursor
set undofile                " persistent undo, survives closing the file
set clipboard=unnamedplus   " yank straight to the system clipboard
syntax on
filetype plugin indent on

" Clear search highlighting
nnoremap <leader>h :noh<CR>
```

`set undofile` is the underrated one: `u` keeps working after you close and
reopen a file.

## Learning it

```bash
vimtutor
```

Thirty minutes, ships with vim, and covers more than most tutorials. Then `:help
user-manual` inside vim, and `:help <thing>` for anything specific — the built-in
docs are genuinely good.
