#!/usr/bin/env python3
"""Build an extension ZIP using only Python's standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent.parent
metadata = json.loads((root / 'metadata.json').read_text())
output = root / 'dist' / f'{metadata["uuid"]}.shell-extension.zip'
output.parent.mkdir(exist_ok=True)
files = ['metadata.json', 'extension.js', 'layout.js', 'graphs.js', 'history.js', 'LICENSE']
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, name)
print(output)
