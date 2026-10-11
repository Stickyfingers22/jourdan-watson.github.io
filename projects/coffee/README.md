# The World Runs on Coffee

A three-lens data project following coffee from farm to cup:

1. **Economy** — who grows coffee and what drives its price
2. **Industry** — how cafés turn a commodity into a $6 drink
3. **Caffeine** — how much people consume against the FDA's 400 mg guideline

## Data sources
| Source | What | Access |
|---|---|---|
| USDA FAS PSD | Production, exports, consumption by country | Free CSV download |
| IMF via FRED (`PCOFFOTMUSDM`, `PCOFFROBUSDM`) | Monthly arabica and robusta prices | Free CSV download |
| ICO, Starbucks 10-K, NCA, FDA | Per-capita use, store counts, drinking habits, caffeine guidance | Published reports |

Chart values on the page are approximate figures from these sources. The latte cost breakdown is an illustrative model.

## Run it
```bash
pip install -r requirements.txt
python fetch_data.py
```
Writes `data/supply.csv`, `data/price_monthly.csv` and `data/summary_stats.json`.

## Methods
- SQL: star schema, CTEs, `RANK`, `DENSE_RANK`, `LAG`, running totals, `CASE`
- Time series: ADF test, STL decomposition, damped Holt-Winters vs naive benchmark (MAPE)
- Regression: OLS of price returns on Brazilian output changes, Newey-West errors
- Clustering: K-means on scaled production, consumption and export ratio; k by silhouette; ANOVA
