'use strict';
(()=>{
 const el=id=>document.getElementById(id), q=s=>document.querySelector(s), colors=['#3276d2','#0a9b83','#a663d7','#df9a39'];
 let data=null,view=null,pointer=null;const yearly=ms=>ms/(86400000*365.2425);
 const dollarTaiwan=rows=>{let m=[],t=0,stock=1,prev=null;for(let d of window.marketData){if(prev&&d[0]>'2003-06-30')stock*=d[1]/prev[1];m.push({date:d[0],stock,lever:d[4],future:d[3]});prev=d;}return m};
 const market=dollarTaiwan();
 function calculate(range,cost){
  let begin=range==='ewt'?'2000-06-20':range==='0050'?'2003-06-30':'2014-11-03';
  let rows=data.rows.filter(r=>r[0]>=begin);if(rows.length<2)throw Error('這段期間的 EWT 資料不足。');
  let midx=0;while(midx+1<market.length&&market[midx+1].date<=rows[0][0])midx++;
  const initMarket=market[midx],baseStock=initMarket.stock,baseLever=initMarket.lever;
  if(range==='actual'&&!baseLever)throw Error('正二實盤起點資料不足。');
  const vals=[[{date:rows[0][0],value:1}]],names=['EWT 模擬正二'];
  if(range!=='ewt'){vals.push([{date:rows[0][0],value:1}]);names.push('0050 每日兩倍（理想值）');vals.push([{date:rows[0][0],value:1}]);names.push('台指期模擬正二（扣費）')}
  if(range==='actual'){vals.push([{date:rows[0][0],value:1}]);names.push('00631L 實盤')}
  let ewt=1,stock2=1,future2=1,lastTaiwan=initMarket,prev=rows[0];
  for(let i=1;i<rows.length;i++){
   const r=rows[i],days=yearly(Date.parse(r[0])-Date.parse(prev[0]));
   const annual=(cost==='none'?0:r[3])+(cost==='fee'?.015:0);
   ewt*=Math.max(0,1+2*(r[1]/prev[1]-1)-annual*days);
   while(midx+1<market.length&&market[midx+1].date<=r[0]){let next=market[++midx];if(range!=='ewt'&&lastTaiwan.stock>0){stock2*=Math.max(0,1+2*(next.stock/lastTaiwan.stock-1));if(!Number.isFinite(next.future))throw Error('台指期資料缺漏：'+next.date);let yr=next.date.slice(0,4),rate=window.marketMeta.cashRates[yr]??window.marketMeta.cashRates['2025'],dt=yearly(Date.parse(next.date)-Date.parse(lastTaiwan.date));future2*=Math.max(0,1+2*next.future+(rate-.0104)*dt)}lastTaiwan=next;}
   vals[0].push({date:r[0],value:ewt});
   if(range!=='ewt'){vals[1].push({date:r[0],value:stock2});vals[2].push({date:r[0],value:future2})}
   if(range==='actual')vals[3].push({date:r[0],value:lastTaiwan.lever?lastTaiwan.lever/baseLever:vals[3].at(-1).value});
   prev=r;
  }
  return {rows,vals,names};
 }
 const pct=x=>Number.isFinite(x)?(100*x).toFixed(2)+'%':'—';
 const mult=x=>Number.isFinite(x)?x.toLocaleString('zh-TW',{maximumFractionDigits:2})+' 倍':'—';const profit=x=>!Number.isFinite(x)?'—':x>2?'+'+(x-1).toLocaleString('zh-TW',{maximumFractionDigits:2})+' 倍':((x-1)*100>=0?'+':'')+((x-1)*100).toFixed(2)+'%';
 function summary(curve){let peak=1,mdd=0;for(const x of curve){peak=Math.max(peak,x.value);mdd=Math.min(mdd,x.value/peak-1)}let last=curve.at(-1),duration=yearly(Date.parse(last.date)-Date.parse(curve[0].date));return {final:last.value,annual:last.value>0?Math.pow(last.value,1/duration)-1:-1,mdd}}
 function render(){
  if(!view)return;let canvas=el('ewtChart'),ctx=canvas.getContext('2d'),w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;if(!w||!h)return;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  let pad={l:54,r:12,t:15,b:30},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,values=view.vals.flat().map(x=>x.value).filter(x=>x>0);if(!values.length)return;let lo=Math.min(0,Math.floor(Math.log10(Math.min(...values)))),hi=Math.max(1,Math.ceil(Math.log10(Math.max(...values))));let y=v=>pad.t+(hi-Math.log10(Math.max(v,1e-12)))/(hi-lo)*ph;
  const dark=document.documentElement.dataset.theme==='dark';ctx.font='12px system-ui';ctx.fillStyle=dark?'#b2c5db':'#586a80';ctx.textAlign='right';ctx.textBaseline='middle';for(let i=0;i<=4;i++){let p=lo+(hi-lo)*i/4,yy=pad.t+ph-ph*i/4;ctx.strokeStyle=dark?'#2d4057':'#dce5ef';ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.fillText(mult(10**p),pad.l-5,yy)}
  for(let k=0;k<view.vals.length;k++){let curve=view.vals[k];ctx.beginPath();ctx.strokeStyle=colors[k];ctx.lineWidth=2;curve.forEach((p,i)=>{let x=pad.l+pw*i/(curve.length-1),yy=y(p.value);i?ctx.lineTo(x,yy):ctx.moveTo(x,yy)});ctx.stroke()}
  ctx.textBaseline='top';ctx.textAlign='left';ctx.fillText(view.rows[0][0],pad.l,h-pad.b+9);ctx.textAlign='right';ctx.fillText(view.rows.at(-1)[0],w-pad.r,h-pad.b+9);
  if(pointer!==null){let x=pad.l+pw*pointer;ctx.setLineDash([4,4]);ctx.strokeStyle=dark?'#b2c5db':'#586a80';ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+ph);ctx.stroke();ctx.setLineDash([])}
 }
 function update(){try{if(!data)return;view=calculate(el('ewtRange').value,el('ewtCost').value);pointer=null;el('ewtTip').textContent='點圖查看日期與數值';el('ewtStatus').textContent=`${view.rows[0][0]}～${view.rows.at(-1)[0]}｜${view.rows.length.toLocaleString()} 個美國交易日`;el('ewtLegend').innerHTML=view.names.map((n,i)=>`<span><i style="background:${colors[i]}"></i>${n}</span>`).join('');el('ewtResults').innerHTML='<table><thead><tr><th>比較</th><th>賺／賠</th><th>年化</th><th>最大回撤</th></tr></thead><tbody>'+view.vals.map((v,i)=>{let a=summary(v);return `<tr><th>${view.names[i]}</th><td>${profit(a.final)}</td><td>${pct(a.annual)}</td><td>${pct(a.mdd)}</td></tr>`}).join('')+'</tbody></table>';el('ewtResults').classList.remove('hidden');render()}catch(e){el('ewtStatus').textContent=e.message;el('ewtResults').classList.add('hidden')}}
 async function open(){el('ewtDialog').showModal();if(data){update();return}try{let resp=await fetch('ewt-history.json?v=1');if(!resp.ok)throw Error('EWT 資料尚未載入，請稍後再試。');data=await resp.json();if(!Array.isArray(data.rows)||data.rows.length<5000)throw Error('EWT 歷史資料不完整。');update()}catch(e){el('ewtStatus').textContent=e.message}}
 el('openEwt').onclick=open;el('ewtRange').onchange=update;el('ewtCost').onchange=update;el('ewtClose').onclick=()=>el('ewtDialog').close();
 el('ewtChart').addEventListener('pointerdown',e=>{if(!view)return;let rect=e.currentTarget.getBoundingClientRect();pointer=Math.max(0,Math.min(1,(e.clientX-rect.left-54)/(rect.width-66)));let idx=Math.round(pointer*(view.rows.length-1));el('ewtTip').textContent=[view.rows[idx][0],...view.vals.map((c,i)=>view.names[i]+'：'+mult(c[idx].value))].join('｜');render()});
 window.addEventListener('resize',()=>{if(el('ewtDialog').open)render()});
})();
