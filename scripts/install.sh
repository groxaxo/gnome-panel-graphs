#!/bin/sh
set -eu
repo_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
python3 "$repo_dir/scripts/build.py"
gnome-extensions install --force "$repo_dir/dist/system-bars@local.shell-extension.zip"
if gnome-extensions enable system-bars@local; then
    printf '%s\n' 'Installed. If updating a loaded version, log out and back in to load the new code.'
else
    printf '%s\n' 'Installed. Log out and back in, then run: gnome-extensions enable system-bars@local'
fi
