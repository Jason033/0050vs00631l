'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const fields=new Map();
const document={getElementById(id){if(!fields.has(id))fields.set(id,{value:0,classList:{toggle(){},add(){},remove(){}},addEventListener(){}});return fields.get(id);},querySelectorAll(){return []}};
const sandbox=vm.createContext({window:{marketData:[],addEventListener(){}},document});
for(const name of ['data0.js','data1.js','data2.js','data3.js','data4.js','market-meta.js','app.js']){
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
}
const {data,modelReturn,simulate,earlyDividends,fundingRates,cashRates,averageLogCarry,annual}=vm.runInContext('({data,modelReturn,simulate,earlyDividends,fundingRates,cashRates,averageLogCarry,annual})',sandbox);
const config={weights:[0,1,0],mode:'history',earlyDividend:1,collateral:0,fixed:0,initial:100,monthly:0,reb:'none'};
const gross=(rows,fn)=>rows.reduce((v,r)=>v*fn(r),1);
const model=(rows)=>gross(rows,r=>1+modelReturn(r,config,r.benchmarkGross))-1;
const pct=x=>(x*100).toFixed(4);
const base=data.filter(r=>r.date<='2001-12-31');
const raw=base.at(-1).market/base[0].market;
const dividend=gross(base.slice(1),r=>Math.pow(1+(earlyDividends[r.date.slice(0,4)]??0),r.divFraction));
assert(Math.abs(raw-5551.24/92.48)<1e-5);
assert(Math.abs(dividend-16179.60/5551.24)<1e-9);
console.log('1967–2001:', pct(raw**(1/35)-1), pct((raw*dividend)**(1/35)-1), dividend);
assert.equal(data.length,16161);
assert.equal(data.find(r=>Number.isFinite(r.tx)).date,'1998-07-22');
assert(data.filter(r=>r.date>='1998-07-22').every(r=>Number.isFinite(r.tx)));
for(let i=1;i<data.length;i++)assert(data[i-1].date<data[i].date);
for(const [key,[market,tx]] of Object.entries(annual)){
  const y=+key;
  const rows=data.filter(r=>r.date.startsWith(key)).slice(y===2003?1:0);
  assert(Math.abs(gross(rows,r=>r.tx+1)-1-tx)<1e-8);
  assert(Math.abs(gross(rows,r=>r.marketGross)-1-market)<1e-7);
}
const ys=[];
for(let year=2015;year<=2026;year++){
  const rows=data.filter(r=>r.date.startsWith(String(year)));
  const before=data.findLast(r=>r.date<rows[0].date&&r.lever);
  const actual=rows.findLast(r=>r.lever).lever/before.lever-1;
  const synthetic=model(rows);
  const b=gross(rows,r=>r.benchmarkGross)-1;
  const s=simulate([before,...rows],config);
  assert(Math.abs(s.end/100*(1+.0007125)-1-synthetic)<1e-9);
  console.log(year,pct(b),pct(synthetic),pct(actual),pct(synthetic-actual));
  if(year<2026)ys.push(Math.abs(synthetic-actual));
}
console.log('MAE 2015–2025:',pct(ys.reduce((a,b)=>a+b)/ys.length),'MAE 2024–2025:',pct((ys.at(-1)+ys.at(-2))/2));
const months=[...new Set(data.filter(r=>r.date>='2015'&&r.date<'2024').map(r=>r.date.slice(0,7)))];
const monthlyModels=[],monthlyActual=[];
for(const m of months){
  const rows=data.filter(r=>r.date.startsWith(m));
  const past=data.findLast(r=>r.date<rows[0].date&&r.lever);
  monthlyModels.push(model(rows));
  monthlyActual.push(rows.findLast(r=>r.lever).lever/past.lever-1);
}
for(const v of [monthlyModels,monthlyActual]){
  const mean=v.reduce((a,b)=>a+b)/v.length;
  const sd=Math.sqrt(v.reduce((sum,x)=>sum+(x-mean)**2,0)/(v.length-1));
  console.log('monthly',v.length,pct(mean),pct(sd),pct(Math.min(...v)),pct(Math.max(...v)));
}
const stress=simulate(data,config);
assert(stress.end>0&&stress.mdd<0&&stress.vol>0&&Number.isFinite(stress.annual));
document.getElementById('earlyDividend').value=1;
Object.entries({stock:0,lev:50,cash:50,reb:'time',interval:1,unit:3,initial:1000000,dca:true,monthly:3000,start:'1967-01-05',end:'2026-11-23',threshold:5,mode:'history',lifeMode:'bootstrap',years:40,runs:100}).forEach(([k,v])=>document.getElementById(k)[k==='dca'?'checked':'value']=v);
vm.runInContext("page='life'; run()",sandbox);
assert.equal(document.getElementById('range').textContent,'40 年・100 組');
assert.match(document.getElementById('metrics').innerHTML,/虧錢機率/);
console.log('40-year bootstrap and full history ran');
document.getElementById('start').value='2020-01-04';
document.getElementById('end').value='2020-01-12';
vm.runInContext("page='back'; run()",sandbox);
assert.equal(document.getElementById('range').textContent,'2020-01-06 至 2020-01-10');
console.log('date range skips closed days correctly');
const span=data.filter(r=>r.date<='2006-12-31');
for(const assumed of [.5,1,1.5]){
  const result=simulate(span,{...config,earlyDividend:assumed});
  const benchmark=simulate(span,{...config,earlyDividend:assumed},[1,0,0]);
  console.log('early dividend multiplier',assumed.toFixed(1),pct(result.annual),pct(benchmark.annual));
}
console.log('0050 Jan–Sep 2026:',pct(gross(data.filter(r=>r.date>='2026-01-01'&&r.date<='2026-09-23'),r=>r.benchmarkGross)-1));
const fitWindow=data.filter(r=>r.date>='2015-01-05'&&r.date<='2026-10-27');
let lastObserved=fitWindow[0].lever;
const replay=fitWindow.map(r=>{
  const before=lastObserved;
  if(r.lever)lastObserved=r.lever;
  return {...r,tx:(lastObserved/before-1+.0104*r.elapsed)/2};
});
const quarterly={...config,weights:[0,.5,.5],reb:'time',interval:3};
for(const [label,wind,w] of [['model quarterly',fitWindow,quarterly.weights],['00631L quarterly',replay,quarterly.weights],['0050',fitWindow,[1,0,0]]]){
  const q=simulate(wind,quarterly,w);
  console.log('FinLab cross-check',label,pct(q.annual),pct(q.mdd),pct(q.vol));
}

for(const assumed of [-2,0,Math.expm1(averageLogCarry)*100]){
  const result=simulate(span,{...config,mode:'fixed',fixed:assumed});
  console.log('fixed annual difference sensitivity',assumed.toFixed(2)+'%',pct(result.annual));
}
