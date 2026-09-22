"use strict";

const assert = require("assert");
const crypto = require("crypto");
const zlib = require("zlib");

const {
  TASK_BLOB_GZIP_BASE64,
  TASK_BLOB_SHA256,
  LAST_SHELTER_TASKS_OBSERVED,
  LAST_SHELTER_TASK_TEMPLATES,
  LAST_SHELTER_TASK_RUNTIME_DEFAULT,
  LAST_SHELTER_CHAPTER_TASK_REFERENCE,
  LAST_SHELTER_MISSION_CONFIG,
  lastShelterTaskTemplateAl,
  lastShelterMissionRuntimeDefaultHazirla,
  lastShelterMissionRuntimeTeminEt
} = require("./last_shelter_task_reference");

const raw = zlib.gunzipSync(
  Buffer.from(TASK_BLOB_GZIP_BASE64, "base64")
).toString("utf8");

assert.strictEqual(
  crypto.createHash("sha256").update(raw).digest("hex"),
  TASK_BLOB_SHA256
);

assert.strictEqual(LAST_SHELTER_TASKS_OBSERVED.length, 205);
assert.strictEqual(LAST_SHELTER_TASK_TEMPLATES.length, 205);
assert.strictEqual(LAST_SHELTER_TASK_RUNTIME_DEFAULT.length, 205);

const typeCounts = {};
for (const row of LAST_SHELTER_TASK_TEMPLATES) {
  typeCounts[row.type1] = (typeCounts[row.type1] || 0) + 1;
}
assert.deepStrictEqual(typeCounts, { 1:5, 49:100, 50:100 });

assert.strictEqual(LAST_SHELTER_TASKS_OBSERVED[0].id, "102001");
assert.strictEqual(LAST_SHELTER_TASKS_OBSERVED[204].id, "101001");

assert.deepStrictEqual(
  lastShelterTaskTemplateAl("102001").reward,
  [
    { type:7, value:{ num:10, id:"200215" } },
    { type:7, value:{ num:10, id:"200201" } },
    { type:7, value:{ num:30, id:"200266" } },
    { type:7, value:{ num:30, id:"200223" } }
  ]
);

assert.deepStrictEqual(
  LAST_SHELTER_TASK_RUNTIME_DEFAULT.filter(x => x.num || x.state),
  [
    { id:"2500003", num:1, state:0 },
    { id:"101002", num:1, state:0 },
    { id:"101003", num:1, state:0 },
    { id:"101004", num:1, state:0 },
    { id:"101005", num:1, state:0 },
    { id:"101001", num:1, state:1 }
  ]
);

assert.deepStrictEqual(
  LAST_SHELTER_CHAPTER_TASK_REFERENCE.chapter,
  {
    chapterid:"1",
    state:"0",
    reward:[
      { type:2, value:1000 },
      { type:3, value:500 },
      { type:7, value:{ num:5, id:"200223" } }
    ]
  }
);
assert.strictEqual(LAST_SHELTER_CHAPTER_TASK_REFERENCE.subTasks.length,5);
assert.strictEqual(
  LAST_SHELTER_CHAPTER_TASK_REFERENCE.subTasks.find(x => x.id === "2500003").num,
  1
);

assert.deepStrictEqual(
  LAST_SHELTER_MISSION_CONFIG,
  {
    new_mission_switch:1,
    chapter:1,
    chapter3:1,
    dailyquest:1,
    task_phone:0,
    online_reward:{ k1:"1",k2:"1",k3:"1",k4:"1",k5:"1",k6:"1" }
  }
);

const runtime = lastShelterMissionRuntimeDefaultHazirla();
assert.strictEqual(runtime.taskPoint,0);
assert.strictEqual(runtime.tasks.length,205);
assert.strictEqual(runtime.chapterTask.chapter.chapterid,"1");

const state = {};
const first = lastShelterMissionRuntimeTeminEt(state);
first.taskPoint = 9;
const second = lastShelterMissionRuntimeTeminEt(state);
assert.strictEqual(first,second);
assert.strictEqual(second.taskPoint,9);

console.log("PASS: verified Last Shelter 205-task catalog, fresh task state, chapter task, and mission flags are preserved.");
