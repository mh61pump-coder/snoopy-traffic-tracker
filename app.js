const VERSION='1.1.1';
const drive={rijing:'https://drive.google.com/drive/folders/1C_YMhFn99oBoc4bgZwEUo8WK-DJgUhm9',wenxin:'https://drive.google.com/drive/folders/1LG-ulf2eOM1SZceiMhdQ4jRZi3U-kQCn'};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:0}).format(n);
const integer=n=>new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0}).format(n);
const percent=n=>`${(n*100).toFixed(2)}%`;
const payload=await fetch('./data/analysis.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('分析資料載入失敗');return r.json()});
const shops=payload.shops;
let current='rijing';

function render(){
 const s=shops[current],t=s.totals;
 $('#storeName').textContent=s.name;$('#dateRange').textContent=s.date;$('#driveLink').href=drive[current];
 $('#healthBadge').textContent=t.conversion<.05?'優先改善成交':'轉換表現穩健';$('#healthBadge').style.background=t.conversion<.05?'var(--coral)':'var(--mint)';
 $('#lastSync').textContent=new Date(s.source.modified).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});
 const delta=(key)=>{const v=s.comparison[key];if(v===null)return['—',''];return[`${v>=0?'+':''}${(v*100).toFixed(1)}%`,v>=0?'up':'down']};
 const kpis=[['商品曝光',integer(t.impressions),...delta('impressions')],['商品訪客',integer(t.visitors),...delta('visitors')],['全部訂單',integer(t.orders),...delta('orders')],['銷售額',money(t.revenue),...delta('revenue')]];
 $('#kpis').innerHTML=kpis.map(([l,v,d,c])=>`<article class="kpi"><small>${l}</small><div class="value">${v}</div><span class="delta ${c}">${d} vs. 08/03—08/09</span></article>`).join('');
 const funnel=[['曝光',1000],['點擊',Math.round(t.ctr*1000)],['商品訪客',Math.round(t.visitors/t.impressions*1000)],['加購訪客',Math.round(t.cart_visitors/t.impressions*1000)],['訂單',Math.round(t.orders/t.impressions*1000)]];
 $('#funnel').innerHTML=funnel.map(([l,v])=>`<div class="funnel-step"><div class="funnel-bar" style="height:${42+Math.sqrt(v/1000)*145}px">${v}</div><small>${l}</small></div>`).join('');
 const noOrder=s.opportunities[0],leader=s.revenueLeaders[0],concentration=leader.revenue/t.revenue;
 const insights=t.conversion<.05?
  [['成交效率正在改善',`訂單較前期增加 ${(s.comparison.orders*100).toFixed(1)}%，轉換率提升 ${(s.comparison.conversion*100).toFixed(1)}%；不是單靠流量增加。`],['仍有高意圖商品流失',noOrder?`「${noOrder.name}」有 ${integer(noOrder.visitors)} 位訪客、${integer(noOrder.cart_visitors)} 位加購訪客，卻沒有訂單。`:'優先檢查高訪客低訂單商品。'],['營收集中可用來學習',`冠軍商品貢獻 ${percent(concentration)} 營收，拆解其首圖、規格與服務訊號並套用到相似商品。`]]:
  [['量與質同步成長',`曝光增加 ${(s.comparison.impressions*100).toFixed(1)}%，訂單增加 ${(s.comparison.orders*100).toFixed(1)}%，轉換率也提升 ${(s.comparison.conversion*100).toFixed(1)}%。`],['加購意圖更明確',`加購訪客率提升 ${(s.comparison.cart_rate*100).toFixed(1)}%，持續降低規格、相容性與到貨資訊的不確定感。`],['留意冠軍商品集中',`冠軍商品貢獻 ${percent(concentration)} 營收，應把流量導向第二、三名替代商品。`]];
 $('#diagnosis').innerHTML=insights.map(([h,p])=>`<div class="insight"><strong>${h}</strong><p>${p}</p></div>`).join('');
 renderTraffic(s);renderProducts(s);renderActions(s);renderSimulation();renderTable(s);
}

function renderTraffic(s){
 const rows=s.revenueLeaders.slice(0,7),max=Math.max(...rows.map(x=>x.impressions),1),maxClick=Math.max(...rows.map(x=>x.clicks),1);
 $('#trendChart').innerHTML=`<div class="bar-chart">${rows.map((p,i)=>`<div class="bar-group" title="${p.fullName}"><div class="bars"><i style="height:${Math.max(4,p.impressions/max*180)}px"></i><i style="height:${Math.max(4,p.clicks/maxClick*180)}px"></i></div><small>0${i+1}</small></div>`).join('')}</div>`;
 const quality=[['點擊率',s.totals.ctr,.10],['訪客→加購',s.totals.cart_rate,.35],['訪客→訂單',s.totals.conversion,.15],['低跳出表現',1-s.totals.bounce_rate,1]];
 $('#sources').innerHTML=quality.map(([n,v,cap])=>`<div class="source-row"><span>${n}</span><div class="source-track"><div class="source-fill" style="width:${Math.min(100,v/cap*100)}%"></div></div><span>${percent(v)}</span></div>`).join('');
}

function renderProducts(s){
 $('#productCards').innerHTML=s.topProducts.slice(0,6).map((p,i)=>`<article class="card product" title="${p.fullName}"><div class="product-top" style="background:${['var(--yellow)','var(--blue)','var(--mint)','var(--coral)','var(--yellow)','var(--blue)'][i]}"></div><div class="product-body"><span class="rank">${String(i+1).padStart(2,'0')}</span><small>內部競爭力排行</small><h3>${p.name}</h3><div class="score">${p.score}</div><div class="metrics"><span>點擊率<strong>${percent(p.ctr)}</strong></span><span>轉換率<strong>${percent(p.conversion)}</strong></span><span>營收<strong>${money(p.revenue)}</strong></span></div></div></article>`).join('');
}

function renderActions(s){
 $('#actions').innerHTML=s.actions.map((a,i)=>`<article class="card action"><span class="action-number">${String(i+1).padStart(2,'0')}</span><h3>${a.title}</h3><p>${a.body}</p><span class="effort">預估工時 ${a.effort}</span></article>`).join('');
}

function renderSimulation(){
 const lift=parseFloat($('#liftSlider').value),s=shops[current],t=s.totals,newOrders=Math.round(t.visitors*(t.conversion+lift/100)),extra=Math.max(0,newOrders-Math.round(t.orders));
 $('#liftLabel').textContent=`${lift.toFixed(1)}%`;$('#simLift').textContent=`+${lift.toFixed(1)}%`;
 $('#simulation').innerHTML=`<div class="sim-box"><small>預估新增訂單</small><strong>+${extra}</strong></div><div class="sim-box"><small>預估總訂單</small><strong>${newOrders}</strong></div><div class="sim-box"><small>預估營收增量</small><strong>${money(extra*t.aov)}</strong></div>`;
}

function renderTable(s){
 $('#rawTable').innerHTML=s.table.map(p=>`<tr title="商品 ID ${p.id}"><td>${p.name}</td><td>${integer(p.impressions)}</td><td>${integer(p.clicks)}</td><td>${percent(p.ctr)}</td><td>${integer(p.visitors)}</td><td>${integer(p.cart_visitors)}</td><td>${integer(p.orders)}</td><td>${money(p.revenue)}</td></tr>`).join('');
}

$$('.store-btn').forEach(b=>b.onclick=()=>{$$('.store-btn').forEach(x=>x.classList.toggle('active',x===b));current=b.dataset.store;render()});
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===b.dataset.tab));history.replaceState(null,'',`#${b.dataset.tab}`)});
$('#liftSlider').oninput=renderSimulation;
const dialog=$('#versionDialog');$('#versionButton').onclick=$('#footerVersion').onclick=()=>dialog.showModal();$('.close').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
$('#csvInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>10*1024*1024){$('#importMessage').textContent='檔案超過 10MB，請改放入對應的 Drive 資料夾。';return}const text=await f.text();const rows=text.trim().split(/\r?\n/);$('#importMessage').textContent=`已安全讀取 ${f.name}（約 ${Math.max(0,rows.length-1)} 筆）；本機預覽不會將檔案上傳或覆寫 Drive。`;};
document.documentElement.dataset.version=VERSION;render();
