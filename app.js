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
function daysInMonth(year,month){return new Date(Number(year),Number(month),0).getDate()}
function optionList(from,to,suffix){let html='';for(let n=from;n<=to;n++)html+=`<option value="${String(n).padStart(suffix==='年'?4:2,'0')}">${n}${suffix}</option>`;return html}
function syncDatePicker(prefix){
  const year=$(prefix+'Year').value,month=$(prefix+'Month').value,day=$(prefix+'Day');
  const keep=Math.min(Number(day.value)||1,daysInMonth(year,month));
  day.innerHTML=optionList(1,daysInMonth(year,month),'日');day.value=String(keep).padStart(2,'0');
  $(prefix).value=`${year}-${month}-${day.value}`;
}
function setupDatePickers(){
  const firstYear=Number(data[0].date.slice(0,4)),lastYear=Number(data.at(-1).date.slice(0,4));
  for(const prefix of ['start','end']){
    const value=$(prefix).value||data[prefix==='start'?0:data.length-1].date,[year,month,day]=value.split('-');
    $(prefix+'Year').innerHTML=optionList(firstYear,lastYear,'年');$(prefix+'Month').innerHTML=optionList(1,12,'月');
    $(prefix+'Year').value=year;$(prefix+'Month').value=month;$(prefix+'Day').innerHTML=optionList(1,daysInMonth(year,month),'日');$(prefix+'Day').value=day;
    for(const part of ['Year','Month','Day'])$(prefix+part).onchange=()=>syncDatePicker(prefix);
    syncDatePicker(prefix);
  }
}
setupDatePickers();
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
$('dca').onchange=()=>$('dcaWrap').classList.toggle('hidden',!$('dca').checked);$('reb').onchange=()=>{$('timeFields').classList.toggle('hidden',$('reb').value!=='time');$('thresholdField').classList.toggle('hidden',$('reb').value!=='ratio')};$('reb').onchange();$('mode').onchange=()=>$('fixedField').classList.toggle('hidden',$('mode').value!=='fixed');$('lifeMode').onchange=()=>$('runsWrap').classList.toggle('hidden',$('lifeMode').value!=='bootstrap');
function tab(p){page=p;$('tabBack').className=p==='back'?'active':'alt';$('tabLife').className=p==='life'?'active':'alt';$('lifeSettings').classList.toggle('hidden',p!=='life');$('lifeCharts').classList.add('hidden');if(p!=='life')$('lifeProgressWrap').classList.add('hidden');$('resultTitle').textContent=p==='back'?'歷史回測結果':'人生模擬結果';$('result').classList.add('hidden');$('details').classList.add('hidden');$('message').textContent='選好設定，按計算。'}$('tabBack').onclick=()=>tab('back');$('tabLife').onclick=()=>tab('life');
$('file').onchange=async e=>{try{let text=(await e.target.files[0].text()).replace(/^\ufeff/,'');let lines=text.trim().split(/\r?\n/);let h=lines.shift().split(',').map(v=>v.trim().toLowerCase().replaceAll('"',''));let di=h.findIndex(v=>['date','日期'].includes(v)),pi=h.findIndex(v=>['total_return','adj close','adj_close','adjusted_close','含息指數','還原收盤價'].includes(v));if(di<0||pi<0)throw Error('缺少 date 或 total_return 欄位。');data=lines.map(line=>{let c=line.split(',');return {date:c[di]?.replaceAll('"','').trim(),price:Number(c[pi]?.replaceAll('"','').trim())}}).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)&&x.price>0).sort((a,b)=>a.date.localeCompare(b.date));if(data.length<3)throw Error('能用的資料不到 3 筆。');for(let i=1;i<data.length;i++)if(data[i].date===data[i-1].date)throw Error('日期重複：'+data[i].date);$('start').value=data[0].date;$('end').value=data.at(-1).date;setupDatePickers();$('dataStatus').textContent=`匯入完成：${data.length.toLocaleString()} 筆｜${data[0].date}～${data.at(-1).date}`;}catch(err){data=[];$('dataStatus').textContent='讀不了：'+err.message}};
function inputs(){const weights=[num('stock')/100,num('lev')/100,num('cash')/100],start=$('start').value,end=$('end').value;if(weights.some(x=>!Number.isFinite(x)||x<0)||Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-8)throw Error('0050、正二、現金加起來要等於 100%。');if(num('initial')<0||($('dca').checked&&num('monthly')<0)||(!num('initial')&&!($('dca').checked&&num('monthly')>0)))throw Error('投入金額不對。');if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw Error('日期不對。開始日不能晚於結束日。');if(num('interval')<1||num('threshold')<=0)throw Error('再平衡間隔和門檻要大於 0。');if(num('earlyDividend')<0||num('earlyDividend')>3||num('fixed')<=-100||num('collateral')<-20||num('collateral')>20)throw Error('舊股息、期貨差額或利率設定超出範圍。');return {weights,start,end,initial:num('initial'),monthly:$('dca').checked?num('monthly'):0,reb:$('reb').value,interval:Math.floor(num('interval'))*num('unit'),threshold:num('threshold')/100,mode:$('mode').value,fixed:num('fixed'),earlyDividend:num('earlyDividend'),collateral:num('collateral')/100};}
function allocate(v,w){let lo=0,hi=v.reduce((a,b)=>a+b,0);for(let j=0;j<55;j++){let m=(lo+hi)/2;let cost=0;for(let k=0;k<2;k++){let diff=m*w[k]-v[k];cost+=diff>=0?diff*fee:-diff*(fee+tax)}let total=v[0]+v[1]+v[2];if(m+cost>total)hi=m;else lo=m}return w.map(x=>x*lo)}
function addMoney(v,amount,w){let net=amount/(1+fee*(w[0]+w[1]));for(let k=0;k<3;k++)v[k]+=net*w[k]}
function yearsDiff(a,b){return (Date.parse(b)-Date.parse(a))/86400000/365.2425}function xirr(flows,lastDate,lastValue){let ts=flows.map(x=>[yearsDiff(flows[0][0],x[0]),x[1]]);ts.push([yearsDiff(flows[0][0],lastDate),lastValue]);const f=r=>ts.reduce((s,[t,v])=>s+v/Math.pow(1+r,t),0);let low=-.999999,high=1;while(f(high)>0&&high<1e7)high=high*2+1;if(f(low)*f(high)>0)return NaN;for(let i=0;i<100;i++){let m=(low+high)/2;if(f(m)>0)low=m;else high=m}return (low+high)/2}
function simulate(rows,c,w=c.weights,detail='full'){
  const full=detail==='full',keepCurve=detail!=='end';
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
      unit*=1+dr;
      if(full){rets.push(dr);peak=Math.max(peak,unit);mdd=Math.min(mdd,unit/peak-1);if(accountPeak>0)accountMdd=Math.min(accountMdd,after/accountPeak-1)}
    }
    const deposit=(i===0?c.initial:0)+(month!==prevMonth?c.monthly:0);
    if(deposit){
      const before=v.reduce((a,b)=>a+b,0);addMoney(v,deposit,w);
      const after=v.reduce((a,b)=>a+b,0),factor=after/(before+deposit);
      contributionCount++;tradingCosts+=Math.max(0,before+deposit-after);unit*=factor;
      if(full){peak=Math.max(peak,unit);mdd=Math.min(mdd,unit/peak-1);if(rets.length)rets[rets.length-1]=(1+rets.at(-1))*factor-1;flows.push([r.date,-deposit]);accountPeak=Math.max(accountPeak,after)}
      invested+=deposit;
    }
    const monthN=yr*12+Number(r.date.slice(5,7)),total=v.reduce((a,b)=>a+b,0);
    const trigger=i>0&&total>0&&!(r.tradable===false&&w[0]>0)&&(
      (c.reb==='time'&&month!==prevMonth&&(monthN-baseMonth)%c.interval===0)||
      (c.reb==='ratio'&&v.some((x,k)=>Math.abs(x/total-w[k])>=c.threshold)));
    if(trigger){
      const beforeValues=[...v],before=total,next=allocate(v,w),after=next.reduce((a,b)=>a+b,0);
      const traded=next.reduce((sum,x,k)=>sum+Math.abs(x-beforeValues[k]),0);
      if(traded>.01){rebalanceCount++;turnover+=traded;tradingCosts+=Math.max(0,before-after)}
      v=next;const factor=after/before;unit*=factor;
      if(full){peak=Math.max(peak,unit);mdd=Math.min(mdd,unit/peak-1);if(rets.length)rets[rets.length-1]=(1+rets.at(-1))*factor-1;if(accountPeak>0)accountMdd=Math.min(accountMdd,after/accountPeak-1)}
    }
    const assets=v.reduce((a,b)=>a+b,0);if(full)accountPeak=Math.max(accountPeak,assets);
    if(keepCurve)curve.push({date:r.date,value:unit,assets,invested});prevMonth=month;
  }
  const end=v.reduce((a,b)=>a+b,0),duration=Math.max(yearsDiff(rows[0].date,rows.at(-1).date),1/365);
  if(!full)return {end,invested,curve};
  const mean=rets.reduce((a,b)=>a+b,0)/(rets.length||1);
  const vol=Math.sqrt(rets.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,rets.length-1)*(rets.length/duration));
  return {end,invested,gain:end-invested,ret:invested?end/invested-1:NaN,annual:flows.length?xirr(flows,rows.at(-1).date,end):NaN,
    twrAnnual:unit**(1/duration)-1,vol,mdd,accountMdd,curve,contributionCount,rebalanceCount,tradingCosts,turnover};
}
function fmt(x){return Number.isFinite(x)?(x*100).toFixed(2)+'%':'—'}function money(x){return Math.round(x).toLocaleString('zh-TW')+' 元'}function metric(label,value){return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`}
let chartState=null,chartScale='log',lifeVisualState=null;const chartGrid=()=>document.documentElement.dataset.theme==='dark'?'#2b3b50':'#e5ebf3',chartText=()=>document.documentElement.dataset.theme==='dark'?'#aebed3':'#71819a';
function displayChart(curves,names,life=false){chartState={curves,names,life,fan:false};$('chartTitle').textContent=life?'各種結果會怎麼走':'資產走勢';$('legend').innerHTML=names.map((name,i)=>`<span><i style="background:${['#2466ba','#0ba48a','#e2a943'][i]}"></i>${name}</span>`).join('')+'<span>曲線從 100 開始，不把後續加碼當成報酬</span>';$('chart').style.display='block';renderChart()}
function displayLifeFan(curves){chartState={curves,names:['P10','P25','中位數','P75','P90'],life:true,fan:true};$('chartTitle').textContent='資產路徑範圍';$('legend').innerHTML='<span><i style="background:#d8e8fb;height:10px"></i>中間 80%</span><span><i style="background:#9fc3ef;height:10px"></i>中間 50%</span><span><i style="background:#174f91"></i>中位數</span><span>曲線從 100 開始，不把後續加碼當成報酬</span>';renderChart()}
function renderChart(){
  if(!chartState)return;
  const {curves,life,fan}=chartState,canvas=$('chart'),ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,cw=canvas.clientWidth,ch=canvas.clientHeight;
  if(!cw||!ch)return;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);
  const pad={l:62,r:16,t:14,b:34},pw=cw-pad.l-pad.r,ph=ch-pad.t-pad.b,vals=curves.flatMap(c=>c.map(x=>x.value*100)).filter(x=>Number.isFinite(x)&&x>0);if(!vals.length)return;
  const isLog=chartScale==='log',trans=x=>isLog?Math.log10(Math.max(x,1e-12)):x;
  let lower=isLog?Math.floor(Math.log10(Math.min(...vals))):0,upper=isLog?Math.ceil(Math.log10(Math.max(...vals))):Math.max(...vals)*1.05;if(upper<=lower)upper=lower+1;
  const yFor=value=>pad.t+ph-(trans(value*100)-lower)/(upper-lower)*ph,xFor=(i,c)=>pad.l+pw*i/Math.max(1,c.length-1);
  ctx.font='12px system-ui';ctx.textBaseline='middle';ctx.textAlign='right';
  for(let i=0;i<=4;i++){const v=lower+(upper-lower)*i/4,y=pad.t+ph-ph*i/4;ctx.strokeStyle=chartGrid();ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(cw-pad.r,y);ctx.stroke();const actual=isLog?10**v:v;ctx.fillStyle=chartText();ctx.fillText(actual>=10000?(actual/1000).toFixed(0)+'k':actual>=10?actual.toFixed(0):actual.toFixed(2),pad.l-8,y)}
  ctx.textAlign='center';ctx.textBaseline='top';const c0=curves[0];for(let i=0;i<=4;i++){const idx=Math.round((c0.length-1)*i/4),x=pad.l+pw*i/4,label=life?`第 ${Math.round(idx/(c0.length-1)*Number($('years').value))} 年`:c0[idx].date.slice(0,4);ctx.fillStyle=chartText();ctx.fillText(label,x,ch-pad.b+10)}
  const drawLine=(c,color,width=2)=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;c.forEach((p,i)=>{const x=xFor(i,c),y=yFor(p.value);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()};
  const fillBand=(low,high,color)=>{ctx.beginPath();high.forEach((p,i)=>{const x=xFor(i,high),y=yFor(p.value);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});for(let i=low.length-1;i>=0;i--)ctx.lineTo(xFor(i,low),yFor(low[i].value));ctx.closePath();ctx.fillStyle=color;ctx.fill()};
  if(fan){fillBand(curves[0],curves[4],'#d8e8fb');fillBand(curves[1],curves[3],'#9fc3ef');drawLine(curves[0],'#8eb5e2',1);drawLine(curves[4],'#8eb5e2',1);drawLine(curves[2],'#174f91',2.5)}else curves.forEach((c,k)=>drawLine(c,['#2466ba','#0ba48a','#e2a943'][k]||'#7c8ca4'));
  $('linearScale').className=isLog?'alt':'';$('logScale').className=isLog?'':'alt';
}
$('linearScale').onclick=()=>{chartScale='linear';renderChart()};$('logScale').onclick=()=>{chartScale='log';renderChart()};$('chart').addEventListener('pointermove',e=>{if(!chartState)return;const rect=$('chart').getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(e.clientX-rect.left-62)/(rect.width-78))),first=chartState.curves[0],date=chartState.life?`第 ${(fraction*Number($('years').value)).toFixed(1)} 年`:first[Math.round(fraction*(first.length-1))].date;$('chartTip').innerHTML=[date,...chartState.curves.map((c,k)=>`${chartState.names[k]}：${(c[Math.round(fraction*(c.length-1))].value*100).toLocaleString('zh-TW',{maximumFractionDigits:2})}`)].join('<br>');$('chartTip').classList.remove('hidden')});$('chart').addEventListener('pointerleave',()=>$('chartTip').classList.add('hidden'));
function setupMiniCanvas(id){const canvas=$(id),ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,cw=canvas.clientWidth,ch=canvas.clientHeight;if(!cw||!ch)return null;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);return {canvas,ctx,cw,ch}}
function shortMoney(x){return new Intl.NumberFormat('zh-TW',{notation:'compact',maximumFractionDigits:1}).format(x)}
function drawHistogram(id,series,{log=false,marker=null,percentAxis=false}={}){
  const base=setupMiniCanvas(id);if(!base)return;const {ctx,cw,ch}=base,pad={l:44,r:12,t:10,b:30},pw=cw-pad.l-pad.r,ph=ch-pad.t-pad.b,convert=x=>log?Math.log10(Math.max(1,x)):x;
  let all=series.flatMap(s=>s.values.map(convert)).filter(Number.isFinite);if(Number.isFinite(marker))all.push(convert(marker));if(!all.length)return;let min=Math.min(...all),max=Math.max(...all);if(min===max){min-=.5;max+=.5}const bins=Math.max(14,Math.min(28,Math.floor(pw/18))),sets=series.map(s=>{const counts=Array(bins).fill(0);s.values.forEach(value=>{let i=Math.floor((convert(value)-min)/(max-min)*bins);i=Math.max(0,Math.min(bins-1,i));counts[i]++});return {...s,counts:counts.map(x=>x/Math.max(1,s.values.length))}}),top=Math.max(.01,...sets.flatMap(s=>s.counts))*1.12;
  ctx.font='11px system-ui';ctx.textBaseline='middle';ctx.textAlign='right';for(let i=0;i<=4;i++){const value=top*i/4,y=pad.t+ph-ph*i/4;ctx.strokeStyle=chartGrid();ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(cw-pad.r,y);ctx.stroke();ctx.fillStyle=chartText();ctx.fillText((value*100).toFixed(0)+'%',pad.l-6,y)}
  sets.forEach(s=>{ctx.fillStyle=s.color;ctx.globalAlpha=.5;s.counts.forEach((count,i)=>{const x=pad.l+pw*i/bins,y=pad.t+ph-count/top*ph;ctx.fillRect(x+1,y,Math.max(1,pw/bins-2),pad.t+ph-y)})});ctx.globalAlpha=1;
  if(Number.isFinite(marker)){const x=pad.l+(convert(marker)-min)/(max-min)*pw;ctx.strokeStyle='#d14b4b';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+ph);ctx.stroke();ctx.setLineDash([])}
  ctx.textAlign='center';ctx.textBaseline='top';for(let i=0;i<=3;i++){const value=min+(max-min)*i/3,x=pad.l+pw*i/3,label=log?shortMoney(10**value):percentAxis?(value*100).toFixed(0)+'%':value.toFixed(1);ctx.fillStyle=chartText();ctx.fillText(label,x,ch-pad.b+8)}
}
function drawRiskChart(points){const base=setupMiniCanvas('riskChart');if(!base||!points.length)return;const {ctx,cw,ch}=base,pad={l:44,r:12,t:10,b:30},pw=cw-pad.l-pad.r,ph=ch-pad.t-pad.b,xFor=year=>pad.l+(year-1)/Math.max(1,points.at(-1).year-1)*pw,yFor=value=>pad.t+ph-value*ph;ctx.font='11px system-ui';ctx.textBaseline='middle';ctx.textAlign='right';for(let i=0;i<=4;i++){const value=i/4,y=yFor(value);ctx.strokeStyle=chartGrid();ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(cw-pad.r,y);ctx.stroke();ctx.fillStyle=chartText();ctx.fillText(value*100+'%',pad.l-6,y)}ctx.textAlign='center';ctx.textBaseline='top';for(let i=0;i<=4;i++){const year=Math.max(1,Math.round(1+(points.at(-1).year-1)*i/4)),x=xFor(year);ctx.fillText(`第 ${year} 年`,x,ch-pad.b+8)}for(const [key,color] of [['loss','#d14b4b'],['win','#2466ba']]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.5;points.forEach((p,i)=>{const x=xFor(p.year),y=yFor(p[key]);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}}
function renderLifeVisuals(){if(!lifeVisualState)return;const s=lifeVisualState;drawHistogram('terminalChart',[{values:s.ends,color:'#2466ba'},{values:s.benchmarkEnds,color:'#0ba48a'}],{log:true,marker:s.invested});drawRiskChart(s.riskPoints);drawHistogram('drawdownChart',[{values:s.drawdowns,color:'#2466ba'},{values:s.benchmarkDrawdowns,color:'#0ba48a'}],{percentAxis:true})}
window.addEventListener('resize',()=>{if(!$('result').classList.contains('hidden')){renderChart();renderLifeVisuals()}});
function pointAt(curve,fraction,isLife){if(isLife)return curve[Math.min(curve.length-1,Math.round(fraction*(curve.length-1)))];const start=Date.parse(curve[0].date),end=Date.parse(curve.at(-1).date),target=start+fraction*(end-start);let lo=0,hi=curve.length-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(Date.parse(curve[mid].date)<=target)lo=mid;else hi=mid-1}return curve[lo]}
function compressCurve(curve,isLife,steps=80){return Array.from({length:steps+1},(_,i)=>{const p=pointAt(curve,i/steps,isLife);return {date:String(i),value:p.value,assets:p.assets,invested:p.invested}})}
function summarizeHorizons(curve,years,isLife){return Array.from({length:years},(_,i)=>{const p=pointAt(curve,(i+1)/years,isLife);return {year:i+1,value:p.value,assets:p.assets,invested:p.invested}})}
function curveDrawdown(curve){let peak=0,mdd=0;for(const p of curve){peak=Math.max(peak,p.value);if(peak>0)mdd=Math.min(mdd,p.value/peak-1)}return mdd}
function quantile(arr,q){let a=[...arr].sort((a,b)=>a-b),p=(a.length-1)*q,l=Math.floor(p);return a[l]+(a[Math.ceil(p)]-a[l])*(p-l)}
function prepareLifeYears(rows,c){
  const grouped={};
  for(let i=1;i<rows.length;i++){
    const r=rows[i],benchmarkGross=r.benchmarkGross??r.price/rows[i-1].price,divRate=(earlyDividends[r.date.slice(0,4)]??0)*c.earlyDividend;
    const stockGross=benchmarkGross*Math.exp(Math.log1p(divRate)*(r.divFraction??0));
    const levGross=1+modelReturn({...r,elapsed:r.elapsed??yearsDiff(rows[i-1].date,r.date),divFraction:r.divFraction??0},c,benchmarkGross);
    (grouped[r.date.slice(0,4)]??=[]).push({stockGross:Math.max(0,stockGross),levGross:Math.max(0,levGross),month:Number(r.date.slice(5,7)),tradable:r.tradable});
  }
  return grouped;
}
function simulateLifeYears(yearKeys,grouped,c,w=c.weights,keepCurve=true){
  let v=[0,0,0],invested=0,unit=1,prevMonth=0,day=0,curve=[];
  const first=c.initial+c.monthly;if(first){addMoney(v,first,w);invested+=first;unit=v.reduce((a,b)=>a+b,0)/first}
  if(keepCurve)curve.push({date:'0',value:unit,assets:v.reduce((a,b)=>a+b,0),invested});
  for(let y=0;y<yearKeys.length;y++)for(const r of grouped[yearKeys[y]]){
    const before=v.reduce((a,b)=>a+b,0);v[0]*=r.stockGross;v[1]*=r.levGross;let total=v.reduce((a,b)=>a+b,0);if(before>0)unit*=total/before;
    const monthN=y*12+r.month-1,monthChanged=monthN!==prevMonth;
    if(monthChanged&&c.monthly){const old=total;addMoney(v,c.monthly,w);total=v.reduce((a,b)=>a+b,0);unit*=total/(old+c.monthly);invested+=c.monthly}
    const trigger=day>0&&total>0&&!(r.tradable===false&&w[0]>0)&&((c.reb==='time'&&monthChanged&&(monthN+1)%c.interval===0)||(c.reb==='ratio'&&v.some((x,k)=>Math.abs(x/total-w[k])>=c.threshold)));
    if(trigger){const old=total;v=allocate(v,w);total=v.reduce((a,b)=>a+b,0);unit*=total/old}
    if(keepCurve)curve.push({date:String(++day),value:unit,assets:total,invested});else day++;
    prevMonth=monthN;
  }
  return {end:v.reduce((a,b)=>a+b,0),invested,curve};
}
let runCount=0,lastRunSignature='';
function rebalanceLabel(c){if(c.reb==='none')return '不再平衡';if(c.reb==='time')return `每 ${c.interval} 個月`;return `比例偏離 ${fmt(c.threshold)}`}
function markDirty(){if(!$('result').classList.contains('hidden')){$('result').classList.add('stale');$('details').classList.add('stale');$('message').textContent='設定改了。按「重新計算」。'}$('run').textContent='重新計算'}
document.querySelectorAll('input,select').forEach(el=>{if(el.id!=='file'){el.addEventListener('input',markDirty);el.addEventListener('change',markDirty)}});
function setLifeProgress(percent,text){
  const value=Math.max(0,Math.min(100,Math.round(percent)));
  $('lifeProgressWrap').classList.remove('hidden');$('lifeProgressText').textContent=text;$('lifeProgressPct').textContent=value+'%';$('lifeProgressBar').style.width=value+'%';
}
function yieldUi(){return new Promise(resolve=>{if(typeof MessageChannel==='function'){const channel=new MessageChannel();channel.port1.onmessage=()=>resolve();channel.port2.postMessage(0)}else resolve()})}
function lowerBoundDate(rows,date,from=0){let lo=from,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].date<date)lo=mid+1;else hi=mid}return lo}
async function run(){
  try{
    if(!data.length)throw Error('沒有資料。先匯入每日含息資料。');
    const c=inputs();let rows=data.filter(x=>x.date>=c.start&&x.date<=c.end);
    if(rows.length<3)throw Error('這段日期資料太少，算不了。');
    $('result').classList.remove('hidden');$('details').classList.remove('hidden');
    if(page==='back'){
      $('lifeProgressWrap').classList.add('hidden');
      $('lifeCharts').classList.add('hidden');lifeVisualState=null;
      const a=simulate(rows,c),b=simulate(rows,c,[1,0,0]);runCount++;
      const signature=JSON.stringify(c),changed=signature!==lastRunSignature;lastRunSignature=signature;
      $('run').textContent='重新計算';$('result').classList.remove('stale');$('details').classList.remove('stale');
      $('range').textContent=rows[0].date+' 至 '+rows.at(-1).date;
      $('message').textContent=`算完了（第 ${runCount} 次）｜${changed?'已用新設定':'設定沒變，重算結果相同'}｜投入 ${a.contributionCount} 次｜再平衡 ${a.rebalanceCount} 次｜${rebalanceLabel(c)}`;
      $('metrics').innerHTML=metric('最後有多少',money(a.end))+metric('總共投入',money(a.invested))+metric('總報酬',fmt(a.ret))+metric('你的年化（XIRR）',fmt(a.annual))+metric('年化波動',fmt(a.vol))+metric('最大回撤',fmt(a.mdd))+($('dca').checked?metric('帳戶回撤（有算入金）',fmt(a.accountMdd)):'');
      $('metricNote').textContent=$('dca').checked?'你的年化有算每次加碼時間。波動和最大回撤不把存款當報酬；帳戶回撤則把入金後的帳戶金額算進去。':'波動和回撤已扣交易費。';
      $('comparison').innerHTML=`<table><tr><th>看什麼</th><th>你的設定</th><th>全買 0050／大盤</th></tr>${[['最後有多少',money(a.end),money(b.end)],['總共投入',money(a.invested),money(b.invested)],['總報酬',fmt(a.ret),fmt(b.ret)],['你的年化（XIRR）',fmt(a.annual),fmt(b.annual)],['策略本身年化（不算加碼）',fmt(a.twrAnnual),fmt(b.twrAnnual)],['年化波動',fmt(a.vol),fmt(b.vol)],['最大回撤',fmt(a.mdd),fmt(b.mdd)],['帳戶回撤（有算入金）',fmt(a.accountMdd),fmt(b.accountMdd)],['投入次數',String(a.contributionCount),String(b.contributionCount)],['再平衡次數',String(a.rebalanceCount),String(b.rebalanceCount)],['交易成本',money(a.tradingCosts),money(b.tradingCosts)]].map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')}</table>`;
      displayChart([a.curve,b.curve],['你的設定','全買 0050／大盤']);return;
    }
    const years=Math.floor(num('years'));if(years<1||years>70)throw Error('投資年數只能填 1～70 年。');
    $('run').disabled=true;setLifeProgress(1,'準備資料…');await yieldUi();
    let paths=[],lifeYearGroups=null,isBootstrap=$('lifeMode').value==='bootstrap';
    if($('lifeMode').value==='historical'){
      for(let i=0;i<rows.length;i++){
        const target=new Date(rows[i].date+'T00:00:00Z');target.setUTCFullYear(target.getUTCFullYear()+years);
        const endDate=target.toISOString().slice(0,10);if(endDate>rows.at(-1).date)break;
        const j=lowerBoundDate(rows,endDate,i+1);if(j<rows.length)paths.push(rows.slice(i,j+1));
        if(i%100===0){setLifeProgress(3+15*i/rows.length,`整理歷史區間：${paths.length.toLocaleString()} 組`);await yieldUi()}
      }
      if(paths.length>1000)paths=paths.filter((_,i)=>i%Math.ceil(paths.length/1000)===0);
    }else{
      lifeYearGroups=prepareLifeYears(rows,c);
      const keys=Object.keys(lifeYearGroups).filter(y=>lifeYearGroups[y].length>=200&&y!==rows[0].date.slice(0,4)&&y!==rows.at(-1).date.slice(0,4));
      if(!keys.length)throw Error('完整年度資料不夠，不能隨機重組。');
      const n=Math.min(2000,Math.max(100,Math.floor(num('runs'))));
      for(let r=0;r<n;r++){
        paths.push(Array.from({length:years},()=>keys[Math.floor(Math.random()*keys.length)]));
        if(r%20===0){setLifeProgress(3+12*(r+1)/n,`建立隨機人生：${r+1}／${n}`);await yieldUi()}
      }
    }
    if(!paths.length)throw Error('這段資料湊不出完整投資年數。');
    const results=[];
    for(let i=0;i<paths.length;i++){
      const rawA=isBootstrap?simulateLifeYears(paths[i],lifeYearGroups,c,c.weights,true):simulate(paths[i],c,c.weights,'curve');
      const rawB=isBootstrap?simulateLifeYears(paths[i],lifeYearGroups,c,[1,0,0],true):simulate(paths[i],c,[1,0,0],'curve');
      const a={...rawA,mdd:curveDrawdown(rawA.curve),horizons:summarizeHorizons(rawA.curve,years,isBootstrap),curve:compressCurve(rawA.curve,isBootstrap)};
      const b={...rawB,mdd:curveDrawdown(rawB.curve),horizons:summarizeHorizons(rawB.curve,years,isBootstrap),curve:compressCurve(rawB.curve,isBootstrap)};
      const meta=isBootstrap?{label:`隨機 ${i+1}`}:{start:paths[i][0].date,end:paths[i].at(-1).date};
      results.push({a,b,...meta});
      if(i%2===0||i===paths.length-1){setLifeProgress(20+76*(i+1)/paths.length,`正在回測：${i+1}／${paths.length}`);await yieldUi()}
    }
    setLifeProgress(98,'整理結果…');await yieldUi();
    runCount++;const signature=JSON.stringify({page,c,years,lifeMode:$('lifeMode').value,runs:num('runs')}),changed=signature!==lastRunSignature;lastRunSignature=signature;
    $('run').textContent='重新計算';$('result').classList.remove('stale');$('details').classList.remove('stale');
    $('message').textContent=`算完了（第 ${runCount} 次）｜${changed?'已用新設定':'設定沒變，重算結果相同'}｜每段都重跑投入、費用和再平衡`;
    $('metricNote').textContent='虧錢機率和勝率都有算投入時間、交易費和再平衡。';
    const ends=results.map(x=>x.a.end),benchmarkEnds=results.map(x=>x.b.end),loss=results.filter(x=>x.a.end<x.a.invested).length/results.length,win=results.filter(x=>x.a.end>x.b.end).length/results.length;
    $('range').textContent=`${years} 年・${results.length} 組`;
    $('metrics').innerHTML=metric('通常最後有多少（中位數）',money(quantile(ends,.5)))+metric('虧錢機率',fmt(loss))+metric('贏過 0050／大盤',fmt(win))+metric('較差情況（後 10%）',money(quantile(ends,.1)))+metric('較好情況（前 10%）',money(quantile(ends,.9)))+metric('總共投入',money(results[0].a.invested));
    const worst=!isBootstrap?[...results].sort((x,y)=>x.a.end/x.a.invested-y.a.end/y.a.invested).slice(0,5):[];
    $('comparison').innerHTML='<p class="hint">對照組的投入時間、金額都相同，全部買 0050／大盤。歷史區間可能重疊；隨機重組不是實際發生過的連續歷史。</p>'+(isBootstrap?'<div class="worst-wrap"><h3>最差歷史區間</h3><p class="hint">隨機重組沒有單一起訖日期。切回「歷史連續區間」才會顯示。</p></div>':`<div class="worst-wrap"><h3>最差五段歷史區間</h3><div class="heat-wrap"><table><thead><tr><th>期間</th><th>最後資產</th><th>策略年化</th><th>最大回撤</th></tr></thead><tbody>${worst.map(x=>`<tr><td>${x.start}<br>${x.end}</td><td>${money(x.a.end)}</td><td>${fmt(Math.pow(Math.max(x.a.curve.at(-1).value,0),1/years)-1)}</td><td>${fmt(x.a.mdd)}</td></tr>`).join('')}</tbody></table></div></div>`);
    const quantiles=[.1,.25,.5,.75,.9].map(q=>Array.from({length:81},(_,i)=>({date:String(i),value:quantile(results.map(x=>x.a.curve[i].value),q)})));
    const riskPoints=Array.from({length:years},(_,i)=>{const year=i+1;return {year,loss:results.filter(x=>x.a.horizons[i].assets<x.a.horizons[i].invested).length/results.length,win:results.filter(x=>x.a.horizons[i].assets>x.b.horizons[i].assets).length/results.length}});
    const drawdowns=results.map(x=>-x.a.mdd),benchmarkDrawdowns=results.map(x=>-x.b.mdd),invested=results[0].a.invested;
    lifeVisualState={ends,benchmarkEnds,invested,drawdowns,benchmarkDrawdowns,riskPoints};
    $('lifeCharts').classList.remove('hidden');
    $('terminalNote').textContent=`你的中位數 ${money(quantile(ends,.5))}｜0050／大盤 ${money(quantile(benchmarkEnds,.5))}｜紅線是總投入 ${money(invested)}`;
    $('riskNote').textContent=`第 ${years} 年：虧錢 ${fmt(riskPoints.at(-1).loss)}｜贏過 0050／大盤 ${fmt(riskPoints.at(-1).win)}`;
    $('drawdownNote').textContent=`你的中位數回撤 ${fmt(-quantile(drawdowns,.5))}｜最差 10% 約 ${fmt(-quantile(drawdowns,.9))}｜0050／大盤中位數 ${fmt(-quantile(benchmarkDrawdowns,.5))}`;
    displayLifeFan(quantiles);renderLifeVisuals();setLifeProgress(100,'完成');
  }catch(e){
    $('message').textContent=e.message;$('result').classList.add('hidden');$('details').classList.add('hidden');$('run').textContent='重新計算';
    if(page==='life'&&!$('lifeProgressWrap').classList.contains('hidden'))setLifeProgress(100,'計算失敗');
  }finally{$('run').disabled=false}
}
$('run').onclick=()=>run();
