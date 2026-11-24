import json, io
import pandas as pd
import requests
import yfinance as yf

END='2026-11-24'
start='2000-01-01'
prices=yf.download('EWT',start=start,end=END,auto_adjust=True,progress=False,threads=False)
if isinstance(prices.columns,pd.MultiIndex): prices.columns=prices.columns.get_level_values(0)
prices=prices['Close'].dropna()
prices.index=pd.to_datetime(prices.index).tz_localize(None).normalize()
if len(prices)<5000 or prices.index.min()>pd.Timestamp('2000-07-01'):
    raise RuntimeError(f'EWT history is incomplete: {len(prices)}, start={prices.index.min() if len(prices) else None}')

def fred(series):
    url='https://fred.stlouisfed.org/graph/fredgraph.csv'
    response=requests.get(url,params={'id':series,'cosd':start,'coed':'2026-11-23'},timeout=40)
    response.raise_for_status()
    df=pd.read_csv(io.StringIO(response.text),na_values='.')
    return pd.Series(pd.to_numeric(df.iloc[:,1],errors='coerce').to_numpy(),index=pd.to_datetime(df.iloc[:,0])).dropna()
fx=fred('DEXTAUS');rate=fred('DFF')
if fx.index.min()>pd.Timestamp('2000-07-01') or rate.index.min()>pd.Timestamp('2000-07-01') or fx.index.max()<pd.Timestamp('2026-10-01'):
    raise RuntimeError('FRED history is incomplete')
index=pd.date_range('2000-01-01',max(prices.index.max(),fx.index.max(),rate.index.max()),freq='D')
fx_daily=fx.reindex(index).ffill(limit=7);rate_daily=rate.shift(1,freq='D').reindex(index).ffill(limit=7)
valid=prices.index[prices.index<=fx.index.max()]
rows=[]
for dt in valid:
    p=prices.loc[dt];f=fx_daily.loc[dt];r=rate_daily.loc[dt]
    if pd.isna(f) or pd.isna(r): raise RuntimeError(f'missing exchange rate or funding rate at {dt.date()}')
    rows.append([dt.strftime('%Y-%m-%d'),round(float(p),8),round(float(f),6),round(float(r)/100,7)])
if len(rows)<5000:raise RuntimeError('too few matched dates')
result={'ewtSource':'Yahoo Finance adjusted close (split and dividends)','fxSource':'FRED DEXTAUS','rateSource':'FRED DFF; previous calendar day','rows':rows}
open('ewt-history.json','w',encoding='utf-8').write(json.dumps(result,separators=(',',':'))+'\n')
print('EWT matched rows',len(rows),'range',rows[0][0],rows[-1][0])
