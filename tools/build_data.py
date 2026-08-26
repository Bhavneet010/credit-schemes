"""Compatibility entry point for the canonical State Pack builder."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
COMMAND = [
    "node",
    str(ROOT / "tools" / "state-pack" / "cli.mjs"),
    "build-app",
    "--all",
    "--output-dir",
    str(ROOT / "app" / "data"),
]

raise SystemExit(subprocess.run(COMMAND, cwd=ROOT, check=False).returncode)
