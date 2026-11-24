'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),fields=new Map();
const document={
 getElementById(id){if(!fields.has(id))fields.set(id,{value:0,checked:false,textContent:'',innerHTML:'',style:{},className:'',classList:{_s:new Set(),toggle(x,on){on?this._s.add(x):this._s.delete(x)},add(x){this._s.add(x)},remove(x){this._s.delete(x)},contains(x){return this._s.has(x)}},addEventListener(){},getContext(){return{}},getBoundingClientRect(){return{left:0,width:1000}}});return fields.get(id)},
 querySelectorAll(){return[]}
};
const sandbox=vm.createContext({window:{marketData:[],addEventListener(){},devicePixelRatio:1},document});
for(const name of ['data0.js','data1.js','data2.js','data3.js','data4.js','market-meta.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const set=(id,value)=>document.getElementById(id).value=value;
Object.entries({stock:0,lev:100,cash:0,reb:'none',interval:1,unit:1,initial:1000000,monthly:10000,start:'2003-07-01',end:'2026-06-30',threshold:5,mode:'history',fixed:0,collateral:0,earlyDividend:1}).forEach(([k,v])=>set(k,v));
document.getElementById('dca').checked=false;
vm.runInContext("page='back';run()",sandbox);const once=document.getElementById('metrics').innerHTML;
vm.runInContext('run()',sandbox);assert.equal(vm.runInContext('runCount',sandbox),2);assert.equal(document.getElementById('metrics').innerHTML,once);assert.match(document.getElementById('message').textContent,/第 2 次.*重算結果相同/);
set('stock',40);set('lev',30);set('cash',30);document.getElementById('dca').checked=true;
vm.runInContext('run()',sandbox);const dca=document.getElementById('metrics').innerHTML;assert.notEqual(dca,once);assert.match(dca,/帳戶回撤/);
set('reb','time');set('interval',1);set('unit',3);
vm.runInContext('run()',sandbox);const rebalanced=document.getElementById('metrics').innerHTML;assert.notEqual(rebalanced,dca);assert.match(document.getElementById('message').textContent,/再平衡 [1-9][0-9]* 次/);
const {data,simulate}=vm.runInContext('({data,simulate})',sandbox),rows=data.filter(r=>r.date>='2003-07-01'&&r.date<='2026-06-30');
const base={weights:[.4,.3,.3],mode:'history',earlyDividend:1,collateral:0,fixed:0,initial:1e6,monthly:1e4,reb:'none',interval:3,threshold:.05};
const none=simulate(rows,base),quarterly=simulate(rows,{...base,reb:'time'}),ratio=simulate(rows,{...base,reb:'ratio'});
for(const x of [quarterly,ratio]){assert(x.rebalanceCount>0);assert.notEqual(x.annual,none.annual);assert.notEqual(x.vol,none.vol);assert.notEqual(x.mdd,none.mdd)}
const single=simulate(rows,{...base,weights:[0,1,0],reb:'time'});assert.equal(single.rebalanceCount,0);
console.log('repeated calculation, DCA, and both rebalance methods passed');
console.log({none:{annual:none.annual,vol:none.vol,mdd:none.mdd},quarterly:{annual:quarterly.annual,vol:quarterly.vol,mdd:quarterly.mdd,count:quarterly.rebalanceCount},ratio:{annual:ratio.annual,vol:ratio.vol,mdd:ratio.mdd,count:ratio.rebalanceCount}});
