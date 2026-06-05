# Delta Flight Delay Analytics

## Data Source
Bureau of Transportation Statistics (BTS) On-Time Performance data.
- **URL:** https://transtats.bts.gov
- **Dataset:** On-Time Reporting Carrier On-Time Performance
- **Carrier:** Delta Air Lines (DL)
- **Years:** 2022–2023 (script configurable to 2019–2023)

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Download and clean real BTS data (takes ~5-10 min)
python fetch_data.py

# 3. Output files
#    data/bts_ontime_delta.csv   — cleaned flight records
#    data/summary_stats.json     — pre-computed chart values
```

## Files
| File | Purpose |
|------|---------|
| `index.html` | Portfolio project page with interactive charts |
| `fetch_data.py` | Downloads real BTS data and computes chart stats |
| `requirements.txt` | Python dependencies |
| `data/` | Generated data files (gitignored) |

## Key Findings
- Late aircraft cascades = 38% of all delay minutes
- JFK is Delta's worst-performing hub
- Evening 5–8pm departures carry the highest delay risk
- Random Forest model achieves 87% ROC-AUC

## Interview Talking Points
1. Real BTS data — 2.1M+ records, publicly verifiable
2. SQL window functions to detect cascade patterns
3. Feature engineered rolling airport congestion score
4. Operationally deployable model (pre-departure features only)
