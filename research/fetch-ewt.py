import json,time,requests,yfinance as yf,pandas as pd
out={'yahoo':{},'twse':{}}
for ticker in ['0050.TW','00631L.TW','^TW50','^TWII']:
    try:
        a=yf.download(ticker,start='2019-12-01',end='2026-01-01',auto_adjust=True,progress=False,threads=False)
        if isinstance(a.columns,pd.MultiIndex): a.columns=a.columns.get_level_values(0)
        series=a['Close'].dropna();out['yahoo'][ticker]={str(k.date()):round(float(v),8) for k,v in series.items()}
        print(ticker,len(series))
    except Exception as e:out['yahoo'][ticker]={'error':str(e)}
for sym in ['0050','00631L']:
    for y in range(2019,2026):
        try:
            res=requests.get('https://www.twse.com.tw/exchangeReport/STOCK_DAY',params={'response':'json','date':str(y)+'1201','stockNo':sym},timeout=35,headers={'User-Agent':'Mozilla/5.0'});res.raise_for_status();j=res.json();out['twse'][sym+'-'+str(y)]=j;print(sym,y,j.get('stat'),len(j.get('data',[])))
        except Exception as e:out['twse'][sym+'-'+str(y)]={'error':str(e)}
        time.sleep(.5)
open('ewt-history.json','w').write(json.dumps(out,separators=(',',':'),ensure_ascii=False))
