"use strict";

const assert=require("assert");
const {RuntimeCommandRouter}=require("./runtime_command_router");
const {lastShelterTutorialCommandiniQeydEt}=require("./runtime_last_shelter_tutorial_command");

(async()=>{
  const state={};
  const router=new RuntimeCommandRouter({
    mutationExecutor:async(_id,action)=>await action(),
    authoritativeMutationExecutor:async(_id,action)=>await action(),
    idempotencyExecutor:async({execute})=>await execute()
  });

  lastShelterTutorialCommandiniQeydEt(router,{
    getOrCreatePlayerState:()=>state
  });

  assert.strictEqual(router.has("SetTutorial"),true);
  assert.strictEqual(router.has("settutorial"),true);

  const ws={_authedPlayerId:"p1"};
  const sent=[];
  await router.dispatch({
    type:"SetTutorial",
    msg:{type:"SetTutorial",playerId:"p1",id:"1053"},
    ws,
    send:(_ws,payload)=>sent.push(payload),
    nowMs:()=>1
  });

  assert.deepStrictEqual(sent,[{type:"SetTutorial",success:true}]);
  assert.strictEqual(state.lastShelterTutorialRuntime.tutorialId,"1053");

  const sent2=[];
  await router.dispatch({
    type:"settutorial",
    msg:{type:"settutorial",playerId:"p1",id:"1027"},
    ws,
    send:(_ws,payload)=>sent2.push(payload)
  });
  assert.deepStrictEqual(sent2,[{type:"SetTutorial",success:true}]);
  assert.strictEqual(state.lastShelterTutorialRuntime.tutorialId,"1027");

  const mismatch=[];
  await router.dispatch({
    type:"SetTutorial",
    msg:{type:"SetTutorial",playerId:"p2",id:"1090"},
    ws,
    send:(_ws,payload)=>mismatch.push(payload)
  });
  assert.strictEqual(mismatch[0].code,"PLAYER_ID_MISMATCH");
  assert.strictEqual(state.lastShelterTutorialRuntime.tutorialId,"1027");

  console.log("PASS: SetTutorial is a PostgreSQL-authoritative idempotent Last Shelter mutation.");
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
