// Tijdelijke shim om de JSC-tests (tests/*.js) ook met Node te draaien.
// Gebruik: node tests/_node-runner.js tests/test-wachtrij.js
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const file=process.argv[2];
const ctx={};
ctx.globalThis=ctx;
ctx.print=(...a)=>console.log(...a);
ctx.load=(p)=>{
  const abs=path.resolve(path.dirname(file),'..', p.replace(/^\.\//,''));
  const code=fs.readFileSync(abs,'utf8');
  vm.runInContext(code, vmCtx, {filename:abs});
};
ctx.readFile=(p)=>fs.readFileSync(path.resolve(path.dirname(file),'..', p.replace(/^\.\//,'')),'utf8');
ctx.require=require;
ctx.console=console;
const vmCtx=vm.createContext(ctx);
const code=fs.readFileSync(file,'utf8');
vm.runInContext(code, vmCtx, {filename:file});
