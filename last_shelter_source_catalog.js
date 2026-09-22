"use strict";

// Data, not executable server configuration. Each catalog is an independent
// gzip member, so requesting science does not inflate either world map.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }

function createSourceCatalog(directory = path.join(__dirname, "data", "last_shelter")) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
  if (manifest.formatVersion !== 1 || manifest.packFile !== "catalogs.pack") {
    throw new Error("Unsupported Last Shelter source catalog format");
  }
  const documents = new Map();
  const indexes = new Map();

  function load(name) {
    if (!Object.hasOwn(manifest.catalogs, name)) return null;
    if (documents.has(name)) return documents.get(name);
    const entry = manifest.catalogs[name];
    const buffer = Buffer.alloc(entry.compressedBytes);
    const fd = fs.openSync(path.join(directory, manifest.packFile), "r");
    try {
      let read = 0;
      while (read < buffer.length) {
        const count = fs.readSync(fd, buffer, read, buffer.length - read, entry.offset + read);
        if (count === 0) throw new Error(`Truncated source catalog: ${name}`);
        read += count;
      }
    } finally { fs.closeSync(fd); }
    if (hash(buffer) !== entry.sha256) throw new Error(`Source checksum mismatch: ${name}`);
    const json = zlib.gunzipSync(buffer, { maxOutputLength: entry.jsonBytes });
    if (json.length !== entry.jsonBytes || hash(json) !== entry.jsonSha256) {
      throw new Error(`Source document checksum mismatch: ${name}`);
    }
    const document = JSON.parse(json.toString("utf8"));
    documents.set(name, document);
    return document;
  }

  function index(name) {
    if (indexes.has(name)) return indexes.get(name);
    const document = load(name);
    if (!document) return null;
    const all = [], byId = new Map();
    function visit(node, groups) {
      const tag = node.tag.split("}").pop();
      const nextGroups = tag === "Group" ? [...groups, node.attributes.id ?? ""] : groups;
      if (tag === "ItemSpec") {
        const entry = { attributes: node.attributes, groups: [...groups] };
        all.push(entry);
        const id = node.attributes.id;
        if (id != null) {
          if (!byId.has(id)) byId.set(id, []);
          byId.get(id).push(entry);
        }
      }
      for (const child of node.children || []) visit(child, nextGroups);
    }
    visit(document, []);
    const result = { all, byId };
    indexes.set(name, result);
    return result;
  }

  return {
    manifest: () => clone(manifest),
    names: () => Object.keys(manifest.catalogs),
    document: name => clone(load(name)),
    rows: name => (index(name)?.all || []).map(entry => ({ ...entry.attributes })),
    entries: name => clone(index(name)?.all || []),
    row(name, id, groups) {
      let matches = index(name)?.byId.get(String(id)) || [];
      if (groups !== undefined) {
        matches = matches.filter(entry => JSON.stringify(entry.groups) === JSON.stringify(groups));
      }
      if (matches.length > 1) throw new Error(`Ambiguous source row ${name}/${id}; specify Group path`);
      return matches.length === 1 ? { ...matches[0].attributes } : null;
    },
    release(name) { documents.delete(name); indexes.delete(name); }
  };
}

const sourceCatalog = createSourceCatalog();
module.exports = { createSourceCatalog, sourceCatalog };
