# Agent instructions

For installation, troubleshooting, customization, or packaging, read
[skills/panel-graphs/SKILL.md](skills/panel-graphs/SKILL.md).

This repository is a GNOME Shell extension, not a Node web application. Node
runs the pure history tests; GNOME runs the UI modules. Build with
`python3 scripts/build.py` and test with `node --test tests/*.test.js`.

Respect the user's existing checkout and desktop session. Source changes may
require a new GNOME session before they run. Do not restart or log out the
user automatically, and distinguish source/build checks from runtime checks.
