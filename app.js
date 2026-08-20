const VERSION = '1.2.0';
const drive = {
  rijing: 'https://drive.google.com/drive/folders/1C_YMhFn99oBoc4bgZwEUo8WK-DJgUhm9',
  wenxin: 'https://drive.google.com/drive/folders/1LG-ulf2eOM1SZceiMhdQ4jRZi3U-kQCn'
};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value);
const integer = value => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(value);
const percent = value => `${(value * 100).toFixed(2)}%`;
const signedPercent = value => value === null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
const signedPoints = value => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)} 個百分點`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const payload = await fetch('./data/analysis.json', { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error('分析資料載入失敗');
  return response.json();
});
const shops = payload.shops;
let current = 'rijing';

function render() {
  const shop = shops[current];
  const totals = shop.totals;
  $('#storeName').textContent = shop.name;
  $('#dateRange').textContent = shop.date;
  $('#driveLink').href = drive[current];
  $('#healthBadge').textContent = totals.visitor_to_buyer < .05 ? '訪客成交仍需改善' : '成交意圖較穩健';
  $('#healthBadge').style.background = totals.visitor_to_buyer < .05 ? 'var(--coral)' : 'var(--mint)';
  $('#lastSync').textContent = new Date(shop.source.modified).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
  $('#sourceCount').textContent = `${shop.source.files.length} 份檔案`;

  const delta = key => {
    const value = shop.comparisonDaily[key];
    return [signedPercent(value), value === null ? '' : value >= 0 ? 'up' : 'down'];
  };
  const kpis = [
    ['店舖訪客', integer(totals.visitors), ...delta('visitors')],
    ['商品點擊', integer(totals.clicks), ...delta('clicks')],
    ['全部訂單', integer(totals.orders), ...delta('orders')],
    ['總銷售額', money(totals.revenue), ...delta('revenue')]
  ];
  $('#kpis').innerHTML = kpis.map(([label, value, change, direction]) => `
    <article class="kpi">
      <small>${label}</small>
      <div class="value">${value}</div>
      <span class="delta ${direction}">${change} 日均 vs. 2026/07</span>
    </article>`
  ).join('');

  renderFunnel(shop);
  renderDiagnosis(shop);
  renderTraffic(shop);
  renderProducts(shop);
  renderActions(shop);
  renderSimulation();
  renderTable(shop);
}

function renderFunnel(shop) {
  const totals = shop.totals;
  const stages = [
    {
      label: '店舖訪客',
      value: totals.visitors,
      note: '進入店舖的不重複訪客',
      rateLabel: '起點'
    },
    {
      label: '潛在買家',
      value: totals.potential_buyers,
      note: '蝦皮辨識的高購買意圖人數',
      rateLabel: `${percent(totals.visitor_to_potential)} 留下`,
      loss: totals.visitors - totals.potential_buyers
    },
    {
      label: '實際買家',
      value: totals.buyers,
      note: '期間內完成購買的人數',
      rateLabel: `${percent(totals.potential_to_buyer)} 成交`,
      loss: totals.potential_buyers - totals.buyers
    }
  ];
  $('#funnel').innerHTML = `
    <div class="funnel-plain">
      ${stages.map((stage, index) => `
        <article class="funnel-stage">
          <span class="funnel-index">0${index + 1}</span>
          <small>${stage.label}</small>
          <strong>${integer(stage.value)} 人</strong>
          <p>${stage.note}</p>
          <b>${stage.rateLabel}</b>
          ${stage.loss ? `<em>較上階段少 ${integer(stage.loss)} 人</em>` : ''}
        </article>
        ${index < stages.length - 1 ? '<span class="funnel-arrow" aria-hidden="true">→</span>' : ''}
      `).join('')}
    </div>
    <div class="funnel-readout">
      <strong>一句話讀法</strong>
      <span>每 100 位店舖訪客，約 <b>${(totals.visitor_to_potential * 100).toFixed(1)} 位</b>成為潛在買家，最後 <b>${(totals.visitor_to_buyer * 100).toFixed(1)} 位</b>完成購買。</span>
      <span>本期 ${integer(totals.buyers)} 位買家共建立 ${integer(totals.orders)} 筆訂單，平均每位買家 ${totals.orders_per_buyer.toFixed(2)} 筆。</span>
    </div>`;
}

function renderDiagnosis(shop) {
  const totals = shop.totals;
  const topTraffic = shop.trafficLeaders[0];
  const noOrder = shop.opportunities[0];
  const revenueDirection = shop.comparisonDaily.revenue >= 0 ? '增加' : '減少';
  const insights = [
    [
      '先看期間是否可比',
      `本期為 ${shop.coverage.periodDays} 天、前期為 ${shop.coverage.priorPeriodDays} 天；因此變化一律用「每日平均」比較。日均營收${revenueDirection} ${Math.abs(shop.comparisonDaily.revenue * 100).toFixed(1)}%。`
    ],
    [
      '流量到買家的真正結果',
      `${integer(totals.visitors)} 位訪客中有 ${integer(totals.buyers)} 位購買，訪客成交率為 ${percent(totals.visitor_to_buyer)}；另有 ${integer(totals.potential_buyers - totals.buyers)} 位高意圖者尚未成交。`
    ],
    [
      '先處理最有證據的商品',
      noOrder
        ? `「${noOrder.name}」有 ${integer(noOrder.visitors)} 位商品訪客但 0 訂單，先檢查規格理解、運費、到貨日與信任資訊。`
        : `流量最高商品「${topTraffic.name}」有 ${integer(topTraffic.visitors)} 位訪客、${integer(topTraffic.orders)} 筆訂單，可複製其商品頁資訊結構。`
    ]
  ];
  $('#diagnosis').innerHTML = insights.map(([heading, body]) => `
    <div class="insight"><strong>${escapeHtml(heading)}</strong><p>${escapeHtml(body)}</p></div>
  `).join('');
}

function renderTraffic(shop) {
  const rows = shop.trafficLeaders;
  const maxVisitors = Math.max(...rows.map(product => product.visitors), 1);
  $('#trendChart').innerHTML = `
    <div class="traffic-table" role="list" aria-label="商品訪客前七名">
      ${rows.map((product, index) => `
        <article class="traffic-product" role="listitem" title="${escapeHtml(product.fullName)}">
          <span class="traffic-rank">${index + 1}</span>
          <div class="traffic-main">
            <strong>${escapeHtml(product.fullName)}</strong>
            <div class="traffic-track"><i style="width:${Math.max(3, product.visitors / maxVisitors * 100)}%"></i></div>
            <div class="traffic-values">
              <span><b>${integer(product.visitors)}</b> 商品訪客</span>
              <span><b>${integer(product.clicks)}</b> 點擊</span>
              <span><b>${integer(product.orders)}</b> 訂單</span>
              <span><b>${money(product.revenue)}</b> 銷售額</span>
            </div>
          </div>
        </article>
      `).join('')}
    </div>`;

  const totals = shop.totals;
  const prior = shop.priorTotals;
  const quality = [
    {
      name: '訪客 → 潛在買家',
      value: totals.visitor_to_potential,
      prior: prior.visitor_to_potential,
      formula: `${integer(totals.potential_buyers)} ÷ ${integer(totals.visitors)}`,
      meaning: `每 100 位訪客，約 ${(totals.visitor_to_potential * 100).toFixed(1)} 位出現較高購買意圖。`
    },
    {
      name: '潛在買家 → 實際買家',
      value: totals.potential_to_buyer,
      prior: prior.potential_to_buyer,
      formula: `${integer(totals.buyers)} ÷ ${integer(totals.potential_buyers)}`,
      meaning: `每 100 位潛在買家，約 ${(totals.potential_to_buyer * 100).toFixed(1)} 位完成購買。`
    },
    {
      name: '店舖訪客 → 實際買家',
      value: totals.visitor_to_buyer,
      prior: prior.visitor_to_buyer,
      formula: `${integer(totals.buyers)} ÷ ${integer(totals.visitors)}`,
      meaning: `每 100 位店舖訪客，約 ${(totals.visitor_to_buyer * 100).toFixed(1)} 位成為買家。`
    },
    {
      name: '蝦皮訂單轉換率',
      value: totals.order_conversion,
      prior: prior.order_conversion,
      formula: `${integer(totals.orders)} 筆訂單 ÷ ${integer(totals.clicks)} 次商品點擊`,
      meaning: '衡量商品點擊最後產生訂單的效率；分母是點擊次數，不是人數。'
    },
    {
      name: '有效訂單占比',
      value: totals.valid_order_rate,
      prior: prior.valid_order_rate,
      formula: `(${integer(totals.orders)} − ${integer(totals.invalid_orders)}) ÷ ${integer(totals.orders)}`,
      meaning: `本期 ${integer(totals.invalid_orders)} 筆不成立；此比率越高越好。`
    },
    {
      name: '退貨／退款占比',
      value: totals.refund_rate,
      prior: prior.refund_rate,
      formula: `${integer(totals.refund_orders)} ÷ ${integer(totals.orders)}`,
      meaning: `本期 ${integer(totals.refund_orders)} 筆退貨／退款；此比率越低越好。`
    }
  ];
  $('#sources').innerHTML = quality.map(metric => {
    const difference = metric.value - metric.prior;
    const favorable = metric.name.includes('退貨') ? difference <= 0 : difference >= 0;
    return `
      <article class="quality-row">
        <div class="quality-heading">
          <strong>${metric.name}</strong>
          <span class="quality-value">${percent(metric.value)}</span>
        </div>
        <code>${metric.formula} = ${percent(metric.value)}</code>
        <p>${metric.meaning}</p>
        <small class="${favorable ? 'good' : 'watch'}">較 2026/07 ${signedPoints(difference)}</small>
      </article>`;
  }).join('');
}

function renderProducts(shop) {
  const weights = payload.competitiveness.weights;
  $('#scoreGuide').innerHTML = `
    <strong>91、92、95 到底代表什麼？</strong>
    <p>這是「同店商品內部比較指數」，不是蝦皮官方分數，也不是外部市場占有率。每項先換算成店內 0–100 相對分位，再依下列權重加總；越接近 100，代表在本店本期商品中綜合表現越前面。</p>
    <div class="weight-formula">
      <span>營收力 ${weights.revenue}%</span><span>成交易 ${weights.conversion}%</span><span>流量力 ${weights.traffic}%</span><span>吸引力 ${weights.ctr}%</span><span>加購意圖 ${weights.cart}%</span>
    </div>`;
  const labels = { revenue: '營收力', conversion: '成交易', traffic: '流量力', ctr: '吸引力', cart: '加購意圖' };
  $('#productCards').innerHTML = shop.topProducts.map((product, index) => `
    <article class="card product" title="${escapeHtml(product.fullName)}">
      <div class="product-top" style="background:${['var(--yellow)', 'var(--blue)', 'var(--mint)', 'var(--coral)', 'var(--yellow)', 'var(--blue)'][index]}"></div>
      <div class="product-body">
        <span class="rank">#${index + 1}</span>
        <small>店內綜合排行</small>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="score-block">
          <div class="score">${product.score}</div>
          <div><strong>／100 內部比較指數</strong><p>由下方 5 項相對表現加權，不代表市場評分。</p></div>
        </div>
        <div class="product-actuals">
          <span>銷售額<b>${money(product.revenue)}</b></span>
          <span>訪客<b>${integer(product.visitors)}</b></span>
          <span>訂單<b>${integer(product.orders)}</b></span>
          <span>點擊率<b>${percent(product.ctr)}</b></span>
          <span>加購率<b>${percent(product.cart_rate)}</b></span>
        </div>
        <div class="component-list">
          ${Object.entries(labels).map(([key, label]) => `
            <div><span>${label} <small>× ${weights[key]}%</small></span><i><b style="width:${product.components[key]}%"></b></i><strong>${product.components[key]}</strong></div>
          `).join('')}
        </div>
      </div>
    </article>
  `).join('');
}

function renderActions(shop) {
  $('#actions').innerHTML = shop.actions.map((action, index) => `
    <article class="card action">
      <span class="action-number">${String(index + 1).padStart(2, '0')}</span>
      <h3>${escapeHtml(action.title)}</h3>
      <p>${escapeHtml(action.body)}</p>
      <span class="effort">預估工時 ${escapeHtml(action.effort)}</span>
    </article>
  `).join('');
}

function renderSimulation() {
  const lift = parseFloat($('#liftSlider').value);
  const totals = shops[current].totals;
  const targetBuyerRate = totals.visitor_to_buyer + lift / 100;
  const projectedBuyers = Math.round(totals.visitors * targetBuyerRate);
  const extraBuyers = Math.max(0, projectedBuyers - Math.round(totals.buyers));
  const extraOrders = Math.round(extraBuyers * totals.orders_per_buyer);
  $('#liftLabel').textContent = `${lift.toFixed(1)}%`;
  $('#simLift').textContent = `+${lift.toFixed(1)} 個百分點`;
  $('#simulation').innerHTML = `
    <div class="sim-box"><small>預估新增買家</small><strong>+${extraBuyers}</strong></div>
    <div class="sim-box"><small>預估新增訂單</small><strong>+${extraOrders}</strong></div>
    <div class="sim-box"><small>預估營收增量</small><strong>${money(extraOrders * totals.aov)}</strong></div>`;
}

function renderTable(shop) {
  $('#rawTable').innerHTML = shop.table.map(product => `
    <tr title="商品 ID ${escapeHtml(product.id)}">
      <td>${escapeHtml(product.name)}</td>
      <td>${integer(product.impressions)}</td>
      <td>${integer(product.clicks)}</td>
      <td>${percent(product.ctr)}</td>
      <td>${integer(product.visitors)}</td>
      <td>${integer(product.cart_visitors)}</td>
      <td>${integer(product.orders)}</td>
      <td>${money(product.revenue)}</td>
    </tr>
  `).join('');
}

function activateTab(tabId) {
  $$('.tab').forEach(button => button.classList.toggle('active', button.dataset.tab === tabId));
  $$('.panel').forEach(panel => panel.classList.toggle('active', panel.id === tabId));
}

$$('.store-btn').forEach(button => {
  button.onclick = () => {
    $$('.store-btn').forEach(item => item.classList.toggle('active', item === button));
    current = button.dataset.store;
    render();
  };
});
$$('.tab').forEach(button => {
  button.onclick = () => {
    activateTab(button.dataset.tab);
    history.replaceState(null, '', `#${button.dataset.tab}`);
  };
});
$('#liftSlider').oninput = renderSimulation;
const dialog = $('#versionDialog');
$('#versionButton').onclick = $('#footerVersion').onclick = () => dialog.showModal();
$('.close').onclick = () => dialog.close();
dialog.onclick = event => {
  if (event.target === dialog) dialog.close();
};
$('#csvInput').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    $('#importMessage').textContent = '檔案超過 10MB，請改放入對應的 Drive 資料夾。';
    return;
  }
  const text = await file.text();
  const rows = text.trim().split(/\r?\n/);
  $('#importMessage').textContent = `已安全讀取 ${file.name}（約 ${Math.max(0, rows.length - 1)} 筆）；本機預覽不會將檔案上傳或覆寫 Drive。`;
};
const initialTab = location.hash.slice(1);
if (['overview', 'traffic', 'products', 'playbook', 'data'].includes(initialTab)) activateTab(initialTab);
document.documentElement.dataset.version = VERSION;
render();
