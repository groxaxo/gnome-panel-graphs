---
name: panel-graphs
description: Install, diagnose, customize, or package the Panel Graphs GNOME Shell extension for CPU, RAM, and NVIDIA GPU monitoring. Use for this project and its desktop indicator; not for unrelated monitoring products.
---

# Panel Graphs

Work with the open-source project at https://github.com/groxaxo/gnome-panel-graphs using file and shell tools. This skill is instructions, not a hosted API or an MCP server. A capable agent can use its own terminal, filesystem, and desktop tools; no particular LLM provider is required.

## Find the project and check the target

Use the user's existing checkout. In the source tree this file is `skills/panel-graphs/SKILL.md`, two levels below the repository root. If installed separately, locate the checkout or clone the public repository into a suitable workspace:

```sh
git clone https://github.com/groxaxo/gnome-panel-graphs.git
cd gnome-panel-graphs
```

Run desktop commands as the target desktop user, in that user's graphical session. An SSH session, container, or remote execution tool may have a different D-Bus session or desktop. Inspect before changing anything:

```sh
gnome-shell --version
gnome-extensions info system-bars@local
```

GNOME Shell **50** is the declared supported version. CPU temperature currently requires Intel `coretemp`. GPU readings require `nvidia-smi`, and only its first GPU is shown. Missing hardware readings display `N/A`; they do not mean zero usage. Do not install or replace GPU drivers as an incidental fix for this extension.

## Choose the requested operation

### Install or update

From the checkout:

```sh
python3 scripts/build.py
./scripts/install.sh
```

The installed UUID is `system-bars@local`; installation updates that user's extension directory. It needs no root helper or background service. Installing over an existing copy uses `--force`; preserve user modifications if present.

The ZIP is `dist/system-bars@local.shell-extension.zip`. GNOME caches JavaScript modules. After installation or an update, a logout/login may be needed, followed by:

```sh
gnome-extensions enable system-bars@local
```

Do not log the user out or restart the desktop automatically: that interrupts their applications. Report when a new session is required. Do not claim a source edit has changed the running instance without runtime evidence. Avoid ad hoc shell-internal evaluation and keyboard injection as a default update mechanism.

### Diagnose readings or a missing indicator

Inspect relevant evidence, without dumping unrelated logs or environment secrets:

```sh
gnome-extensions info system-bars@local
journalctl --user --since '5 minutes ago' --no-pager
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits
```

For CPU temperature, inspect `/sys/class/hwmon/hwmon*/name` to locate `coretemp`, then check that device's `temp1_input` and `temp1_crit`. Do not hardcode an `hwmon` index; it can change after boot. CPU utilization comes from deltas in `/proc/stat`. RAM uses `MemTotal - MemAvailable` from `/proc/meminfo`.

When an indicator works on another machine, do not assume it belongs to the user's target session. Check the host and desktop identity before acting. A successful build is not proof that GNOME loaded the extension.

### Customize the indicator

Read only the relevant files before editing:

- `extension.js`: lifecycle and asynchronous sensor polling; the default timer is **1 second**. Keep process reads asynchronous and prevent overlapping polls. Guard callbacks after disable/re-enable and clean up subprocesses and timers.
- `history.js`: `WINDOW_SECONDS` is **15 seconds**. Update retention and time-axis tests together when changing it.
- `graphs.js`: 100%/50%/0% ticks on the right, colored curves, fixed time axis. The samples use monotonic seconds. Keep invalid data distinct from valid zero readings.
- `layout.js`: fixed-width numeric labels, spacing, and order. CPU: utilization then temperature. RAM: used/total GB. GPU: temperature, utilization, then used/total GB. One heading per group; no repeated CPU/GPU/VRAM labels.
- `metadata.json`: UUID and supported GNOME versions. Do not broaden version claims without testing.

Preserve fixed numeric widths so single-, double-, and triple-digit values do not move neighboring graphs. Memory values are decimal GB, while `nvidia-smi` reports MiB. CPU temperature fractions use the reported critical limit; GPU temperature uses 100°C as the graph maximum. Temperature percentages are normalized scales, not utilization percentages.

There is no preferences panel or settings API yet. A customization request requires editing source, testing it, rebuilding, and installing the update; do not invent a `gsettings` schema or configuration endpoint.

### Validate and package

Run from the repository root after relevant code changes:

```sh
node --test tests/*.test.js
python3 scripts/build.py
```

Node is for tests only. It cannot run GNOME UI imports. The ZIP contains the runtime JavaScript, metadata, and license; the build script maintains the file allowlist. If adding a runtime module, include it in that allowlist.

For UI changes, verify in GNOME when desktop access is available: readings update, graph history covers the requested interval, digit changes do not shift graphs, and the panel fits the screen. If runtime verification is unavailable, say which checks passed and what remains unverified. Do not fabricate screenshots or sample history.

Commit, push, publish releases, or modify GitHub settings only within the user's requested scope. Report the resulting commit or URL when publishing was requested. Keep local credentials, private host addresses, desktop logs, and temporary live-patch scripts out of the repository and ZIP.

## Remove

When the user requests removal:

```sh
gnome-extensions disable system-bars@local
gnome-extensions uninstall system-bars@local
```
