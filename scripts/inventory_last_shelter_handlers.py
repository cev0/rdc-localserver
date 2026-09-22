#!/usr/bin/env python3
"""Inventory potential native request registrations without executing the JAR."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("jar", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "data/last_shelter/commands.json")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    javap = [shutil.which("javap")] if shutil.which("javap") else ["java", "--module", "jdk.jdeps/com.sun.tools.javap.Main"]
    disassembly = subprocess.run([*javap, "-c", "-p", "-constants", "-classpath", str(args.jar),
        "com.elex.cok.core.HandlerRegisterCenter"], check=True, capture_output=True, text=True).stdout
    pairs = re.findall(r"// String ([^\n]+)\n[^\n]+// class ([^\n]+)\n[^\n]+COKExtension.addRequestHandler", disassembly)
    if not pairs or len(pairs) != disassembly.count("COKExtension.addRequestHandler"):
        raise ValueError("Unrecognized registration bytecode; refusing an incomplete inventory")
    commands = {}
    with zipfile.ZipFile(args.jar) as jar:
        for command, handler in pairs:
            row = {"class": handler.replace("/", "."),
                   "classSha256": hashlib.sha256(jar.read(handler + ".class")).hexdigest()}
            commands.setdefault(command, []).append(row)
        handler_classes = sum(name.endswith(".class") and "/requesthandlers/" in name and "$" not in name for name in jar.namelist())
    output = {
        "formatVersion": 1, "referenceJarSha256": hashlib.sha256(args.jar.read_bytes()).hexdigest(),
        "source": "com.elex.cok.core.HandlerRegisterCenter",
        "meaning": "Potential registrations, including conditional branches; not a claim that all are enabled or ported.",
        "registrationCalls": len(pairs), "uniqueCommands": len(commands), "requestHandlerClasses": handler_classes,
        "commands": {key: commands[key] for key in sorted(commands)},
    }
    data = (json.dumps(output, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    changed = not args.output.is_file() or args.output.read_bytes() != data
    if changed and not args.check:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(data)
    print(json.dumps({"registrationCalls": len(pairs), "uniqueCommands": len(commands),
                      "handlerClasses": handler_classes, "changed": changed, "check": args.check}))
    if args.check and changed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
