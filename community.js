'use strict';
(() => {
  const ns='jason033-0050vs00631l', base=`https://counterapi.com/api/${ns}`;
  const el=id=>document.getElementById(id);
  let stored;
  try { stored=localStorage; stored.setItem('__storage_test','1');stored.removeItem('__storage_test'); }
  catch (_) { stored=null; }
  let visitor=stored?.getItem('siteVisitorId');
  if (!visitor) { visitor=globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; try { stored?.setItem('siteVisitorId',visitor) } catch (_) {} }
  const selected=()=>stored?.getItem('investmentVote');
  async function call(action,key,params={}) {
    let query=new URLSearchParams({userId:visitor,...params});
    let res=await fetch(`${base}/${action}/${key}?${query}`,{cache:'no-store'});
    if(!res.ok)throw new Error('stat service unavailable');
    let obj=await res.json();let value=Number(obj.value);if(!Number.isFinite(value)||value<0)throw new Error('invalid count');return value;
  }
  function showSelection(){let choice=selected();el('voteIndex').setAttribute('aria-pressed',String(choice==='index'));el('voteLeveraged').setAttribute('aria-pressed',String(choice==='leveraged'));return choice;}
  async function refresh(){try{let [index,leveraged]=await Promise.all([call('vote','index',{readOnly:'true'}),call('vote','leveraged',{readOnly:'true'})]);let total=index+leveraged;el('indexVotes').textContent=`${index} 票（${total?(100*index/total).toFixed(1):'0.0'}%）`;el('leveragedVotes').textContent=`${leveraged} 票（${total?(100*leveraged/total).toFixed(1):'0.0'}%）`;el('voteFill').style.width=`${total?100*index/total:50}%`;el('voteStatus').textContent=showSelection()?'已投票':'選擇一派';}catch(_){el('voteStatus').textContent='暫時無法讀取統計，請稍後再試';}}
  let busy=false;
  async function vote(choice){if(busy)return;if(!stored){el('voteStatus').textContent='瀏覽器未啟用本機儲存，無法記錄投票';return}if(selected()){el('voteStatus').textContent='這個瀏覽器已投過票';return}busy=true;el('voteStatus').textContent='送出中…';try{await call('vote',choice);stored.setItem('investmentVote',choice);await refresh()}catch(_){el('voteStatus').textContent='投票未完成，請稍後再試'}finally{busy=false}}
  el('voteIndex').addEventListener('click',()=>vote('index'));el('voteLeveraged').addEventListener('click',()=>vote('leveraged'));showSelection();refresh();
  (async()=>{try{let v=await call('view','visitors',{unique:'true'});el('visitorCount').textContent=v.toLocaleString('zh-TW')}catch(_){el('visitorCount').textContent='暫無資料'}})();
})();
