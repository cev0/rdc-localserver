"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { sourceCatalog, createSourceCatalog } = require("./last_shelter_source_catalog");

const manifest = sourceCatalog.manifest();
const pack = fs.readFileSync(path.join(__dirname, "data/last_shelter/catalogs.pack"));
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
assert.strictEqual(manifest.sourceXmlFiles, 370);
assert.strictEqual(manifest.catalogCount, 364);
assert.strictEqual(manifest.itemSpecCount, 70861);
assert.strictEqual(pack.length, manifest.packBytes);
assert.strictEqual(hash(pack), manifest.packSha256);
let offset = 0;
for (const entry of Object.values(manifest.catalogs).sort((a, b) => a.offset - b.offset)) {
  assert.strictEqual(entry.offset, offset, "Catalog members must not overlap or leave gaps");
  assert.strictEqual(hash(pack.subarray(entry.offset, entry.offset + entry.compressedBytes)), entry.sha256);
  offset += entry.compressedBytes;
}
assert.strictEqual(offset, pack.length);
assert.strictEqual(sourceCatalog.rows("science").length, 4596);
assert.strictEqual(sourceCatalog.rows("building").length, 2959);
assert.strictEqual(sourceCatalog.rows("arms").length, 329);
assert.strictEqual(sourceCatalog.rows("goods").length, 1066);
assert.strictEqual(sourceCatalog.rows("reward").length, 8797);
assert.strictEqual(sourceCatalog.row("arms", "107000", ["arms"]).attack, "9");
const detached = sourceCatalog.row("science", "901000");
detached.time_research = "0";
assert.strictEqual(sourceCatalog.row("science", "901000").time_research, "90");
for (const file of Object.keys(manifest.excluded)) assert.strictEqual(sourceCatalog.document(file.slice(0, -4)), null);
assert.strictEqual(sourceCatalog.document("../../config"), null);

// Exercise the importer with groups that intentionally reuse IDs. An append
// importer or an index keyed only by ID would corrupt this fixture on replay.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ls-source-test-"));
try {
  const input = path.join(temp, "resource"), output = path.join(temp, "out");
  fs.mkdirSync(input);
  fs.writeFileSync(path.join(input, "grouped.xml"), '<database><Group id="a"><ItemSpec id="001" value=".05"/></Group><Group id="b"><ItemSpec id="001" value="10;20|30"/></Group></database>');
  fs.writeFileSync(path.join(input, "payParams.xml"), '<database><ItemSpec id="private" register_key="private-fixture"/></database>');
  const importer = path.join(__dirname, "scripts/import_last_shelter_source.py");
  const run = (...flags) => spawnSync("python3", [importer, input, "--output", output, ...flags], { encoding: "utf8" });
  assert.strictEqual(run().status, 0);
  const first = fs.readFileSync(path.join(output, "catalogs.pack"));
  const mtime = fs.statSync(path.join(output, "catalogs.pack")).mtimeMs;
  assert.strictEqual(run().status, 0);
  assert.strictEqual(run("--check").status, 0);
  assert.strictEqual(fs.statSync(path.join(output, "catalogs.pack")).mtimeMs, mtime);
  assert.deepStrictEqual(first, fs.readFileSync(path.join(output, "catalogs.pack")));
  const fixture = createSourceCatalog(output);
  assert.throws(() => fixture.row("grouped", "001"), /Ambiguous source row/);
  assert.deepStrictEqual(fixture.row("grouped", "001", ["a"]), { id: "001", value: ".05" });
  assert.strictEqual(fixture.row("grouped", "001", ["b"]).value, "10;20|30");
  assert.strictEqual(fixture.rows("grouped").length, 2);
  assert.strictEqual(fixture.document("payParams"), null);
  const damaged = Buffer.from(first); damaged[damaged.length - 1] ^= 1;
  fs.writeFileSync(path.join(output, "catalogs.pack"), damaged);
  assert.throws(() => createSourceCatalog(output).rows("grouped"), /checksum mismatch/);
  assert.strictEqual(run("--check").status, 1);
  assert.deepStrictEqual(fs.readFileSync(path.join(output, "catalogs.pack")), damaged, "Check must not repair/write");
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log("PASS: complete source snapshot, checksums, group identity and repeat-import no-op are verified.");
