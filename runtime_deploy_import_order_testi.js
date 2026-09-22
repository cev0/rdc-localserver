"use strict";
const assert=require("assert"),fs=require("fs");
const s=fs.readFileSync("server.js","utf8");
const a=s.indexOf('require("./runtime_deploy_config")'),b=s.indexOf("const runtimeDeployConfig =");
assert(a>=0&&b>=0&&a<b,"runtime_deploy_config import order invalid");
console.log("runtime deploy import order testi kecdi");
