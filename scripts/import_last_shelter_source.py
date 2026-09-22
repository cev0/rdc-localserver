#!/usr/bin/env python3
"""Import the supplied COK2/resource catalogs without merging or losing XML groups.

Only the Python standard library is needed. Re-running on identical input is a
no-op; --check verifies the committed snapshot without writing anything. Private
deployment/payment/account configuration stays in the original server backup.
"""

import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


EXCLUDED = {
    "servers.xml": "deployment endpoints and database configuration",
    "alliance_servers.xml": "deployment endpoints",
    "payParams.xml": "payment credentials and registration keys",
    "coordinate_uid.xml": "account-specific configuration",
    "pay_uid.xml": "account-specific configuration",
    "BanDeviceId.xml": "device-specific configuration",
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":")).encode("utf-8")


def node(element):
    result = {"tag": element.tag, "attributes": dict(element.attrib)}
    if element.text and element.text.strip():
        result["text"] = element.text
    if element.tail and element.tail.strip():
        result["tail"] = element.tail
    if len(element):
        result["children"] = [node(child) for child in element]
    return result


def snapshot(source):
    catalogs, excluded, pack = {}, {}, bytearray()
    files = sorted(source.glob("*.xml"), key=lambda p: p.name)
    if not files:
        raise ValueError("No resource/*.xml files found")
    for file in files:
        raw = file.read_bytes()
        identity = {"xmlBytes": len(raw), "xmlSha256": sha256(raw)}
        if file.name in EXCLUDED:
            excluded[file.name] = {**identity, "reason": EXCLUDED[file.name]}
            continue
        if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
            raise ValueError(f"DTD/entity declarations are not allowed: {file.name}")
        root = ET.fromstring(raw)
        rows = [el for el in root.iter() if el.tag.rsplit("}", 1)[-1] == "ItemSpec"]
        ids = Counter(el.get("id") for el in rows if el.get("id") is not None)
        data = encode(node(root))
        compressed = gzip.compress(data, compresslevel=9, mtime=0)
        # Fix the platform OS byte as well as mtime for reproducible snapshots.
        compressed = compressed[:9] + b"\xff" + compressed[10:]
        catalogs[file.stem] = {
            **identity, "file": file.name, "offset": len(pack),
            "compressedBytes": len(compressed), "jsonBytes": len(data),
            "sha256": sha256(compressed), "jsonSha256": sha256(data),
            "itemSpecCount": len(rows), "uniqueItemIds": len(ids),
            "duplicateItemIds": {k: v for k, v in sorted(ids.items()) if v > 1},
        }
        pack.extend(compressed)
    manifest = {
        "formatVersion": 1, "sourcePackage": "COK2",
        "sourceXmlFiles": len(files), "catalogCount": len(catalogs),
        "itemSpecCount": sum(c["itemSpecCount"] for c in catalogs.values()),
        "packFile": "catalogs.pack", "packBytes": len(pack),
        "packSha256": sha256(pack), "catalogs": catalogs, "excluded": excluded,
    }
    jar = source.parent / "COK-1.0.0-Extension.jar"
    if jar.is_file():
        manifest["referenceJarSha256"] = sha256(jar.read_bytes())
    return {
        "catalogs.pack": bytes(pack),
        "manifest.json": (json.dumps(manifest, ensure_ascii=False,
                                     sort_keys=True, indent=2) + "\n").encode("utf-8"),
    }, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Path to COK2/resource")
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).resolve().parents[1] / "data/last_shelter")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    files, manifest = snapshot(args.source)
    changed = []
    for name, data in files.items():
        target = args.output / name
        if target.is_file() and target.read_bytes() == data:
            continue
        changed.append(name)
        if not args.check:
            target.parent.mkdir(parents=True, exist_ok=True)
            tmp = target.with_name(target.name + ".tmp")
            tmp.write_bytes(data)
            tmp.replace(target)
    print(json.dumps({"catalogs": manifest["catalogCount"],
                      "rows": manifest["itemSpecCount"],
                      "excluded": len(manifest["excluded"]),
                      "packBytes": manifest["packBytes"],
                      "changed": changed, "check": args.check}))
    if args.check and changed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
