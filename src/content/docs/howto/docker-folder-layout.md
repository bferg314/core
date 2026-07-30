---
title: Docker Folder Layout
description: A directory layout for a Docker home server that keeps backups small, permissions consistent, and file moves instant.
sidebar:
  order: 6
---

Decide this once, before the first `compose up`. Changing it later means editing
every compose file and re-pointing every application's database.

Two rules drive the whole layout:

1. **Config and data live in different trees.** Config is small, changes
   constantly, and must be backed up. Media is enormous and replaceable. Mixing
   them means your backups are either useless or gigantic.
2. **Downloads and media live on one filesystem, mounted under one parent.** Cross
   filesystem, or split across two container mounts, every completed download gets
   *copied* instead of moved — doubling disk use and taking hours on large files.

## The layout

```text
/srv/docker/
├── compose/           # one directory per stack, in git
│   ├── media/
│   │   ├── compose.yaml
│   │   └── .env
│   └── monitoring/
│       ├── compose.yaml
│       └── .env
├── appdata/           # container config and databases — back this up
│   ├── jellyfin/
│   ├── sonarr/
│   └── qbittorrent/
└── data/              # the one shared tree, bind-mounted as /data
    ├── media/
    │   ├── tv/
    │   ├── movies/
    │   ├── books/
    │   └── audiobooks/
    └── downloads/
        ├── complete/
        └── incomplete/
```

`/srv` rather than `~` because a home directory is `700` by default and services
that run as other users can't traverse it. It also survives deleting the user
account.

| Directory | Holds | Back up |
| --- | --- | --- |
| `compose/` | Compose files and `.env`. Should be a git repo | Yes — it's the machine |
| `appdata/` | Databases, settings, metadata, cached artwork | Yes, and stop the containers first |
| `data/media/` | Finished, organized media | Only if it's irreplaceable |
| `data/downloads/` | In-progress and completed downloads | No |

## Create it

```bash
sudo mkdir -p /srv/docker/{compose,appdata}
sudo mkdir -p /srv/docker/data/media/{tv,movies,books,audiobooks}
sudo mkdir -p /srv/docker/data/downloads/{complete,incomplete}
```

Own it as yourself, with a shared group for anything else that needs in:

```bash
sudo groupadd -f media
sudo chown -R bryan:media /srv/docker
sudo chmod -R 2775 /srv/docker
```

`2775` — not `755`. The setgid bit makes files created by containers inherit the
`media` group, and group-write is what lets a second container touch the first
one's output. With `755`, everything is read-only to anything not running as your
exact UID, which produces a stream of confusing "permission denied" failures.

## PUID and PGID

Containers from LinuxServer.io and most similar images take a `PUID`/`PGID` pair
and drop to it before touching your files. Find yours:

```bash
id -u && id -g
```

Set them once per stack rather than per service:

```ini title="/srv/docker/compose/media/.env"
PUID=1000
PGID=1000
TZ=America/New_York
APPDATA=/srv/docker/appdata
DATA=/srv/docker/data
```

```yaml title="/srv/docker/compose/media/compose.yaml"
services:
  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
      - TZ=${TZ}
    volumes:
      - ${APPDATA}/sonarr:/config
      - ${DATA}:/data
    ports:
      - 8989:8989
    restart: unless-stopped
```

Note the single `${DATA}:/data` mount. That's the point of the layout: inside the
container, downloads are at `/data/downloads` and media at `/data/media`, on one
filesystem, so a completed download is moved with a rename — instant, and with no
second copy on disk.

The common mistake is mounting them separately as `/downloads` and `/tv`. Docker
presents those as different devices, so every import becomes a full copy.

## Adding an external disk

Mount the disk somewhere stable and symlink it into the tree, rather than mounting
it inside `data/`:

```bash
sudo mkdir -p /mnt/archive
```

```text title="/etc/fstab"
UUID=3f2a1c9d-8b47-4e6f-a1d2-5c8e9f0b3a71  /mnt/archive  ext4  defaults,noatime,nofail  0  2
```

Full walkthrough in [Format a Disk](format-a-disk.mdx). The `nofail` is important
here — a home server should still boot with a USB disk unplugged.

:::caution
Symlinks pointing outside a bind mount **do not resolve inside the container** —
it sees a broken link, because the target isn't in its filesystem. If a disk needs
to be visible to a container, give it its own bind mount in the compose file, and
accept that moves between it and `data/` will be copies.
:::

## Back it up

Only `compose/` and `appdata/` matter, and they're small:

```bash
docker compose -f /srv/docker/compose/media/compose.yaml stop
```

```bash
sudo rsync -a --delete /srv/docker/appdata/ /mnt/archive/backup/appdata/
```

```bash
docker compose -f /srv/docker/compose/media/compose.yaml start
```

Stopping first is not optional: SQLite databases copied while a container is
writing to them restore as corrupt, and you won't find out until you need them.
See the [rsync cheatsheet](../cheatsheets/rsync.md) for the flags.

## Check it's right

Both paths report the same device number:

```bash
stat -c '%d %n' /srv/docker/data/media /srv/docker/data/downloads
```

Different numbers mean they're on separate filesystems and hardlinks won't work.

Confirm from inside a running container, which is where it actually matters:

```bash
docker exec sonarr df -h /data
```

One line for `/data` is correct. Two lines, or `/data/downloads` appearing
separately, means the mounts are split.
