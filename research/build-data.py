"""Rebuild browser inputs. Pass directory containing the source snapshots in SOURCES.md."""
import calendar
import datetime as dt
import json
import math
from pathlib import Path
import re
import sys
from collections import Counter, defaultdict

source = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1]
cutoff = '2026-11-23'

def read(name):
    obj = json.loads((source / ('audit-' + name)).read_text())
    assert obj['status'] == 200, name
    return obj['data']

def emit(name, key, obj):
    (out / name).write_text('window.' + key + '=' + json.dumps(obj, separators=(',', ':')) + ';\n')

def levels(name, field):
    rows = read(name)
    values = {v['date']: v[field] for v in rows if v['date'] <= cutoff}
    assert len(values) == len([v for v in rows if v['date'] <= cutoff])
    assert all(v > 0 for v in values.values())
    return values

original = (source / 'taiex-Native.js').read_text().split('=======')[0]
early = {d.replace('/', '-'): float(p) for d, p in re.findall(r"\[new Date\('([0-9/]+)'\),([0-9.]+)\]", original) if d < '2003/01/01'}
assert min(early) == '1967-01-05' and early['2001-12-31'] == 5551.24 and early['2002-12-31'] == 4452.45
index = levels('fmt2003', 'price')
index_price = levels('ftwprice', 'close')
assert index.keys() == index_price.keys() and len(index) == 5879
index = dict(sorted(index.items()))
# Chain old prices to the same units as the first total-return index print.
# No earliest session cash dividend is assumed when bridging the two series.
scale = index['2003-01-02'] / index_price['2003-01-02']
market = {**{d: p * scale for d, p in early.items()}, **index}
dates = sorted(market)
counts = Counter(d[:4] for d in dates[1:] if d < '2003-01-01')

quotes = defaultdict(dict)
for name in ['txhist1998', 'txhist2003', 'ftx0809', 'txhist2010', 'txhist2014', 'txhist2017', 'txhist2020', 'tx24', 'tx25', 'ftx26', 'fmt_tx']:
    for v in read(name):
        c, d, p = v['contract_date'], v['date'], v['settlement_price']
        if d <= cutoff and re.fullmatch(r'[0-9]{6}', c) and v['trading_session'] == 'position' and p > 0:
            if c in quotes[d]:
                assert quotes[d][c] == p, (d, c)
            quotes[d][c] = p
assert min(quotes) == '1998-07-21'
tx = {}
for a, b in zip(dates, dates[1:]):
    if a < min(quotes):
        continue
    # Buy and sell legs are never divided by one another. The expiring
    # contract has no daily settlement on expiry, so switch the previous close.
    common = quotes[a].keys() & quotes[b].keys()
    assert common, (a, b)
    contract = min(common)
    tx[b] = quotes[b][contract] / quotes[a][contract] - 1
assert (quotes.keys() - set(dates)) == set(), sorted(quotes.keys() - set(dates))

# Total return: use raw closing prints and reinvest gross dividends at the
# ex-date close. Splits change units, not portfolio value.
etf = levels('price0050full', 'close')
div = defaultdict(float)
for v in read('fdiv0050'):
    d = v['CashExDividendTradingDate']
    if d and d <= cutoff:
        assert d in etf, d
        div[d] += v['CashEarningsDistribution'] + v['CashStatutorySurplus']
assert div['2026-01-22'] == 1 and div['2026-07-21'] == .6
assert etf['2003-06-30'] == 37.08 and etf['2025-06-10'] == 188.65
lever = levels('ffull00631', 'close')
assert lever['2026-03-24'] == 443.15 and lever['2014-10-31'] == 20.2
assert set(etf).issubset(market) and set(lever).issubset(market)
portfolio = []
mark = 100
prev_etf = None
previous = None
for i, d in enumerate(dates):
    if previous:
        if d in etf and prev_etf:
            split = 4 if d == '2025-06-18' else 1
            mark *= (etf[d] + div[d]) * split / prev_etf
        elif not prev_etf:
            mark *= market[d] / market[previous]
    if d in etf:
        prev_etf = etf[d]
    portfolio.append([d, round(mark, 8), round(market[d], 6), round(tx[d], 11) if d in tx else None, round(lever[d] / (22 if d < '2026-03-31' else 1), 8) if d in lever else None, d in etf or d < '2003-06-30'])
    previous = d

from itertools import groupby
annual = {}
for year, items in groupby(range(1, len(dates)), key=lambda i: dates[i][:4]):
    ids = list(items)
    if year < '2003': continue
    # In 2003 both publicly comparable legs start at Jan 2 close.
    if year == '2003': ids = ids[1:]
    future = math.prod(1+tx[dates[i]] for i in ids)-1
    spot = market[dates[ids[-1]]] / market[dates[ids[0]-1]]-1
    annual[year] = [spot, future]
ave = sum(math.log((1+v[1])/(1+v[0])) for y,v in annual.items() if 2004 <= int(y) <= 2025) / 22
emit('market-meta.js', 'marketMeta', {'counts':counts,'annual':annual,'averageLogCarry':ave,
                                   'earlyDividend': (16179.60/5551.24)**(1/35)-1})
for j in range(5):
    part = portfolio[j*3500:(j+1)*3500]
    assert len(part) < 4000
    (out/f'data{j}.js').write_text('window.marketData.push(...'+json.dumps(part,separators=(',', ':'))+');\n')
assert len(portfolio) <= 17500
print('Trading dates:', len(portfolio), 'TAIEX total-return prints:', len(index), 'futures marks:', len(tx),
      '0050:', len(etf),'00631L:',len(lever),'average one-exposure log carry:', ave)
