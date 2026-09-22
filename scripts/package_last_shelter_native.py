#!/usr/bin/env python3
"""Package an extracted original 0/ server tree without altering its contents.

The private output includes original configuration and database files. Keep it
outside Git. No source script, Java class, database or server is executed.
"""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Extracted original 0/ directory")
    parser.add_argument("output", type=Path, help="Private .tar.gz output outside Git")
    parser.add_argument("--archived-metadata", type=Path, help="Optional original archive modes")
    args = parser.parse_args()
    source, output = args.source.resolve(), args.output.resolve()
    repo = Path(__file__).resolve().parents[1]
    if output.is_relative_to(repo) or output.is_relative_to(source):
        parser.error("Output must be outside both the Git checkout and the source tree")
    required = [
        "52gmsy/SFS2X/lib/mmo-server.jar",
        "52gmsy/SFS2X/extensions/COK2/COK-1.0.0-Extension.jar",
        "52gmsy/SFS2X/zones/COK2.zone.xml",
        "52gmsy/SFS2X/sfs2x-service",
        "52gmsy/apache-apollo-1.7.1/bin/mybroker/etc/apollo.xml",
        "52gmsy/down/cokdb2.sql",
    ]
    for relative in required:
        if not (source / relative).is_file():
            parser.error("Missing original runtime file: " + relative)
    archived = {}
    if args.archived_metadata:
        archived = {row["path"]: row for row in json.loads(args.archived_metadata.read_text())}
    entries = []
    for path in sorted(source.rglob("*")):
        relative = path.relative_to(source).as_posix()
        if path.is_symlink() or not (path.is_file() or path.is_dir()):
            raise ValueError("Non-regular source entry: " + relative)
        mode = archived.get(relative, {}).get("mode", path.stat().st_mode & 0o777)
        entry = {"path": relative, "kind": "directory" if path.is_dir() else "file", "mode": mode}
        if path.is_file():
            entry.update(size=path.stat().st_size, sha256=digest(path))
        entries.append(entry)
    identity = hashlib.sha256(json.dumps(entries, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    manifest = {"formatVersion": 1, "snapshotSha256": identity,
                "files": sum(e["kind"] == "file" for e in entries),
                "bytes": sum(e.get("size", 0) for e in entries), "entries": entries}
    data = (json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    if output.exists():
        with tarfile.open(output, "r:gz") as previous:
            current = previous.extractfile("manifest.json")
            if current and current.read() == data:
                print(json.dumps({"changed": False, "files": manifest["files"], "snapshotSha256": identity}))
                return
        raise FileExistsError("A different package already exists; choose another output path")
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(output.name + ".partial")
    try:
        with temporary.open("xb") as raw, gzip.GzipFile(filename="", fileobj=raw, mode="wb", mtime=0, compresslevel=6) as gz:
            with tarfile.open(fileobj=gz, mode="w", format=tarfile.PAX_FORMAT) as archive:
                info = tarfile.TarInfo("manifest.json")
                info.size, info.mode = len(data), 0o600
                archive.addfile(info, io.BytesIO(data))
                for entry in entries:
                    path = source / entry["path"]
                    info = archive.gettarinfo(str(path), "payload/" + entry["path"])
                    info.uid = info.gid = info.mtime = 0
                    info.uname = info.gname = ""
                    info.mode = entry["mode"]
                    if entry["kind"] == "file":
                        with path.open("rb") as stream:
                            archive.addfile(info, stream)
                    else:
                        archive.addfile(info)
                for name in ["restore_last_shelter_native.py"]:
                    script = repo / "scripts" / name
                    info = archive.gettarinfo(str(script), name)
                    info.uid = info.gid = info.mtime = 0
                    info.uname = info.gname = ""
                    info.mode = 0o700
                    with script.open("rb") as stream:
                        archive.addfile(info, stream)
                readme = repo / "LAST_SHELTER_MIGRATION.md"
                info = archive.gettarinfo(str(readme), "README.md")
                info.uid = info.gid = info.mtime = 0
                info.uname = info.gname = ""
                info.mode = 0o600
                with readme.open("rb") as stream:
                    archive.addfile(info, stream)
        temporary.chmod(0o600)
        # Never replace an existing package if another process created it.
        import os
        os.link(temporary, output)
        temporary.unlink()
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    print(json.dumps({"changed": True, "files": manifest["files"], "bytes": manifest["bytes"],
                      "archiveBytes": output.stat().st_size, "snapshotSha256": identity,
                      "archiveSha256": digest(output)}))


if __name__ == "__main__":
    main()
