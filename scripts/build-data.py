from __future__ import annotations
import hashlib, json, math, re
from pathlib import Path
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
SOURCES={
 "rijing":{"name":"日井","path":ROOT/"work/latest_rijing.xlsx","drive_id":"1myu50HcZnYMwz4wd6cS3vhQY3org2Z-l","file_name":"parentskudetail.20260813_20260819.xlsx","modified":"2026-08-20T04:03:49Z","prior_path":ROOT/"work/prior_rijing.xlsx","prior_drive_id":"1xU3r-qZJSkoL3t-ZqSa9-bz8Ob1VXGHg","prior_file_name":"parentskudetail.20260803_20260809.xlsx","prior_modified":"2026-08-20T04:11:47Z"},
 "wenxin":{"name":"文信","path":ROOT/"work/latest_wenxin.xlsx","drive_id":"1dGB0ELo1imQri58h9FJo-CUwKciHEvBo","file_name":"parentskudetail.20260813_20260819 (1).xlsx","modified":"2026-08-20T04:03:55Z","prior_path":ROOT/"work/prior_wenxin.xlsx","prior_drive_id":"1ZUoO86Ob9vmA95rfagdHyMFJZH4__mFG","prior_file_name":"parentskudetail.20260803_20260809 (1).xlsx","prior_modified":"2026-08-20T04:12:09Z"}}
COLUMNS={"revenue":"銷售額(全部訂單) (TWD)","impressions":"商品曝光次數","clicks":"商品點擊數","orders":"全部訂單","visitors":"商品訪客數","page_views":"商品頁瀏覽數","bounces":"跳出商品的不重複訪客","cart_visitors":"商品頁訪客數(加入購物車)","cart_items":"加入購物車(件數)","buyers":"買家(全部訂單)"}

def number(value):
 if value in (None,"","-"): return 0.0
 text=str(value).replace(",","").strip()
 try:return float(text.rstrip("%"))/(100 if text.endswith("%") else 1)
 except ValueError:return 0.0

def compact_name(name,limit=34):
 name=re.sub(r"^[🌸★☆*\s]+","",name);name=re.sub(r"(鋐宇泵浦|鋐宇)","",name);name=re.sub(r"\s+"," ",name).strip("★☆* -")
 return name if len(name)<=limit else name[:limit-1]+"…"

def ratio(a,b):return a/b if b else 0
def percentile(values,current):return sum(v<=current for v in values)/len(values) if values else 0

def read_products(path):
 ws=openpyxl.load_workbook(path,read_only=True,data_only=True)["最佳表現商品"];rows=ws.iter_rows(values_only=True);headers=list(next(rows));index={name:headers.index(name) for name in headers};products=[]
 for row in rows:
  if str(row[index["商品規格ID"]])!="-":continue
  item={"id":str(row[index["商品ID"]]),"name":compact_name(str(row[index["商品名稱"]])),"fullName":str(row[index["商品名稱"]])};item.update({key:number(row[index[source]]) for key,source in COLUMNS.items()})
  item.update({"ctr":ratio(item["clicks"],item["impressions"]),"conversion":ratio(item["orders"],item["visitors"]),"cart_rate":ratio(item["cart_visitors"],item["visitors"]),"bounce_rate":ratio(item["bounces"],item["visitors"])});products.append(item)
 return products

def score_products(products):
 pools={"traffic":[math.log1p(p["impressions"]) for p in products],"revenue":[math.log1p(p["revenue"]) for p in products],"ctr":[p["ctr"] for p in products],"conversion":[p["conversion"] for p in products],"cart":[p["cart_rate"] for p in products]}
 for p in products:
  score=.18*percentile(pools["traffic"],math.log1p(p["impressions"]))+.27*percentile(pools["revenue"],math.log1p(p["revenue"]))+.16*percentile(pools["ctr"],p["ctr"])+.24*percentile(pools["conversion"],p["conversion"])+.15*percentile(pools["cart"],p["cart_rate"]);p["score"]=round(score*100)

def aggregate(products):
 totals={metric:sum(p[metric] for p in products) for metric in COLUMNS}
 totals.update({"ctr":ratio(totals["clicks"],totals["impressions"]),"conversion":ratio(totals["orders"],totals["visitors"]),"cart_rate":ratio(totals["cart_visitors"],totals["visitors"]),"bounce_rate":ratio(totals["bounces"],totals["visitors"]),"aov":ratio(totals["revenue"],totals["orders"])})
 return {k:round(v,4) for k,v in totals.items()}

def tactics(shop,products):
 no_order=sorted([p for p in products if p["orders"]==0 and p["visitors"]>=10],key=lambda p:p["visitors"],reverse=True);target=no_order[0]["name"] if no_order else "高流量未成交商品"
 if shop=="rijing":return [{"title":"先修有訪客但零訂單商品","body":f"「{target}」已有明確瀏覽意圖卻未成交。首圖補上適用場景、規格判斷與到貨承諾，並把常見安裝疑問前移。","effort":"60–90 分鐘"},{"title":"合併同質商品的決策資訊","body":"同類高壓清洗機與泵浦商品容易互相分流。建立一張型號比較表，依用途、揚程、功率與保固引導選型。","effort":"1–2 小時"},{"title":"高單價商品補強信任","body":"針對發電機與空氣泵浦增加實機影片、尺寸／噪音／保固、出貨方式與售後流程，降低下單前的不確定感。","effort":"2 小時"}]
 return [{"title":"複製冠軍商品資訊結構","body":"TS 排風扇系列是流量與成交核心。把它的尺寸標示、MIT／保固與快速出貨訊號，複製到其他風扇商品首屏。","effort":"1–2 小時"},{"title":"處理有加購卻零成交","body":f"「{target}」已有加購訊號。檢查規格命名、相容型號、運費與到貨日是否在結帳前造成疑慮。","effort":"45–60 分鐘"},{"title":"降低冠軍商品集中風險","body":"用商品頁內的替代型號比較與使用情境連結，把冠軍商品流量導向第二、三名商品，不需先購買外部廣告。","effort":"60 分鐘"}]

def build_shop(key,source):
 products=read_products(source["path"]);prior_products=read_products(source["prior_path"]);score_products(products);totals=aggregate(products);prior=aggregate(prior_products);comparison={k:round((totals[k]-prior[k])/prior[k],4) if prior[k] else None for k in totals};by_score=sorted(products,key=lambda p:(p["score"],p["revenue"]),reverse=True);by_revenue=sorted(products,key=lambda p:p["revenue"],reverse=True);by_opportunity=sorted([p for p in products if p["orders"]==0],key=lambda p:(p["visitors"],p["cart_visitors"]),reverse=True)
 files=[{"fileId":source["prior_drive_id"],"fileName":source["prior_file_name"],"period":"2026/08/03—08/09","modified":source["prior_modified"],"sha256":hashlib.sha256(source["prior_path"].read_bytes()).hexdigest()},{"fileId":source["drive_id"],"fileName":source["file_name"],"period":"2026/08/13—08/19","modified":source["modified"],"sha256":hashlib.sha256(source["path"].read_bytes()).hexdigest()}]
 return {"name":source["name"],"date":"2026/08/13—08/19","priorDate":"2026/08/03—08/09","source":{"fileId":source["drive_id"],"fileName":source["file_name"],"modified":source["prior_modified"],"files":files},"coverage":{"parentProducts":len(products),"priorParentProducts":len(prior_products),"periodDays":7},"totals":totals,"priorTotals":prior,"comparison":comparison,"history":[{"period":"08/03—08/09","totals":prior},{"period":"08/13—08/19","totals":totals}],"topProducts":by_score[:6],"revenueLeaders":by_revenue[:7],"opportunities":by_opportunity[:6],"actions":tactics(key,products),"table":by_revenue[:30]}

payload={"version":"1.1.1","generatedAt":"2026-08-20T12:30:00+08:00","method":"Incremental file checkpoints; parent SKU summary rows only; all rates recomputed from aggregate counts.","shops":{key:build_shop(key,source) for key,source in SOURCES.items()}}
output=ROOT/"data/analysis.json";output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8");print(output)
