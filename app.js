'use strict';
const {counts,annual,averageLogCarry,earlyDividends,fundingRates,cashRates}=window.marketMeta;
const fee=.0007125, tax=.001, fundFee=.0104;
const $=id=>document.getElementById(id), num=id=>Number($(id).value);
const builtIn=window.marketData.map(([date,price,market,tx,lever,tradable])=>({date,price,market,tx,lever,tradable}));
const dividendCounts={...counts,'2000':builtIn.filter(r=>r.date>='2000-01-01'&&r.date<='2000-10-31').length};
for(let i=1;i<builtIn.length;i++){
  const r=builtIn[i], prev=builtIn[i-1], year=r.date.slice(0,4);
  r.benchmarkGross=r.price/prev.price;
  r.marketGross=r.market/prev.market;
  r.leverGross=Number.isFinite(r.lever)&&Number.isFinite(prev.lever)?r.lever/prev.lever:null;
  r.divFraction=dividendCounts[year]&&!(year==='2000'&&r.date>'2000-10-31')?1/dividendCounts[year]:0;
  r.elapsed=yearsDiff(prev.date,r.date);
}
let data=builtIn,page='back';
$('dataStatus').textContent=`內建資料：${data[0].date} 至 ${data.at(-1).date}・${data.length.toLocaleString()} 筆`;
$('start').min=$('end').min=data[0].date;
$('start').max=$('end').max=data.at(-1).date;
$('start').value=data[0].date;
$('end').value=data.at(-1).date;
$('earlyDividend').value='1.00';
const print=x=>(x>=0?'+':'')+(x*100).toFixed(2)+'%';
$('spreadTable').innerHTML=Object.entries(annual).map(([yr,[s,f]])=>
  `<tr><td>${yr}${yr==='2026'?' 至 11/23':yr==='2003'?' 自 1/2 收盤':''}</td><td>${print(s)}</td><td>${print(f)}</td><td>${((f-s)*100).toFixed(2)}</td></tr>`).join('')
  +`<tr><th colspan="3">2004–2025 平均相對年增率（1 倍曝險）</th><td>${print(Math.expm1(averageLogCarry))}</td></tr>`;
function modelReturn(r, c, benchmarkGross){
  const years=r.elapsed,year=r.date.slice(0,4);
  const divRate=(earlyDividends[year]??0)*c.earlyDividend;
  const div=Math.exp(Math.log1p(divRate)*r.divFraction);
  const gross=(r.marketGross??benchmarkGross)*div;
  if(c.mode==='history'&&Number.isFinite(r.leverGross)) return r.leverGross-1;
  if(c.mode==='history'&&Number.isFinite(r.tx)) return 2*r.tx+((cashRates[year]??0)+c.collateral-fundFee)*years;
  if(c.mode==='history') return 2*(gross-1)-((fundingRates[year]??fundingRates['1969'])+fundFee-c.collateral)*years;
  const carry=c.mode==='fixed'?Math.log1p(c.fixed/100):0;
  const syntheticGross=gross*Math.exp(carry*years);
  return 2*(syntheticGross-1)+(c.collateral-fundFee)*years;
}
$('sources').onclick=()=>{document.querySelectorAll('[data-source-tab]').forEach((b,i)=>b.classList.toggle('active',i===0));document.querySelectorAll('[data-source-panel]').forEach((p,i)=>p.classList.toggle('hidden',i!==0));$('sourcesDialog').showModal()};document.querySelectorAll('[data-source-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-source-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-source-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.sourcePanel!==b.dataset.sourceTab))});$('info').onclick=()=>$('assumptions').showModal();$('showTable').onclick=()=>$('spreadDialog').showModal();document.querySelectorAll('.close').forEach(x=>x.onclick=()=>x.closest('dialog').close());
$('dca').onchange=()=>$('dcaWrap').classList.toggle('hidden',!$('dca').checked);$('reb').onchange=()=>{$('timeFields').classList.toggle('hidden',$('reb').value!=='time');$('thresholdField').classList.toggle('hidden',!['ratio','exposure'].includes($('reb').value))};$('reb').onchange();$('mode').onchange=()=>$('fixedField').classList.toggle('hidden',$('mode').value!=='fixed');$('lifeMode').onchange=()=>$('runsWrap').classList.toggle('hidden',$('lifeMode').value!=='bootstrap');
function tab(p){page=p;$('tabBack').className=p==='back'?'active':'alt';$('tabLife').className=p==='life'?'active':'alt';$('lifeSettings').classList.toggle('hidden',p!=='life');$('resultTitle').textContent=p==='back'?'歷史回測結果':'人生模擬結果';$('result').classList.add('hidden');$('details').classList.add('hidden');$('message').textContent='設定完成後按下計算。'}$('tabBack').onclick=()=>tab('back');$('tabLife').onclick=()=>tab('life');
$('file').onchange=async e=>{try{let text=(await e.target.files[0].text()).replace(/^\ufeff/,'');let lines=text.trim().split(/\r?\n/);let h=lines.shift().split(',').map(v=>v.trim().toLowerCase().replaceAll('"',''));let di=h.findIndex(v=>['date','日期'].includes(v)),pi=h.findIndex(v=>['total_return','adj close','adj_close','adjusted_close','含息指數','還原收盤價'].includes(v));if(di<0||pi<0)throw Error('找不到 date 與 total_return 欄位。');data=lines.map(line=>{let c=line.split(',');return {date:c[di]?.replaceAll('"','').trim(),price:Number(c[pi]?.replaceAll('"','').trim())}}).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)&&x.price>0).sort((a,b)=>a.date.localeCompare(b.date));if(data.length<3)throw Error('有效資料不足。');for(let i=1;i<data.length;i++)if(data[i].date===data[i-1].date)throw Error('日期重複：'+data[i].date);$('start').min=$('end').min=data[0].date;$('start').max=$('end').max=data.at(-1).date;$('start').value=data[0].date;$('end').value=data.at(-1).date;$('dataStatus').textContent=`已匯入 ${data.length.toLocaleString()} 筆：${data[0].date} 至 ${data.at(-1).date}`;}catch(err){data=[];$('dataStatus').textContent='資料讀取失敗：'+err.message}};
function inputs(){const weights=[num('stock')/100,num('lev')/100,num('cash')/100],start=$('start').value,end=$('end').value;if(weights.some(x=>!Number.isFinite(x)||x<0)||Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-8)throw Error('三項資產比例合計必須為 100%。');if(num('initial')<0||($('dca').checked&&num('monthly')<0)||(!num('initial')&&!($('dca').checked&&num('monthly')>0)))throw Error('請輸入有效投入金額。');if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw Error('請輸入有效日期，且起始日期不得晚於結束日期。');if(num('interval')<1||num('threshold')<=0)throw Error('再平衡間隔及門檻必須大於零。');if(num('earlyDividend')<0||num('earlyDividend')>3||num('fixed')<=-100||num('collateral')<-20||num('collateral')>20)throw Error('請檢查股息、期貨差額與現金收益的輸入範圍。');return {weights,start,end,initial:num('initial'),monthly:$('dca').checked?num('monthly'):0,reb:$('reb').value,interval:Math.floor(num('interval'))*num('unit'),threshold:num('threshold')/100,mode:$('mode').value,fixed:num('fixed'),earlyDividend:num('earlyDividend'),collateral:num('collateral')/100};}
function allocate(v,w){let lo=0,hi=v.reduce((a,b)=>a+b,0);for(let j=0;j<55;j++){let m=(lo+hi)/2;let cost=0;for(let k=0;k<2;k++){let diff=m*w[k]-v[k];cost+=diff>=0?diff*fee:-diff*(fee+tax)}let total=v[0]+v[1]+v[2];if(m+cost>total)hi=m;else lo=m}return w.map(x=>x*lo)}
function addMoney(v,amount,w){let net=amount/(1+fee*(w[0]+w[1]));for(let k=0;k<3;k++)v[k]+=net*w[k]}
function yearsDiff(a,b){return (Date.parse(b)-Date.parse(a))/86400000/365.2425}function xirr(flows,lastDate,lastValue){let ts=flows.map(x=>[yearsDiff(flows[0][0],x[0]),x[1]]);ts.push([yearsDiff(flows[0][0],lastDate),lastValue]);const f=r=>ts.reduce((s,[t,v])=>s+v/Math.pow(1+r,t),0);let low=-.999999,high=1;while(f(high)>0&&high<1e7)high=high*2+1;if(f(low)*f(high)>0)return NaN;for(let i=0;i<100;i++){let m=(low+high)/2;if(f(m)>0)low=m;else high=m}return (low+high)/2}
function simulate(rows,c,w=c.weights){
  let v=[0,0,0],flows=[],invested=0,unit=1,peak=1,mdd=0,rets=[],curve=[],prevMonth='';
  let accountPeak=0,accountMdd=0,contributionCount=0,rebalanceCount=0,tradingCosts=0,turnover=0;
  const baseMonth=Number(rows[0].date.slice(0,4))*12+Number(rows[0].date.slice(5,7));
  for(let i=0;i<rows.length;i++){
    const r=rows[i],month=r.date.slice(0,7),yr=Number(r.date.slice(0,4));
    if(i){
      const before=v.reduce((a,b)=>a+b,0),benchmarkGross=r.benchmarkGross??r.price/rows[i-1].price;
      const divRate=(earlyDividends[r.date.slice(0,4)]??0)*c.earlyDividend;
      const daily=benchmarkGross*Math.exp(Math.log1p(divRate)*(r.divFraction??0))-1;
      const levRet=modelReturn({...r,elapsed:r.elapsed??yearsDiff(rows[i-1].date,r.date),divFraction:r.divFraction??0},c,benchmarkGross);
      v[0]*=Math.max(0,1+daily);v[1]*=Math.max(0,1+levRet);
      const after=v.reduce((a,b)=>a+b,0),dr=before>0?after/before-1:0;
      unit*=1+dr;rets.push(dr);peak=Math.max(peak,unit);mdd=Math.min(mdd,unit/peak-1);
      if(accountPeak>0)accountMdd=Math.min(accountMdd,after/accountPeak-1);
    }
    const deposit=(i===0?c.initial:0)+(month!==prevMonth?c.monthly:0);
    if(deposit){
      const before=v.reduce((a,b)=>a+b,0);addMoney(v,deposit,w);
      const after=v.reduce((a,b)=>a+b,0),factor=after/(before+deposit);
      contributionCount++;tradingCosts+=Math.max(0,before+deposit-after);
      unit*=factor;peak=Math.max(peak,unit);mdd=Math.min(mdd,unit/peak-1);
      if(rets.length)rets[rets.length-1]=(1+rets.at(-1))*factor-1;
      flows.push([r.date,-deposit]);invested+=deposit;accountPeak=Math.max(accountPeak,after);
    }
    const monthN=yr*12+Number(r.date.slice(5,7)),total=v.reduce((a,b)=>a+b,0);
    const trigger=i>0&&total>0&&!(r.tradable===false&&w[0]>0)&&(
      (c.reb==='time'&&month!==prevMonth&&(monthN-baseMonth)%c.interval===0)||
      (c.reb==='ratio'&&v.some((x,k)=>Math.abs(x/total-w[k])>=c.threshold))||
      (c.reb==='exposure'&&Math.abs((v[0]+2*v[1])/total-(w[0]+2*w[1]))>=c.threshold));
    if(trigger){
      const beforeValues=[...v],before=total,next=allocate(v,w),after=next.reduce((a,b)=>a+b,0);
      const traded=next.reduce((sum,x,k)=>sum+Math.abs(x-beforeValues[k]),0);
      if(traded>.01){rebalanceCount++;turnover+=traded;tradingCosts+=Math.max(0,before-after)}
      v=next;const factor=after/before;unit*=factor;peak=Math.max(peak,unit);mdd=Math.min(mdd,unit/peak-1);
      if(rets.length)rets[rets.length-1]=(1+rets.at(-1))*factor-1;
      if(accountPeak>0)accountMdd=Math.min(accountMdd,after/accountPeak-1);
    }
    const assets=v.reduce((a,b)=>a+b,0);accountPeak=Math.max(accountPeak,assets);
    curve.push({date:r.date,value:unit,assets});prevMonth=month;
  }
  const end=v.reduce((a,b)=>a+b,0),duration=Math.max(yearsDiff(rows[0].date,rows.at(-1).date),1/365);
  const mean=rets.reduce((a,b)=>a+b,0)/(rets.length||1);
  const vol=Math.sqrt(rets.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,rets.length-1)*(rets.length/duration));
  return {end,invested,gain:end-invested,ret:invested?end/invested-1:NaN,annual:flows.length?xirr(flows,rows.at(-1).date,end):NaN,
    twrAnnual:unit**(1/duration)-1,vol,mdd,accountMdd,curve,contributionCount,rebalanceCount,tradingCosts,turnover};
}
function fmt(x){return Number.isFinite(x)?(x*100).toFixed(2)+'%':'—'}function money(x){return Math.round(x).toLocaleString('zh-TW')+' 元'}function metric(label,value){return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`}
let chartState=null,chartScale='log';
function displayChart(curves,names,life=false){chartState={curves,names,life};$('chartTitle').textContent=life?'策略淨值分布走勢':'資產淨值走勢';$('legend').innerHTML=names.map((name,i)=>`<span><i style="background:${['#2466ba','#0ba48a','#e2a943'][i]}"></i>${name}</span>`).join('')+'<span>初始淨值 100・已排除後續入金</span>';$('chart').style.display='block';renderChart()}
function renderChart(){if(!chartState)return;const {curves,life}=chartState,canvas=$('chart'),ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1;const cw=canvas.clientWidth,ch=canvas.clientHeight;if(!cw||!ch)return;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);const pad={l:62,r:16,t:14,b:34},pw=cw-pad.l-pad.r,ph=ch-pad.t-pad.b;let vals=curves.flatMap(c=>c.map(x=>x.value*100)).filter(x=>Number.isFinite(x)&&x>0);if(!vals.length)return;let isLog=chartScale==='log';let trans=x=>isLog?Math.log10(Math.max(x,1e-12)):x;let lower=isLog?Math.floor(Math.log10(Math.min(...vals))):0,upper=isLog?Math.ceil(Math.log10(Math.max(...vals))):Math.max(...vals)*1.05;if(upper<=lower)upper=lower+1;ctx.font='12px system-ui';ctx.textBaseline='middle';ctx.textAlign='right';for(let i=0;i<=4;i++){let v=lower+(upper-lower)*i/4,y=pad.t+ph-ph*i/4;ctx.strokeStyle='#e5ebf3';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(cw-pad.r,y);ctx.stroke();let actual=isLog?10**v:v;ctx.fillStyle='#71819a';ctx.fillText(actual>=10000?(actual/1000).toFixed(0)+'k':actual>=10?actual.toFixed(0):actual.toFixed(2),pad.l-8,y)}ctx.textAlign='center';ctx.textBaseline='top';let c0=curves[0];for(let i=0;i<=4;i++){let idx=Math.round((c0.length-1)*i/4),x=pad.l+pw*i/4;let label=life?`第 ${Math.round(idx/(c0.length-1)*Number($('years').value))} 年`:c0[idx].date.slice(0,4);ctx.fillText(label,x,ch-pad.b+10)}for(let k=0;k<curves.length;k++){let c=curves[k];ctx.beginPath();ctx.strokeStyle=['#2466ba','#0ba48a','#e2a943'][k];ctx.lineWidth=2;let step=Math.max(1,Math.floor(c.length/(pw*2)));for(let j=0;j<c.length;j+=step){let x=pad.l+pw*j/Math.max(1,c.length-1),y=pad.t+ph-(trans(c[j].value*100)-lower)/(upper-lower)*ph;j?ctx.lineTo(x,y):ctx.moveTo(x,y)}if((c.length-1)%step){let pt=c.at(-1);ctx.lineTo(cw-pad.r,pad.t+ph-(trans(pt.value*100)-lower)/(upper-lower)*ph)}ctx.stroke()}$('linearScale').className=isLog?'alt':'';$('logScale').className=isLog?'':'alt'}
$('linearScale').onclick=()=>{chartScale='linear';renderChart()};$('logScale').onclick=()=>{chartScale='log';renderChart()};$('chart').addEventListener('pointermove',e=>{if(!chartState)return;let rect=$('chart').getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(e.clientX-rect.left-62)/(rect.width-78))),first=chartState.curves[0],i=Math.round(fraction*(first.length-1)),date=chartState.life?`第 ${(fraction*Number($('years').value)).toFixed(1)} 年`:first[i].date;$('chartTip').innerHTML=[date,...chartState.curves.map((c,k)=>`${chartState.names[k]}：${(c[Math.round(fraction*(c.length-1))].value*100).toLocaleString('zh-TW',{maximumFractionDigits:2})}`)].join('<br>');$('chartTip').classList.remove('hidden')});$('chart').addEventListener('pointerleave',()=>$('chartTip').classList.add('hidden'));window.addEventListener('resize',()=>{if(!$('result').classList.contains('hidden'))renderChart()});
function sampleAt(curve,fraction){let start=Date.parse(curve[0].date), end=Date.parse(curve.at(-1).date), target=start+fraction*(end-start),lo=0,hi=curve.length-1;while(lo<hi){let mid=(lo+hi+1)>>1;if(Date.parse(curve[mid].date)<=target)lo=mid;else hi=mid-1}return curve[lo].value}
function quantile(arr,q){let a=[...arr].sort((a,b)=>a-b),p=(a.length-1)*q,l=Math.floor(p);return a[l]+(a[Math.ceil(p)]-a[l])*(p-l)}
let runCount=0,lastRunSignature='';
function rebalanceLabel(c){if(c.reb==='none')return '不再平衡';if(c.reb==='time')return `每 ${c.interval} 個月`;return `${c.reb==='ratio'?'比例':'曝險'}偏離 ${fmt(c.threshold)}`}
function markDirty(){if(!$('result').classList.contains('hidden')){$('result').classList.add('stale');$('details').classList.add('stale');$('message').textContent='設定已變更，按「重新計算」套用。'}$('run').textContent='重新計算'}
document.querySelectorAll('input,select').forEach(el=>{if(el.id!=='file'){el.addEventListener('input',markDirty);el.addEventListener('change',markDirty)}});
function run(){try{if(!data.length)throw Error('請先匯入含息每日資料。');const c=inputs();let rows=data.filter(x=>x.date>=c.start&&x.date<=c.end);if(rows.length<3)throw Error('所選日期範圍內的交易資料不足。');$('result').classList.remove('hidden');$('details').classList.remove('hidden');if(page==='back'){let a=simulate(rows,c),b=simulate(rows,c,[1,0,0]);runCount++;const signature=JSON.stringify(c),changed=signature!==lastRunSignature;lastRunSignature=signature;$('run').textContent='重新計算';$('result').classList.remove('stale');$('details').classList.remove('stale');$('range').textContent=rows[0].date+' 至 '+rows.at(-1).date;$('message').textContent=`第 ${runCount} 次計算・${changed?'已套用目前設定':'設定未變，結果已重新驗證'}｜投入 ${a.contributionCount} 次｜實際再平衡 ${a.rebalanceCount} 次｜${rebalanceLabel(c)}`;$('metrics').innerHTML=metric('期末資產',money(a.end))+metric('累計投入',money(a.invested))+metric('期間報酬（損益／投入）',fmt(a.ret))+metric('資金加權年化（XIRR）',fmt(a.annual))+metric('策略年化波動率',fmt(a.vol))+metric('策略最大回撤',fmt(a.mdd))+($('dca').checked?metric('帳戶最大回撤（含入金）',fmt(a.accountMdd)):'');$('metricNote').textContent=$('dca').checked?'XIRR 與帳戶回撤包含每月投入；策略波動與策略回撤排除入金，避免把存款當成報酬。':'波動率與最大回撤依策略淨值計算，已扣除交易費用。';$('comparison').innerHTML=`<table><tr><th>指標</th><th>所選策略</th><th>0050／大盤</th></tr>${[['期末資產',money(a.end),money(b.end)],['累計投入',money(a.invested),money(b.invested)],['期間報酬',fmt(a.ret),fmt(b.ret)],['資金加權年化',fmt(a.annual),fmt(b.annual)],['策略年化報酬',fmt(a.twrAnnual),fmt(b.twrAnnual)],['策略年化波動率',fmt(a.vol),fmt(b.vol)],['策略最大回撤',fmt(a.mdd),fmt(b.mdd)],['帳戶最大回撤',fmt(a.accountMdd),fmt(b.accountMdd)],['投入次數',String(a.contributionCount),String(b.contributionCount)],['實際再平衡次數',String(a.rebalanceCount),String(b.rebalanceCount)],['交易成本',money(a.tradingCosts),money(b.tradingCosts)]].map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')}</table>`;displayChart([a.curve,b.curve],['所選策略','0050／大盤']);}else{let years=Math.floor(num('years'));if(years<1||years>70)throw Error('投資年數須為 1～70 年。');let paths=[];if($('lifeMode').value==='historical'){for(let i=0;i<rows.length;i++){let target=new Date(rows[i].date+'T00:00:00Z');target.setUTCFullYear(target.getUTCFullYear()+years);let end=target.toISOString().slice(0,10);if(end>rows.at(-1).date)break;let j=i+1;while(j<rows.length&&rows[j].date<end)j++;if(j<rows.length)paths.push(rows.slice(i,j+1))}if(paths.length>1000)paths=paths.filter((_,i)=>i%Math.ceil(paths.length/1000)===0)}else{let grouped={};for(let i=1;i<rows.length;i++){let year=rows[i].date.slice(0,4);(grouped[year]??=[]).push({...rows[i],benchmarkGross:rows[i].benchmarkGross??rows[i].price/rows[i-1].price,elapsed:rows[i].elapsed??yearsDiff(rows[i-1].date,rows[i].date),divFraction:rows[i].divFraction??0})}let keys=Object.keys(grouped).filter(y=>grouped[y].length>=200&&y!==rows[0].date.slice(0,4)&&y!==rows.at(-1).date.slice(0,4));if(!keys.length)throw Error('完整年度日資料不足，無法重組。');let n=Math.min(2000,Math.max(100,Math.floor(num('runs'))));for(let r=0;r<n;r++){let synthetic=[{date:'1999-12-31',price:1}];for(let y=0;y<years;y++){let key=keys[Math.floor(Math.random()*keys.length)];for(const item of grouped[key]){let date=String(2000+y)+item.date.slice(4);if(date.endsWith('02-29')&&new Date(date+'T00:00:00Z').getUTCMonth()!==1){date=String(2000+y)+'-02-28'}synthetic.push({...item,date})}}paths.push(synthetic)}}if(!paths.length)throw Error('所選資料不足以組成完整投資年數。');let results=paths.map(p=>{let a=simulate(p,c),b=simulate(p,c,[1,0,0]);return {a,b}});runCount++;const signature=JSON.stringify({page,c,years,lifeMode:$('lifeMode').value,runs:num('runs')}),changed=signature!==lastRunSignature;lastRunSignature=signature;$('run').textContent='重新計算';$('result').classList.remove('stale');$('details').classList.remove('stale');$('message').textContent=`第 ${runCount} 次計算・${changed?'已套用目前設定':'設定未變，結果已重新驗證'}｜每條路徑皆依目前投入與再平衡設定重跑`;$('metricNote').textContent='虧損與勝率依各路徑的實際現金流、交易費用及再平衡結果計算。';let ends=results.map(x=>x.a.end),loss=results.filter(x=>x.a.end<x.a.invested).length/results.length,win=results.filter(x=>x.a.end>x.b.end).length/results.length;$('range').textContent=`${years} 年・${results.length} 組`;$('metrics').innerHTML=metric('期末資產中位數',money(quantile(ends,.5)))+metric('虧損比例',fmt(loss))+metric('贏過對照組比例',fmt(win))+metric('第 10 百分位',money(quantile(ends,.1)))+metric('第 90 百分位',money(quantile(ends,.9)))+metric('投入本金',money(results[0].a.invested));$('comparison').innerHTML='<p class="hint">比較組使用相同投入時間與金額，全部投資 0050／大盤。歷史區間可能重疊；重組路徑不是連續歷史。</p>';let quantiles=[.1,.5,.9].map(q=>Array.from({length:81},(_,i)=>({date:String(i),value:quantile(results.map(x=>sampleAt(x.a.curve,i/80)),q)})));displayChart(quantiles,['第 10 百分位','中位數','第 90 百分位'],true);return}$('chart').style.display='block'}catch(e){$('message').textContent=e.message;$('result').classList.add('hidden');$('details').classList.add('hidden');$('run').textContent='重新計算'}}$('run').onclick=run;
