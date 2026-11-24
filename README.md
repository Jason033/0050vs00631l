# 台股正二回測

[開啟網站](https://jason033.github.io/0050vs00631l/)

1967/01/05–2026/11/23 台股日資料，支援日期、定期定額、0050／正二／現金配置及再平衡。

正二資料分段：

- 2014/10 後：00631L 還原實盤。
- 1998/07–2014/10：台指期日結算 ×2，加央行 RP 現金收益，扣管理與保管費。
- 1967–1998/07：含息大盤日報酬 ×2，扣央行同年代短率及費用。

早期股息改採多段論文校準，不再把單一股息率套用 35 年；期貨上市前也不再用 2003 年後的平均價差回填。

- [資料與驗證](research/AUDIT.md)
- [外部回測對照](research/EXTERNAL_COMPARISONS.md)
- [資料來源與重建](research/SOURCES.md)

驗證：`node research/audit.cjs && node research/audit-early.cjs`
