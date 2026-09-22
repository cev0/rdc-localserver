"use strict";

const {
  playerIdUyugunluqYoxla
}=require("./runtime_core_read_commands");
const {
  LAST_SHELTER_TASK_TEMPLATES,
  LAST_SHELTER_CHAPTER_TASK_REFERENCE,
  LAST_SHELTER_MISSION_CONFIG,
  lastShelterMissionRuntimeTeminEt
}=require("./last_shelter_task_reference");

function clone(value){
  return value==null?value:JSON.parse(JSON.stringify(value));
}

function authYoxla(ws,msg,send){
  const result=playerIdUyugunluqYoxla(msg,ws);
  if(result.ok) return result;
  send(ws,{
    type:"error",
    code:result.message==="Player ID mismatch"?"PLAYER_ID_MISMATCH":"NOT_AUTHED",
    message:result.message
  });
  return null;
}

function nowAl(nowMs){
  return typeof nowMs==="function"?nowMs():Date.now();
}

function missionSnapshotHazirla(state){
  const runtime=lastShelterMissionRuntimeTeminEt(state);
  if(!runtime) return null;

  const runtimeById=new Map(
    runtime.tasks.filter(Boolean).map(row=>[String(row.id),row])
  );
  const chapterRuntime=runtime.chapterTask||{};
  const chapter=chapterRuntime.chapter||{};
  const subById=new Map(
    (Array.isArray(chapterRuntime.subTasks)?chapterRuntime.subTasks:[])
      .filter(Boolean)
      .map(row=>[String(row.id),row])
  );

  return {
    config:clone(LAST_SHELTER_MISSION_CONFIG),
    taskPoint:Number.isFinite(Number(runtime.taskPoint))
      ? Math.max(0,Math.trunc(Number(runtime.taskPoint)))
      : 0,
    tasks:LAST_SHELTER_TASK_TEMPLATES.map(template=>{
      const row=runtimeById.get(template.id)||{};
      return {
        ...clone(template),
        num:Number.isFinite(Number(row.num))?Math.max(0,Math.trunc(Number(row.num))):0,
        state:Number.isFinite(Number(row.state))?Math.max(0,Math.trunc(Number(row.state))):0
      };
    }),
    chapterTask:{
      hasNextChapter:chapterRuntime.hasNextChapter==null
        ? LAST_SHELTER_CHAPTER_TASK_REFERENCE.hasNextChapter
        : chapterRuntime.hasNextChapter===true,
      chapter:{
        ...clone(LAST_SHELTER_CHAPTER_TASK_REFERENCE.chapter),
        chapterid:String(chapter.chapterid==null
          ? LAST_SHELTER_CHAPTER_TASK_REFERENCE.chapter.chapterid
          : chapter.chapterid),
        state:String(chapter.state==null
          ? LAST_SHELTER_CHAPTER_TASK_REFERENCE.chapter.state
          : chapter.state)
      },
      subTasks:LAST_SHELTER_CHAPTER_TASK_REFERENCE.subTasks.map(template=>{
        const row=subById.get(template.id)||{};
        return {
          ...clone(template),
          num:Number.isFinite(Number(row.num))?Math.max(0,Math.trunc(Number(row.num))):template.num,
          state:Number.isFinite(Number(row.state))?Math.max(0,Math.trunc(Number(row.state))):template.state
        };
      })
    }
  };
}

function lastShelterMissionCommandleriniQeydEt(router,deps){
  if(!router) throw new Error("Command router yoxdur.");
  const {getOrCreatePlayerState}=deps||{};
  if(typeof getOrCreatePlayerState!=="function"){
    throw new Error("getOrCreatePlayerState yoxdur.");
  }

  router.register(
    "mission.info",
    async ({ws,msg,send,nowMs})=>{
      const auth=authYoxla(ws,msg,send);
      if(!auth) return;
      const state=getOrCreatePlayerState(auth.playerId);
      send(ws,{
        type:"mission.info",
        playerId:auth.playerId,
        serverTimeUnixMs:nowAl(nowMs),
        mission:missionSnapshotHazirla(state)
      });
    },
    {authRequired:true,mutation:false}
  );

  return router;
}

module.exports={
  missionSnapshotHazirla,
  lastShelterMissionCommandleriniQeydEt
};
