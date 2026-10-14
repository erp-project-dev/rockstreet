"""Compatibility entry point: current non-musical effects only."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("generate-physical-sfx.py")), run_name="__main__")
