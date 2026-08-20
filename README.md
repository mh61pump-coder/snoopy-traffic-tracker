# 史奴比的流量追蹤

蝦皮雙店舖（日井／文信）流量與產品競爭力儀表板。視覺採原創黑白漫畫小獵犬語彙，不包含受版權保護的角色素材。

## 本機預覽

使用任何靜態伺服器開啟專案根目錄，例如 `python -m http.server 4173`。

## 資料更新架構

- Drive 資料夾分區：`1 日井`、`2 文信`。
- `sync-state.json` 保存每個檔案的 Drive ID、修改時間與 SHA-256。
- 每週只抓取新增或變更檔案；標準化後按 `shop_id + date + product_id` upsert。
- 每次同步保留來源檔案指紋與分析版本，避免跨店混合並可追溯。
- v1.1.0 已接入 2026/08/03—08/09 與 08/13—08/19 兩個區間；每份檔案以 Drive ID 與 SHA-256 建立 checkpoint，只新增未處理檔案。
- 正式串接需要 Google Cloud service account/OAuth、GitHub repository 與部署目標的授權；密鑰只放 GitHub Secrets，絕不提交到 repository。

## 蝦皮欄位契約（待首份真實匯出檔確認）

最低需求：日期、訪客數、商品瀏覽數、加購數、訂單數、營業額；產品分析另需商品 ID、商品名稱、價格、評價、庫存與各商品流量／訂單。

## 安全與維護

- 前端只讀取聚合後的 JSON，不公開原始買家個資。
- CSV 解析限制檔案類型、大小與欄位；公式儲存格輸出前須 neutralize。
- 各 UI 區塊採獨立 render function；修改時以單區塊為範圍並附版本號。
- 語意化版本：功能 `minor`、修正 `patch`、破壞性架構變更 `major`。
