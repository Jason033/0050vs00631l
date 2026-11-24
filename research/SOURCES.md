# 日資料重建來源

保留資料起訖，不跨日補齊台指期。ETF 停止交易期間以最後一次收盤價估值。股息假設為除息日全額再投入，不含個人股利所得稅。台指期 1998/07/21 上市；期貨資料有首日結算價後，次交易日才產生日報酬。

將以下回應正文存至同一資料夾。FinMind API URL 以 `https://api.finmindtrade.com/api/v4/data?` 接上表中參數；截至日期由腳本固定。來源若有回溯修改或存取限制，重建的值可能不同。請遵守來源條款與下載速率限制。

| 檔名 | 原始資料 |
|---|---|
| taiex-Native.js | https://www.011.idv.tw/Taiex/taiex-Native.js （含版本衝突的舊版快照，程式取第一部分；只保留 2003 年前） |
| audit-fmt2003 | dataset=TaiwanStockTotalReturnIndex&data_id=TAIEX&start_date=2003-01-01 |
| audit-ftwprice | dataset=TaiwanStockPrice&data_id=TAIEX&start_date=2003-01-01 |
| audit-price0050full | dataset=TaiwanStockPrice&data_id=0050&start_date=2003-06-30 |
| audit-fdiv0050 | dataset=TaiwanStockDividend&data_id=0050&start_date=2003-01-01 |
| audit-ffull00631 | dataset=TaiwanStockPrice&data_id=00631L&start_date=2014-10-31 |

期交所日行情經 FinMind 轉錄；固定參數為 `dataset=TaiwanFuturesDaily&data_id=TX`，以下加 `start_date` 與 `end_date`：

| 檔名 | start_date | end_date |
|---|---|---|
| audit-txhist1998 | 1997-12-01 | 2002-12-31 |
| audit-txhist2003 | 2002-12-01 | 2007-12-31 |
| audit-ftx0809 | 2007-12-01 | 2009-12-31 |
| audit-txhist2010 | 2009-12-01 | 2013-12-31 |
| audit-txhist2014 | 2013-12-01 | 2016-12-31 |
| audit-txhist2017 | 2016-12-01 | 2019-12-31 |
| audit-txhist2020 | 2019-12-01 | 2023-12-31 |
| audit-tx24 | 2024-01-01 | 2024-12-31 |
| audit-tx25 | 2025-01-01 | 2025-12-31 |
| audit-ftx26 | 2025-12-01 | 2026-11-23 |
| audit-fmt_tx | 2024-01-01 | 未設定 |

執行 `python3 research/build-data.py /path/to/snapshots`，接著執行 `node research/audit.cjs`。資料元件欄位依序為日期、0050 含息代理淨值、加權基準（早期未含息）、台指期日報酬、00631L 驗證價格、可否交易 0050。

## 早期股息與利率

| 用途 | 來源 |
|---|---|
| 1967–2001 含息長期終值 | [黃寬彥（2002）](https://thesis.lib.nccu.edu.tw/thesis/detail/a7b2824e493078e113f3d9822a380339/) |
| 1967–2009 長期績效 | [陳虹伶等（2010）](https://ah.lib.nccu.edu.tw/item?item_id=78170) |
| 1986–2000 股息倍率 | [陳怡雯（2001）](https://ah.lib.nccu.edu.tw/item?item_id=94998) |
| 1998–2005 指數現金股利 | [許溪南等（2009）](https://toaj.stpi.niar.org.tw/index/journal/volume/article/4b1141f98b3ea6fe018b46d082ae00b2) |
| 1985–2002 月均價格 | [TWSE Fact Book](https://www.twse.com.tw/zh/about/company/factbooks.html) |
| 1969–1998 短率 | [央行利率月資料](https://www.cbc.gov.tw/public/data/economic/statistics/key/interest.xls) |
| 1998–2025 RP | [央行貨幣市場年資料](https://www.cbc.gov.tw/public/data/OpenData/%E7%B6%93%E7%A0%94%E8%99%95/EG41Y01.csv) |

`market-meta.js` 內的 `earlyDividends`、`fundingRates`、`cashRates` 為上述來源整理後的百分率小數。1967–1968 利率沿用第一個可用的 1969 年值。
