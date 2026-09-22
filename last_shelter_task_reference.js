"use strict";

const zlib = require("zlib");

/*
 * Verified Last Shelter v1.250.102 task/chapter snapshot recovered from the
 * fresh-account init payload.
 *
 * The compressed blob contains the 205 task rows exactly as observed
 * (id/type1/reward/num/state). Compression keeps the repository readable while
 * retaining byte-stable reference data. No reward-type meaning is invented.
 */

const TASK_BLOB_GZIP_BASE64 = "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";
const TASK_BLOB_SHA256 = "de5887a962f3fdbd6868e3fd5b11b2ef432ef125347c9db5930a5c084869de4b";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function taskBlobDecodeEt() {
  const raw = zlib.gunzipSync(
    Buffer.from(TASK_BLOB_GZIP_BASE64, "base64")
  ).toString("utf8");

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Last Shelter task reference is not an array.");
  }
  return parsed;
}

const LAST_SHELTER_TASKS_OBSERVED = deepFreeze(taskBlobDecodeEt());

const LAST_SHELTER_TASK_TEMPLATES = deepFreeze(
  LAST_SHELTER_TASKS_OBSERVED.map(row => ({
    id: String(row.id),
    type1: Number(row.type1),
    reward: Array.isArray(row.reward)
      ? JSON.parse(JSON.stringify(row.reward))
      : []
  }))
);

const LAST_SHELTER_TASK_RUNTIME_DEFAULT = deepFreeze(
  LAST_SHELTER_TASKS_OBSERVED.map(row => ({
    id: String(row.id),
    num: Number(row.num) || 0,
    state: Number(row.state) || 0
  }))
);

const LAST_SHELTER_CHAPTER_TASK_REFERENCE = deepFreeze({
  hasNextChapter: true,
  chapter: {
    chapterid: "1",
    state: "0",
    reward: [
      { type:2, value:1000 },
      { type:3, value:500 },
      { type:7, value:{ num:5, id:"200223" } }
    ]
  },
  subTasks: [
    { id:"2500004", type1:1, num:0, state:0, reward:[{ type:20, value:120 }] },
    { id:"2500005", type1:1, num:0, state:0, reward:[{ type:20, value:120 }] },
    { id:"2500006", type1:1, num:0, state:0, reward:[{ type:20, value:120 }] },
    { id:"2500001", type1:1, num:0, state:0, reward:[{ type:20, value:120 }] },
    { id:"2500003", type1:1, num:1, state:0, reward:[{ type:20, value:120 }] }
  ]
});

const LAST_SHELTER_MISSION_CONFIG = deepFreeze({
  new_mission_switch: 1,
  chapter: 1,
  chapter3: 1,
  dailyquest: 1,
  task_phone: 0,
  online_reward: {
    k1:"1", k2:"1", k3:"1", k4:"1", k5:"1", k6:"1"
  }
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function lastShelterTaskTemplateAl(id) {
  const key = id == null ? "" : String(id).trim();
  const row = LAST_SHELTER_TASK_TEMPLATES.find(x => x.id === key);
  return row ? clone(row) : null;
}

function lastShelterTaskRuntimeDefaultHazirla() {
  return LAST_SHELTER_TASK_RUNTIME_DEFAULT.map(row => ({ ...row }));
}

function lastShelterChapterRuntimeDefaultHazirla() {
  return {
    hasNextChapter: LAST_SHELTER_CHAPTER_TASK_REFERENCE.hasNextChapter,
    chapter: {
      chapterid: LAST_SHELTER_CHAPTER_TASK_REFERENCE.chapter.chapterid,
      state: LAST_SHELTER_CHAPTER_TASK_REFERENCE.chapter.state
    },
    subTasks: LAST_SHELTER_CHAPTER_TASK_REFERENCE.subTasks.map(row => ({
      id: row.id,
      num: row.num,
      state: row.state
    }))
  };
}

function lastShelterMissionRuntimeDefaultHazirla() {
  return {
    taskPoint: 0,
    tasks: lastShelterTaskRuntimeDefaultHazirla(),
    chapterTask: lastShelterChapterRuntimeDefaultHazirla()
  };
}

function lastShelterMissionRuntimeTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterMissionRuntime ||
    typeof state.lastShelterMissionRuntime !== "object" ||
    Array.isArray(state.lastShelterMissionRuntime)
  ) {
    state.lastShelterMissionRuntime =
      lastShelterMissionRuntimeDefaultHazirla();
  }

  const runtime = state.lastShelterMissionRuntime;

  runtime.taskPoint =
    Number.isFinite(Number(runtime.taskPoint))
      ? Math.max(0, Math.trunc(Number(runtime.taskPoint)))
      : 0;

  if (!Array.isArray(runtime.tasks)) {
    runtime.tasks = lastShelterTaskRuntimeDefaultHazirla();
  }

  if (
    !runtime.chapterTask ||
    typeof runtime.chapterTask !== "object" ||
    Array.isArray(runtime.chapterTask)
  ) {
    runtime.chapterTask =
      lastShelterChapterRuntimeDefaultHazirla();
  }

  return runtime;
}

module.exports = {
  TASK_BLOB_GZIP_BASE64,
  TASK_BLOB_SHA256,
  LAST_SHELTER_TASKS_OBSERVED,
  LAST_SHELTER_TASK_TEMPLATES,
  LAST_SHELTER_TASK_RUNTIME_DEFAULT,
  LAST_SHELTER_CHAPTER_TASK_REFERENCE,
  LAST_SHELTER_MISSION_CONFIG,
  lastShelterTaskTemplateAl,
  lastShelterTaskRuntimeDefaultHazirla,
  lastShelterChapterRuntimeDefaultHazirla,
  lastShelterMissionRuntimeDefaultHazirla,
  lastShelterMissionRuntimeTeminEt
};
