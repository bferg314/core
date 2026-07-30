---
title: Docker
description: Containers, images, compose, volumes, and networks — weighted toward debugging a container that won't behave and reclaiming disk.
sidebar:
  order: 5
---

Installation is in [Install Docker](../howto/install-docker.mdx); a directory
layout that won't need redoing is in
[Docker Folder Layout](../howto/docker-folder-layout.md).

Compose is a subcommand — `docker compose`, not `docker-compose`. The hyphenated v1
binary is end-of-life and its `.yml` quirks no longer apply.

## Running things

```bash
docker run --rm -it debian:12 bash        # throwaway shell, deleted on exit
docker run -d --name web -p 8080:80 nginx # detached, named, port published
docker run --rm -v "$PWD:/work" -w /work alpine ls
docker run --rm --env-file .env myimage
docker run -d --restart unless-stopped --name pihole pihole/pihole
```

| Flag | Does |
| --- | --- |
| `--rm` | Delete the container when it exits. Use it for anything one-off |
| `-it` | Interactive plus TTY — needed for a shell |
| `-d` | Detached, run in the background |
| `-p 8080:80` | Host port 8080 → container port 80 |
| `-p 127.0.0.1:8080:80` | ...bound to localhost only |
| `-v /host:/container` | Bind mount |
| `-v name:/container` | Named volume |
| `-e KEY=value` | Environment variable |
| `-w /path` | Working directory inside |
| `--network host` | Share the host's network stack. Linux only |
| `--user $(id -u):$(id -g)` | Run as you, not root |

:::caution
`-p 8080:80` publishes to **every** interface, and Docker writes its own iptables
rules that `ufw` does not filter — a container is reachable from the LAN even when
`ufw` says that port is denied. Bind to `127.0.0.1` for anything that should stay
local.
:::

## Inspecting

```bash
docker ps                    # running
docker ps -a                 # including stopped
docker ps -s                 # with disk usage per container
docker ps --filter name=web --format '{{.Names}}\t{{.Status}}'
```

```bash
docker logs web
docker logs -f --tail 100 web        # follow the last 100 lines
docker logs --since 10m web
docker logs -t web                   # with timestamps
```

```bash
docker stats                 # live CPU, memory, network per container
docker top web                # processes inside
docker diff web               # files changed since the image
docker port web               # published port mapping
```

`docker inspect` prints everything, so extract just what you need:

```bash
docker inspect -f '{{.State.Status}} {{.State.ExitCode}}' web
docker inspect -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' web
docker inspect -f '{{.NetworkSettings.IPAddress}}' web
docker inspect -f '{{json .Config.Env}}' web | jq
```

## Getting inside

```bash
docker exec -it web bash
docker exec -it web sh          # alpine and other slim images have no bash
docker exec -u root -it web bash   # as root, when the image drops privileges
docker exec web env              # one command, no TTY needed
```

Exec fails on a container that isn't running. To inspect a container that exits
immediately, override its entrypoint instead:

```bash
docker run --rm -it --entrypoint sh myimage
```

Copy files either direction, running or stopped:

```bash
docker cp web:/etc/nginx/nginx.conf ./nginx.conf
docker cp ./nginx.conf web:/etc/nginx/nginx.conf
```

## Lifecycle

```bash
docker stop web              # SIGTERM, then SIGKILL after 10s
docker stop -t 30 web        # give it 30 seconds
docker start web
docker restart web
docker kill web              # SIGKILL immediately
docker rm web                # delete a stopped container
docker rm -f web             # stop and delete
```

```bash
docker stop $(docker ps -q)          # stop everything running
docker rm $(docker ps -aq)           # delete every container
```

## Images

```bash
docker images
docker pull nginx:1.27
docker rmi nginx:1.27
docker history myimage        # layers, and what each one cost
docker image inspect nginx:1.27
```

```bash
docker build -t myapp:dev .
docker build -t myapp:dev --no-cache .
docker build -t myapp:dev --build-arg VERSION=1.2 .
docker build -t myapp:dev --target builder .      # stop at a named stage
```

```bash
docker tag myapp:dev ghcr.io/bferg314/myapp:1.0
docker push ghcr.io/bferg314/myapp:1.0
```

```bash
docker save myapp:dev | gzip > myapp.tar.gz      # move an image without a registry
docker load < myapp.tar.gz
```

:::note
`docker save` and `docker export` are different things and the names are backwards
from what you'd guess. `save` writes an **image** with its layers and history;
`export` writes a **container's** flattened filesystem with no history and no
metadata — it can't be run directly.
:::

## Compose

Run these from the directory holding `compose.yaml`, or pass `-f path/to/file`.

```bash
docker compose up -d              # create and start, in the background
docker compose up -d --build      # rebuild images first
docker compose up -d --force-recreate
docker compose down               # stop and remove containers and networks
docker compose down -v            # ...and named volumes. Deletes data
docker compose ps
docker compose logs -f sonarr
docker compose restart sonarr
docker compose exec sonarr bash
docker compose pull && docker compose up -d      # update to latest images
```

```bash
docker compose config             # the fully resolved file, with variables expanded
docker compose config --services  # just the service names
```

`docker compose config` is the first thing to run when a variable isn't taking
effect — it shows exactly what Compose resolved after merging `.env`, the
environment, and any override files.

```bash
docker compose up -d sonarr       # one service and its dependencies
docker compose stop sonarr
docker compose rm -sf sonarr      # stop and remove just that one
```

:::danger
`docker compose down -v` deletes named volumes — for most stacks that is the
databases. Plain `down` leaves them alone. If you meant "restart cleanly", that's
`down` then `up -d`.
:::

## Volumes

```bash
docker volume ls
docker volume create appdata
docker volume inspect appdata          # includes Mountpoint on the host
docker volume rm appdata
docker volume ls -f dangling=true      # attached to nothing
```

Back one up without stopping to work out where it lives on disk:

```bash
docker run --rm -v appdata:/data -v "$PWD:/backup" alpine tar czf /backup/appdata.tar.gz -C /data .
```

Restore into a fresh volume:

```bash
docker run --rm -v appdata:/data -v "$PWD:/backup" alpine tar xzf /backup/appdata.tar.gz -C /data
```

:::caution
Stop the container first if the volume holds a database. SQLite and Postgres files
copied mid-write restore as corrupt, and you find out at the worst moment.
:::

## Networks

```bash
docker network ls
docker network create backend
docker network inspect backend         # which containers are attached
docker network connect backend web
docker network disconnect backend web
```

Containers on a **user-defined** network resolve each other by container name.
Containers on the default `bridge` network do not — that's the single most common
reason one container can't reach another. Compose creates a user-defined network
per project automatically, which is why it works there and not with bare
`docker run`.

Inside a container, the host itself is `host.docker.internal` on Docker Desktop.
On Linux, add it explicitly:

```bash
docker run --rm --add-host host.docker.internal:host-gateway alpine ping -c1 host.docker.internal
```

## Reclaiming disk

```bash
docker system df              # where the space went
docker system df -v           # per image, container, and volume
```

```bash
docker system prune           # stopped containers, unused networks, dangling images, build cache
docker image prune -a         # every image not used by a container
docker builder prune          # build cache only
docker volume prune           # unused volumes — read the warning below
```

:::danger
`docker system prune -a --volumes` removes **every volume not attached to a running
container**. A stack that's merely stopped counts as not running, so this deletes
its data. Run `docker volume ls` and know what's in the list first. Plain
`docker system prune` is the safe one.
:::

Build cache is usually the surprise — it grows without bound and `docker images`
doesn't show it. `docker system df` does.

## Debugging a container that won't start

```bash
docker ps -a --filter name=web        # confirm it exited and get the code
docker logs --tail 50 web
docker inspect -f '{{.State.ExitCode}} {{.State.Error}}' web
docker events --since 10m             # what the daemon did, in order
```

Exit codes worth recognizing:

| Code | Usually means |
| --- | --- |
| `0` | Ran and finished. A one-shot process, not a crash |
| `1` | Application error — read the logs |
| `125` | Docker itself rejected the run — bad flag or bad mount |
| `126` | Command found but not executable |
| `127` | Command not found in the image |
| `137` | SIGKILL — almost always the OOM killer |
| `139` | Segfault |
| `143` | SIGTERM, stopped normally |

`137` with no other clue means it ran out of memory:

```bash
docker inspect -f '{{.State.OOMKilled}}' web
```

Common causes by symptom:

- **`exec format error`** — image built for a different architecture. Check with
  `docker image inspect -f '{{.Architecture}}' myimage`, and build with
  `--platform linux/amd64` if needed.
- **Permission denied on a bind mount** — the container's UID doesn't own the host
  directory. Match `PUID`/`PGID` to `id -u`/`id -g`, or `chown` the directory.
- **`port is already allocated`** — `sudo ss -tulpn | grep 8080` names the holder.
- **Container exits immediately with code 0** — nothing is running in the
  foreground. The main process must not daemonize.
- **Changes to a bind-mounted file don't appear** — you edited the host path but the
  compose file mounts a different one. `docker inspect` the mounts.

## One-liners worth keeping

```bash
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
```

```bash
docker images --format '{{.Size}}\t{{.Repository}}:{{.Tag}}' | sort -h -r | head
```

```bash
docker exec web cat /etc/os-release          # what base image is this really
```

```bash
docker compose ps --format json | jq -r '.[] | "\(.Name) \(.State) \(.Health)"'
```

Watch a container's health check settle after a restart:

```bash
docker inspect -f '{{.State.Health.Status}}' web
```
