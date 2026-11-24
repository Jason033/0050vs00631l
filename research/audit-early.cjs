'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),fields=new Map();
const document={getElementById(id){if(!fields.has(id))fields.set(id,{value:0,classList:{toggle(){},add(){},remove(){}},addEventListener(){}});return fields.get(id)},querySelectorAll(){return[]}};
const sb=vm.createContext({window:{marketData:[],addEventListener(){}},document});
for(const f of ['data0.js','data1.js','data2.js','data3.js','data4.js','market-meta.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sb,{filename:f});
const {data,simulate,earlyDividends,fundingRates,cashRates}=vm.runInContext('({data,simulate,earlyDividends,fundingRates,cashRates})',sb);
const base={weights:[0,1,0],mode:'history',earlyDividend:1,collateral:0,fixed:0,initial:100,monthly:0,reb:'none',interval:1,threshold:.1};
const factor=(start,end)=>data.filter(r=>r.date>=start&&r.date<=end).slice(1).reduce((v,r)=>v*Math.pow(1+(earlyDividends[r.date.slice(0,4)]??0),r.divFraction),1);
assert(Math.abs(factor('1967-01-05','2001-12-31')-16179.60/5551.24)<1e-9);
assert(Math.abs(factor('1986-01-04','2000-10-31')-6419.83/5544.18)<5e-5);
assert.equal(fundingRates['1974'],.09625); assert.equal(fundingRates['1981'],.1386); assert.equal(cashRates['1998'],.05928); assert(Math.abs(cashRates['2014']-.00554)<1e-12);
const calc=(a,b)=>{const rows=data.filter(r=>r.date>=a&&r.date<=b),z=simulate(rows,base);return {rows,z}};
const full=calc('1969-01-01','2014-10-30');
assert.equal(full.rows[0].date,'1969-01-04');
assert(Math.abs(full.z.annual-.151671)<2e-6); assert(Math.abs(full.z.mdd-(-.988328))<2e-6);
const q=calc('2003-01-02','2014-10-30'); assert(Math.abs(q.z.annual-.182947)<2e-6);
const live=data.filter(r=>r.date>='2015-01-05'&&r.date<='2025-12-31');
for(let i=1;i<live.length;i++) if(Number.isFinite(live[i].leverGross)){
  const z=vm.runInContext('modelReturn',sb)(live[i],base,live[i].benchmarkGross);
  assert(Math.abs(z-(live[i].leverGross-1))<1e-14);
}
console.log('early dividend endpoints, CBC rates, 1969–2014 model, and live ETF replay passed');
console.log('1969–2014 annual',full.z.annual,'max drawdown',full.z.mdd);
