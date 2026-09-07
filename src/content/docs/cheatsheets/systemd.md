---
title: systemd
description: systemctl and journalctl, weighted toward diagnosing a unit that won't start, finding the log line that says why, and writing your own services and timers.
sidebar:
  order: 6
---

Weighted toward the two questions you actually have at 11pm: why won't this
unit start, and where is the line that says so. Writing your own units and
timers comes after that.

Checked against systemd 257 on Debian 13. Everything here works the same on
Arch; where unit names differ, it is called out.

:::caution[Read this before you trust an empty journal]
A user who is not in `adm` or `systemd-journal` sees only their own messages,
and `journalctl` says so in a hint rather than an error. If a unit clearly
failed but the journal looks empty, that is why. Use `sudo`, or fix it once:

```bash
sudo usermod -aG adm bryan
```

Log out and back in for the group to take effect.
:::

## The daily verbs

```bash
systemctl status docker
systemctl start docker
systemctl stop docker
systemctl restart docker
systemctl reload nginx           # re-read config, keep the process
systemctl reload-or-restart nginx
```

| Command | Does |
| --- | --- |
| `start` | Runs it now. Says nothing about boot |
| `enable` | Runs it at boot. Says nothing about now |
| `enable --now` | Both, which is almost always what you meant |
| `disable --now` | Stop it and take it out of boot |
| `restart` | Stop, then start. The process dies |
| `reload` | Signal the running process to re-read its config |
| `try-restart` | Restart only if it is already running |
| `daemon-reload` | Re-read unit **files** from disk. Not the same thing |

Not every service supports `reload`. Ask before you rely on it:

```bash
systemctl show -p CanReload --value nginx.service
```

`daemon-reload` is required whenever you add, edit, or delete a unit file, and
it is the step everyone forgets. Without it systemd keeps running the version it
parsed earlier, and your edit appears to do nothing:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx
```

`daemon-reload` does not restart anything. It only updates systemd's idea of
what the units say, so you still need the `restart` afterwards.

## When a unit won't start

Work down this list. Most failures are answered by step two.

```bash
systemctl status docker
```

```bash
journalctl -u docker -b --no-pager | tail -50
```

```bash
journalctl -xeu docker
```

`-x` adds systemd's own explanation of what a message means, `-e` jumps to the
end, and `-u` filters to the unit. Together they are the fastest way to the last
thing that happened.

See every unit that is currently in a failed state, which catches the ones you
did not know about:

```bash
systemctl list-units --failed
```

Check one unit without reading a paragraph, which is what you want in a script:

```bash
systemctl is-active docker
systemctl is-enabled docker
systemctl is-failed docker
```

`is-active` exits 0 when active, non-zero otherwise, so `systemctl is-active
--quiet docker && echo up` works.

Find out what the unit actually says, including every override that has been
layered on top of it:

```bash
systemctl cat docker.service
```

`cat` is the honest answer to "why is it doing that". It prints the vendor unit
file first, then every drop-in, each with its path as a comment. If a setting
surprises you, it is in one of those files.

For a single resolved value rather than the whole file:

```bash
systemctl show -p ExecStart --value docker.service
systemctl show -p FragmentPath -p DropInPaths docker.service
systemctl show -p Restart -p RestartUSec docker.service
```

Check a unit file for typos before you fight with it. This validates directive
names and catches a missing executable:

```bash
systemd-analyze verify /etc/systemd/system/backup.service
```

After a unit has failed enough times to hit its start rate limit, systemd
refuses to try again until you clear the flag:

```bash
sudo systemctl reset-failed backup.service
```

## Reading a `systemctl status` block

Most people read the first line and stop. The useful information is lower down.

```bash
systemctl status scribe-fail.service
```

```text
× scribe-fail.service - Scribe failing job
     Loaded: loaded (/home/bryan/.config/systemd/user/scribe-fail.service; static)
     Active: failed (Result: exit-code) since Sun 2026-09-06 15:25:01 EDT; 9ms ago
    Process: 2017 ExecStart=/usr/bin/env sh -c echo about to fail; exit 3 (code=exited, status=3)
   Main PID: 2017 (code=exited, status=3)
        CPU: 6ms

Sep 06 15:25:01 debdev systemd[1149]: Starting scribe-fail.service - Scribe failing job...
Sep 06 15:25:01 debdev env[2017]: about to fail
Sep 06 15:25:01 debdev systemd[1149]: scribe-fail.service: Main process exited, code=exited, status=3/NOTIMPLEMENTED
Sep 06 15:25:01 debdev systemd[1149]: scribe-fail.service: Failed with result 'exit-code'.
Sep 06 15:25:01 debdev systemd[1149]: Failed to start scribe-fail.service - Scribe failing job.
```

Line by line:

- **The dot.** `●` is fine, `×` is failed, `○` is inactive. Colour says the same
  thing in a terminal that supports it.
- **`Loaded:`** The path is the unit file systemd is using, which tells you
  whether your edit landed in the file it reads. The word after the semicolon is
  the boot setting: `enabled`, `disabled`, `static` (no `[Install]` section, so
  it cannot be enabled directly), or `masked`.
- **`Active:`** The state plus, on a failure, the reason in `Result:`. Values
  worth knowing are `exit-code` (the process returned non-zero), `signal` (it
  was killed), `timeout` (it did not start in time), `oom-kill` (out of memory),
  and `start-limit-hit` (it failed too often and systemd gave up).
- **`Process:`** The exact command line as systemd expanded it, and its exit
  status. If the command is not what you wrote, your `ExecStart` is being parsed
  differently than you think.
- **`Main PID:`** Present while running, and carrying the exit code after death.
- **The log tail.** Only the last ten lines, and truncated at the width of your
  terminal. It is a preview, not the log.

Two traps. First, the name after the slash in `status=3/NOTIMPLEMENTED` is an
LSB label systemd attaches to small numbers, and it usually means nothing about
your program. `systemd-analyze exit-status 3` will confirm which vocabulary a
code came from. Second, the log tail is elided, so read the real journal before
concluding there is nothing there.

Get the full lines rather than the truncated ones:

```bash
systemctl status --no-pager -l -n 50 docker
```

## journalctl

This is half the page because it is where the answer lives.

```bash
journalctl -u docker                 # one unit, all of history
journalctl -u docker -b              # ...this boot only
journalctl -u docker -f              # follow, like tail -f
journalctl -u docker -n 100          # last 100 lines
journalctl -u docker -r              # newest first
journalctl -xeu docker               # explained, unit-filtered, jumped to the end
```

`-u` takes a glob, which is how you watch a whole stack at once:

```bash
journalctl -u 'docker*' -f
```

Several units together, in one interleaved stream:

```bash
journalctl -u docker -u containerd -u ssh -f
```

Time ranges. `--since` and `--until` take absolute timestamps, English, or
relative offsets:

```bash
journalctl --since "2026-09-06 15:00"
journalctl --since yesterday --until today
journalctl --since "1 hour ago"
journalctl -u smbd --since "-30m"
```

Severity. `-p` takes a name or a number, and a bare value means "this level and
worse", so `-p err` includes `crit`, `alert`, and `emerg`:

```bash
journalctl -p err -b                 # errors and worse, this boot
journalctl -p warning -u nginx -b
journalctl -p 0..3 -b                # explicit range, emerg through err
```

| Number | Name |
| --- | --- |
| 0 | `emerg` |
| 1 | `alert` |
| 2 | `crit` |
| 3 | `err` |
| 4 | `warning` |
| 5 | `notice` |
| 6 | `info` |
| 7 | `debug` |

Boots. `-b` is the current boot, `-b -1` the one before it, and so on backwards:

```bash
journalctl -b                        # this boot
journalctl -b -1                     # the previous boot
journalctl -b -1 -p err              # ...just its errors
journalctl --list-boots              # what is on disk
```

Other filters worth remembering:

```bash
journalctl -k                        # kernel messages only, this boot
journalctl -t sudo                   # by syslog identifier
journalctl _PID=1234
journalctl /usr/sbin/sshd            # by executable path
journalctl -g 'permission denied'    # grep the message text
```

`--no-pager` is what you want in a script, in a pipe, or any time `less`
grabbing the terminal is not helpful:

```bash
journalctl -u docker -b --no-pager | grep -i error
```

Change the output shape when the default is too chatty or not chatty enough:

```bash
journalctl -u docker -o short-precise    # microsecond timestamps
journalctl -u docker -o cat              # message only, no metadata
journalctl -u docker -o json-pretty      # every field, for one weird entry
```

`-o json-pretty` on a single entry is the way to discover which fields you can
filter on.

## Journal size and vacuuming

```bash
journalctl --disk-usage
```

Trim it. These delete archived journal files and cannot be undone, but the
active file is never touched, so you keep recent logs either way:

```bash
sudo journalctl --vacuum-time=2weeks
sudo journalctl --vacuum-size=500M
sudo journalctl --vacuum-files=5
```

Set a permanent ceiling instead of trimming by hand. Use a drop-in rather than
editing the shipped file, so a package update does not fight you:

```ini title="/etc/systemd/journald.conf.d/size.conf"
[Journal]
SystemMaxUse=1G
SystemMaxFileSize=100M
```

```bash
sudo systemctl restart systemd-journald
```

If `journalctl --list-boots` only ever shows the current boot, the journal is
not persistent. That is the default on some minimal images, where logs live in
`/run` and vanish at reboot. Fix it:

```bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald
```

## Did the last boot end cleanly?

Start with the reboot record. It is readable without journal access and it
records a clean shutdown explicitly:

```bash
last -Fx reboot shutdown
```

```text
reboot   system boot  6.12.107+deb13-a Sun Sep  6 15:12:28 2026 - still running
reboot   system boot  6.12.101+deb13-a Sun Aug 23 11:24:54 2026 - Sun Sep  6 15:05:35 2026 (14+03:40)
shutdown system down  6.12.101+deb13-a Sun Sep  6 15:05:35 2026 - Sun Sep  6 15:12:28 2026  (00:06)
```

A `shutdown system down` line paired with a boot means the machine was told to
stop. Where a boot ended without one, `last` prints `crash` in its place. That
is the fastest answer to this question and it needs no privileges.

Then the boot list, for the timestamps:

```bash
journalctl --list-boots
```

```text
IDX BOOT ID                          FIRST ENTRY                 LAST ENTRY
 -1 990bc72bd32a4c8f90b28b649fdfe70e Sun 2026-08-23 11:26:39 EDT Sun 2026-09-06 14:04:50 EDT
  0 fdc2784f934d486b86afa477da71321a Sun 2026-09-06 15:13:52 EDT Sun 2026-09-06 15:23:31 EDT
```

Do not read a gap between one boot's last entry and the next boot's first as a
crash. Those columns cover the entries **you** can see, so without `adm` the
last entry is just the last thing your own session logged, which is usually you
disconnecting. The hour-wide gap above belongs to the clean shutdown in the
`last` output on this same machine.

Read the tail of the previous boot for the real answer:

```bash
journalctl -b -1 -n 40 --no-pager
```

A clean shutdown ends with an obvious sequence: `Stopping` lines for each
service, then `Reached target Shutdown`, then `systemd-shutdown` reporting
`Unmounting file systems`, `All filesystems unmounted`, and finally `Powering
off.` or `Rebooting.` The presence of that sequence at all is the tell. You do
not need to match the wording exactly.

An abrupt end has none of it. The last line is ordinary traffic, an SSH
disconnect or a cron job, at a time that means nothing, and then the log simply
stops. That is a crash, a kernel panic, a power cut, or a hypervisor pulling the
plug on a guest.

Look for what happened just before, since a panic or an OOM kill usually leaves
a trail:

```bash
journalctl -b -1 -p err --no-pager
```

```bash
journalctl -b -1 -k --no-pager | tail -60
```

Two more signals on the boot after an unclean stop. The kernel log will show the
filesystem recovering (`ext4` replaying its journal, or `xfs` doing log
recovery), and journald itself may report `Journal file corrupted, rotating.`
Either one is confirmation that the machine went down without unmounting.

```bash
journalctl -b -k --no-pager | grep -iE 'recovery|recovering journal|corrupt'
```

:::note
None of this distinguishes a kernel panic from someone holding the power button.
For that you need out-of-band evidence: a Proxmox task log on the host, an IPMI
event log, or a UPS log. The journal can only tell you it stopped, not who
stopped it.
:::

## Writing a service unit

Put your own units in `/etc/systemd/system/`. That directory outranks
`/usr/lib/systemd/system/`, which belongs to packages and gets overwritten.

```ini title="/etc/systemd/system/backup.service"
[Unit]
Description=Nightly backup to the NAS
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=bryan
WorkingDirectory=/home/bryan
ExecStart=/usr/local/bin/backup.sh
```

```bash
sudo systemctl daemon-reload
sudo systemctl start backup.service
journalctl -u backup.service -n 30 --no-pager
```

For a long-running service rather than a one-shot job, the `[Service]` section
changes and you add an `[Install]` section so it can be enabled:

```ini title="/etc/systemd/system/webhook.service"
[Unit]
Description=Webhook receiver
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=bryan
WorkingDirectory=/srv/webhook
EnvironmentFile=/etc/default/webhook
ExecStart=/usr/local/bin/webhook --port 9000
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now webhook.service
```

The directives that matter:

| Directive | Meaning |
| --- | --- |
| `Type=simple` | The `ExecStart` process **is** the service. The default |
| `Type=oneshot` | Runs, exits, and that counts as success. For jobs and timers |
| `Type=notify` | The process tells systemd when it is ready. Needs support in the program |
| `ExecStart=` | Absolute path required. Not a shell, so no pipes or globs |
| `User=` | Run as someone other than root |
| `EnvironmentFile=` | Read `KEY=value` lines from a file. Prefix with `-` to allow it missing |
| `Restart=on-failure` | Restart on a non-zero exit or a signal, not on a clean one |
| `RestartSec=10s` | Wait before restarting, so a crash loop does not spin |
| `After=` | Ordering only. Does **not** pull the other unit in |
| `Wants=` | Pull the other unit in, but do not fail if it fails |
| `Requires=` | Pull it in and fail with it. Stronger than you usually want |
| `WantedBy=multi-user.target` | What `enable` hooks it to. The normal answer |

Two things that bite. `ExecStart` is not run through a shell, so `ExecStart=/usr/bin/tar czf /backup/x.tgz /srv/*` will not expand the glob and a `|` is passed as a literal argument. Put anything shell-shaped in a script and call the script. And `After=network-online.target` needs the matching `Wants=`, because `After=` alone only orders against a unit that something else already pulled in.

Standard output and standard error go to the journal by default, so a script's
`echo` is already logged. You do not need to redirect to a file.

## Timers instead of cron

A timer is two files: the service that does the work, and the timer that decides
when. The `[Install]` section goes on the timer, never on the service.

```ini title="/etc/systemd/system/backup.timer"
[Unit]
Description=Run the nightly backup

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=15m

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now backup.timer
```

The timer looks for a service with the same name, so `backup.timer` runs
`backup.service` with no wiring. Set `Unit=` in `[Timer]` only when the names
differ.

`Persistent=true` is the reason to prefer this over cron on a machine that is
not always on. If the scheduled time passed while the box was off, the job runs
once at the next boot instead of being skipped. `RandomizedDelaySec` spreads the
load when several machines share a schedule.

See what is scheduled, when it last ran, and when it runs next:

```bash
systemctl list-timers --all
```

Check an `OnCalendar` expression before you trust it. This is the single most
useful command in the section:

```bash
systemd-analyze calendar "Sun 03:00"
```

```text
  Original form: Sun 03:00
Normalized form: Sun *-*-* 03:00:00
    Next elapse: Sun 2026-09-13 03:00:00 EDT
       (in UTC): Sun 2026-09-13 07:00:00 UTC
       From now: 6 days left
```

Ask for several future firings when a schedule is not obviously right:

```bash
systemd-analyze calendar --iterations=5 "*-*-* 02:30:00"
```

Expressions worth copying:

| Expression | Fires |
| --- | --- |
| `hourly` | Top of every hour |
| `daily` | Every day at midnight |
| `weekly` | Mondays at midnight |
| `*-*-* 02:30:00` | Every day at 02:30 |
| `Mon..Fri 09:00` | Weekdays at 09:00 |
| `Sun 03:00` | Sundays at 03:00 |
| `*-*-01 04:00:00` | The first of every month at 04:00 |
| `*:0/15` | Every fifteen minutes |

Two alternatives to a wall-clock schedule, for jobs that should run relative to
something instead:

```ini title="/etc/systemd/system/cleanup.timer"
[Timer]
OnBootSec=15min
OnUnitActiveSec=6h
```

Run the job right now without waiting for its schedule, to check it works:

```bash
sudo systemctl start backup.service
```

## Overriding a unit you did not write

Never edit a file under `/usr/lib/systemd/system/`. A package update replaces
it and your change is gone. Use a drop-in, which is a fragment layered on top of
the vendor unit:

```bash
sudo systemctl edit docker.service
```

That opens an empty drop-in at
`/etc/systemd/system/docker.service.d/override.conf`, shows the original as a
comment for reference, and runs `daemon-reload` when you save. Write only the
directives you want to change:

```ini title="/etc/systemd/system/docker.service.d/override.conf"
[Service]
Restart=always
RestartSec=5s
```

Give the drop-in a meaningful filename when you expect more than one:

```bash
sudo systemctl edit --drop-in=restart-policy.conf docker.service
```

To replace the whole unit rather than patch it, which copies the vendor file
into `/etc/systemd/system/` for you to edit:

```bash
sudo systemctl edit --full docker.service
```

One trap with drop-ins. A directive that can appear several times, `ExecStart`
being the usual one, is **appended** rather than replaced. Clear it first with
an empty assignment:

```ini title="/etc/systemd/system/docker.service.d/override.conf"
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd --debug
```

Confirm the result, since `cat` shows the merged stack in the order it is
applied:

```bash
systemctl cat docker.service
```

Throw every override away and go back to the shipped unit:

```bash
sudo systemctl revert docker.service
```

## Enabled, disabled, masked

```bash
systemctl list-unit-files --type=service
systemctl list-unit-files --state=enabled
systemctl list-unit-files 'ssh*'
```

`list-unit-files` lists what is installed on disk. `list-units` lists what is
loaded in memory right now. When you are asking "is this even installed", you
want the first one.

That glob is also how you settle a unit name that differs between distributions.
On Debian and Ubuntu the OpenSSH unit is `ssh.service`, and `sshd.service`
exists only as an alias declared in it. On Arch it is `sshd.service`. Samba
differs the same way. Rather than guessing:

```bash
systemctl list-unit-files 'smb*'
systemctl show -p Names --value ssh.service
```

`Names` lists every alias a loaded unit answers to, which tells you whether the
name you typed is the real one.

Masking is a stronger disable. It symlinks the unit to `/dev/null` so it cannot
start at all, not even as a dependency of something else:

```bash
sudo systemctl mask nginx.service
sudo systemctl unmask nginx.service
```

| State | Effect |
| --- | --- |
| `enabled` | Starts at boot |
| `disabled` | Does not start at boot, but anything can still start it |
| `masked` | Cannot start. `start` fails, and dependencies cannot pull it in |
| `static` | No `[Install]` section, so it cannot be enabled or disabled directly |

:::caution
Mask is the right tool for a service that keeps coming back, usually because
something else depends on it. It is also a good way to make a box unbootable if
you mask the wrong thing. Check what depends on a unit before masking it:

```bash
systemctl list-dependencies --reverse nginx.service
```
:::

## Slow boots

```bash
systemd-analyze time
```

```bash
systemd-analyze blame
```

`blame` lists every unit by how long it took to initialise, slowest first. It is
the obvious command and it is often misleading, because units start in parallel
and a slow one that nothing waits on costs you nothing.

The one that answers the question is the critical chain, which follows only the
units that actually delayed reaching the target:

```bash
systemd-analyze critical-chain
```

```bash
systemd-analyze critical-chain nginx.service
```

The usual homelab culprits are a `network-online.target` waiting on DHCP for an
interface that is not plugged in, and `systemd-networkd-wait-online` timing out
at 120 seconds.

## User units

Same commands, plus `--user`, operating on your own service manager rather than
the system one. Files live in `~/.config/systemd/user/`.

```bash
systemctl --user daemon-reload
systemctl --user enable --now syncthing.service
systemctl --user status syncthing.service
systemctl --user list-timers
journalctl --user -u syncthing.service -f
```

Note that `journalctl -u` and `journalctl --user -u` are different questions.
The first reads the system journal, the second reads yours. From a root shell,
`--user-unit=` reaches a user unit directly.

A user manager normally starts at login and stops when your last session ends,
which kills anything it was running. Lingering keeps it alive across logouts and
starts it at boot, which is what you want for a headless box:

```bash
sudo loginctl enable-linger bryan
```

## Rebooting and powering off

```bash
systemctl reboot
systemctl poweroff
systemctl suspend
systemctl soft-reboot          # restart userspace only, keep the kernel running
```

These do not need `sudo` from a local or SSH session on a normal desktop or
server install, because polkit allows them. In a container or a stripped-down
image they will ask.

Schedule one, and cancel it:

```bash
sudo shutdown -r +10 "Rebooting after kernel update"
sudo shutdown -c
```

`shutdown` here is systemd's compatibility wrapper, not the old sysvinit
binary. `systemctl reboot --when=+10m` does the same thing natively.

Related pages: [Docker](docker.md) for the containers most of these services are
running, [Install Docker](../howto/install-docker.mdx), and
[New Linux Machine](../setup/linux.mdx) for the units worth enabling on a fresh
box.
