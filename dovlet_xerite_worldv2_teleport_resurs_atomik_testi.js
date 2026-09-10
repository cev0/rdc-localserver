'use strict';
const assert = require('node:assert/strict');
const { worldV2TeleportHandleriYarat } = require('./dovlet_xerite_worldv2_teleport_handler');
const { oyuncuStateMutasiyasiniPostgresIleIcraEt } = require('./oyun_state_mutasiya_postgres');
const { worldV2ResursHedefiniAlClient, worldV2ResursuRezervEtClient,
  worldV2ResursToplamaniBitirClient } = require('./dovlet_xerite_worldv2_resurs_emeliyyat_sistemi');
const clone = value => JSON.parse(JSON.stringify(value));

// Transactional storage seam; handler, player snapshot mutation and resource mutation are REAL.
function database() {
  const node = (x,y) => ({ x,y,spawnSerial:7,remainingAmount:100,respawnAtMs:0,
    occupiedByPlayerId:'gatherer',occupiedByConvoyId:'convoy_1',occupiedUntilMs:2000000000000 });
  let committed = { state:{ playerId:'self',worldPlacement:{stateId:1,baseX:100,baseZ:100} },
    runtime:{version:4,stateId:1,nodes:{}} };
  for (let i=0;i<4;i++) committed.runtime.nodes[`state_1_worldv2_resource_${i+1}`]=node(300+i%2,400+Math.floor(i/2));
  committed.runtime.nodes.state_1_worldv2_resource_5=node(302,400);
  committed.runtime.nodes.state_2_worldv2_resource_1=node(300,400);
  const db={ fail:'',sql:[], read:()=>clone(committed), seed:value=>{committed=clone(value);}, extraBase:null };
  db.pool={async connect(){
    let working=null;
    return {async query(sql,params=[]) {
      const text=sql.replace(/\s+/g,' ').trim();db.sql.push({text,params});
      if(text==='BEGIN'){working=clone(committed);return {rows:[]};}
      if(text==='COMMIT'){if(db.fail==='commit')throw Error('Injected COMMIT failure');committed=working;working=null;return {rows:[]};}
      if(text==='ROLLBACK'){working=null;return {rows:[]};}
      if(text.includes('pg_advisory_xact_lock'))return {rows:[]};
      if(text.startsWith('WITH son_snapshot')) {
        const bases=[{oyuncu_id:'self',detallar:{state:clone((working||committed).state)}}];
        if(db.extraBase)bases.push({oyuncu_id:'new_base',detallar:{state:{playerId:'new_base',worldPlacement:{stateId:1,baseX:db.extraBase.x,baseZ:db.extraBase.y}}}});
        return {rows:bases};
      }
      if(text.startsWith('SELECT detallar')||text.startsWith('SELECT id, detallar')) {
        const value=(working||committed);
        return {rows:[{id:41,detallar:params[1]==='oyun_state_snapshot_v1'?{state:clone(value.state)}:{runtime:clone(value.runtime)}}]};
      }
      if(text.startsWith('INSERT INTO hesab_audit_jurnali')) {
        assert.ok(working,'No out-of-transaction writes');
        const payload=JSON.parse(params[2]);
        if(payload.state){if(db.fail==='snapshot')throw Error('Injected snapshot failure');working.state=payload.state;}
        if(payload.runtime){if(db.fail==='resource')throw Error('Injected resource write failure');working.runtime=payload.runtime;}
        return {rows:[{id:42}]};
      }
      if(text.startsWith('DELETE FROM hesab_audit_jurnali'))return {rows:[]};
      throw Error('Unexpected SQL: '+text);
    },release(){assert.equal(working,null,'Every transaction finishes');}};
  }};
  return db;
}

async function run(){
  for(const failure of ['', 'resource','snapshot','commit','blocked']) {
    const db=database(), before=db.read(), state=clone(before.state), replies=[];
    db.fail=failure;
    const handler=worldV2TeleportHandleriYarat({
      stateBerpaOlunub:()=>true,
      stateMutasiyaEt:(id,current,operation)=>oyuncuStateMutasiyasiniPostgresIleIcraEt(id,current,operation,{hovuz:db.pool}),
      bazalariKilidliAl:async()=>({bases:failure==='blocked'?[{playerId:'other',x:301,y:401}]:[]}),
      bazaKeshiniTemizle:()=>{}
    });
    const context={type:'state_map_v2_base_teleport_request',msg:{stateId:1,x:300,y:400},
      ws:{_authedPlayerId:'self'},nowMs:()=>1770000000000,getOrCreatePlayerState:()=>state,
      makeClientState:clone,send:(_,message)=>replies.push(message)};
    const log=console.error;try{if(failure&&failure!=='blocked')console.error=()=>{};await handler(context);}finally{console.error=log;}
    if(failure){
      assert.equal(replies[0].success,false,failure);
      assert.deepEqual(db.read(),before,'Failed teleport preserves resources and persisted base: '+failure);
      assert.deepEqual(state,before.state,'Failed teleport preserves live state: '+failure);
      assert.deepEqual(replies[0].removedResourceTargetIds||[],[]);
      if(failure==='blocked')assert.equal(db.sql.filter(s=>s.text.startsWith('INSERT')).length,0);
      continue;
    }
    assert.equal(replies[0].success,true);
    assert.equal(replies[0].removedResourceTargetIds.length,4,'All four covered resources disappear, including reserved ones');
    assert.equal(db.read().state.worldPlacement.baseX,300);
    assert.equal(state.worldPlacement.baseX,300,'RAM updates only after commit');
    for(let i=1;i<=4;i++){
      const n=db.read().runtime.nodes[`state_1_worldv2_resource_${i}`];
      assert.equal(n.remainingAmount,0);assert.ok(n.respawnAtMs>1770000000000);
      assert.equal(n.occupiedByPlayerId,'');assert.equal(n.occupiedByConvoyId,'');
    }
    assert.deepEqual(db.read().runtime.nodes.state_1_worldv2_resource_5,before.runtime.nodes.state_1_worldv2_resource_5,'Edge-adjacent resource remains');
    assert.deepEqual(db.read().runtime.nodes.state_2_worldv2_resource_1,before.runtime.nodes.state_2_worldv2_resource_1,'Other state untouched');
    assert.equal(db.sql.filter(s=>s.text==='BEGIN').length,1,'One transaction covers both changes');
    assert.equal(db.sql.filter(s=>s.text==='COMMIT').length,1);
    assert.ok(db.sql.some(s=>s.text.includes('pg_advisory_xact_lock')&&s.params[0]==='dovlet_worldv2_resurs_runtime_v2'),'Shares the gather/respawn resource lock');
    const client=await db.pool.connect();await client.query('BEGIN');
    const targetId='state_1_worldv2_resource_1_spawn_7';
    assert.equal((await worldV2ResursHedefiniAlClient(client,1,targetId,1770000000001)).success,false,'Stale resource lookup rejected after commit/reload');
    assert.equal((await worldV2ResursuRezervEtClient(client,{stateId:1,targetId,playerId:'gatherer',convoyId:'convoy_1'})).success,false,'Cannot reserve removed target');
    assert.equal((await worldV2ResursToplamaniBitirClient(client,{stateId:1,targetId,playerId:'gatherer',convoyId:'convoy_1',miqdar:100})).success,false,'No reward for removed resource');
    await client.query('COMMIT');client.release();
    const after=db.read();replies.length=0;await handler(context);
    assert.equal(replies[0].errorCode,'WORLDV2_TELEPORT_ALREADY_THERE');assert.deepEqual(db.read(),after,'Repeated request cannot delete again');
  }
  // Execute the real respawn provider with stale caller data. Its DB snapshot under
  // the resource lock must prevent spawning inside a base placed after that data.
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const db=database(), loaded={exports:{}};
  const filename=path.join(__dirname,'dovlet_xerite_worldv2_resurs_provider.js');
  const req=name=>name==='./verilenler_bazasi'?{proqramHovuzunuAl:()=>db.pool}:require(name);
  vm.runInThisContext('(function(require,module,exports){'+fs.readFileSync(filename,'utf8')+'\n})',{filename})(req,loaded,loaded.exports);
  const provider=loaded.exports;
  const data=db.read();data.runtime.nodes={};
  for(let i=1;i<=600;i++)data.runtime.nodes[`state_1_worldv2_resource_${i}`]={spawnSerial:7,x:42+(i%200)*2,y:42+Math.floor(i/200)*2,remainingAmount:100,respawnAtMs:0};
  const target=data.runtime.nodes.state_1_worldv2_resource_1;
  target.remainingAmount=0;target.respawnAtMs=1000;
  db.extraBase=provider.worldV2ResursMovqeyiSec({stateId:1,index:1,spawnSerial:8,kohneMovqe:{x:target.x,y:target.y},bases:[]});
  db.seed(data);
  const result=await provider.worldV2ResurslariniAl(1,[],1001,600,{butunMovcudlar:true});
  const spawned=result.resources.find(r=>r.index===1);
  assert.ok(spawned&&spawned.spawnSerial===8,'Cleared resource can respawn as a new target elsewhere');
  assert.ok(Math.hypot(spawned.x-db.extraBase.x,spawned.y-db.extraBase.y)>=5,'Fresh database base prevents respawn under its footprint despite stale caller data');
  const lockIndex=db.sql.findIndex(s=>s.text.includes('pg_advisory_xact_lock')&&s.params[0]==='dovlet_worldv2_resurs_runtime_v2');
  assert.ok(db.sql.findIndex(s=>s.text.startsWith('WITH son_snapshot'))>lockIndex,'Read bases only after taking the shared resource lock');
  console.log('WorldV2 teleport/resource atomic commit, rollback, target invalidation and respawn tests OK');
}
module.exports=run();
