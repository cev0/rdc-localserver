#!/usr/bin/env python3
"""Copy the extracted native package to a server root, skipping identical files.

Refuses conflicting files before copying anything; never overwrites, deletes,
imports SQL, changes configuration, or starts services. Use Python 3.10+.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import tempfile


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def safe_path(root, relative):
    parts = PurePosixPath(relative)
    if not relative or parts.is_absolute() or ".." in parts.parts:
        raise ValueError("Invalid manifest path")
    target = root
    for part in parts.parts:
        target = target / part
        if target.is_symlink():
            raise ValueError("Symlink in destination/source path: " + relative)
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path, help="Directory with manifest.json and payload/")
    parser.add_argument("destination", type=Path, help="Server filesystem root, e.g. / on the selected target")
    args = parser.parse_args()
    package, destination = args.package.resolve(), args.destination.resolve()
    manifest = json.loads((package / "manifest.json").read_text())
    if manifest.get("formatVersion") != 1:
        raise ValueError("Unsupported manifest format")
    entries = manifest["entries"]
    identity = hashlib.sha256(json.dumps(entries, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if identity != manifest["snapshotSha256"]:
        raise ValueError("Manifest identity mismatch")
    conflicts, pending, skipped = [], [], 0
    for entry in entries:
        source = safe_path(package / "payload", entry["path"])
        target = safe_path(destination, entry["path"])
        if entry["kind"] == "directory":
            if not source.is_dir() or (target.exists() and not target.is_dir()):
                conflicts.append(entry["path"])
        elif entry["kind"] == "file":
            if not source.is_file() or source.stat().st_size != entry["size"] or digest(source) != entry["sha256"]:
                raise ValueError("Incomplete source file: " + entry["path"])
            if target.exists():
                if not target.is_file() or target.stat().st_size != entry["size"] or digest(target) != entry["sha256"]:
                    conflicts.append(entry["path"])
                else:
                    skipped += 1
            else:
                pending.append(entry)
        else:
            raise ValueError("Unsupported manifest entry")
    if conflicts:
        print(json.dumps({"copied": 0, "skippedIdentical": skipped, "conflicts": conflicts}))
        raise SystemExit(2)
    destination.mkdir(parents=True, exist_ok=True)
    new_directories = []
    for entry in entries:
        if entry["kind"] == "directory":
            target = safe_path(destination, entry["path"])
            if not target.exists():
                target.mkdir(parents=True, mode=0o700)
                new_directories.append((target, entry["mode"]))
    copied = 0
    for entry in pending:
        source = safe_path(package / "payload", entry["path"])
        target = safe_path(destination, entry["path"])
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary_name = tempfile.mkstemp(prefix=".last-shelter-copy-", dir=target.parent)
        temporary = Path(temporary_name)
        try:
            with os.fdopen(fd, "wb") as output, source.open("rb") as stream:
                shutil.copyfileobj(stream, output, 1024 * 1024)
                output.flush()
                os.fsync(output.fileno())
            if digest(temporary) != entry["sha256"]:
                raise ValueError("Source changed while copying: " + entry["path"])
            temporary.chmod(entry["mode"])
            os.link(temporary, target)  # Atomic create; cannot overwrite a concurrent change.
            copied += 1
        finally:
            temporary.unlink(missing_ok=True)
    for directory, mode in reversed(new_directories):
        directory.chmod(mode)
    print(json.dumps({"copied": copied, "skippedIdentical": skipped, "conflicts": [],
                      "snapshotSha256": identity}))


if __name__ == "__main__":
    main()
