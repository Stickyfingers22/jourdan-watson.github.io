"""
Delta Flight Delay Analytics — Data Pipeline
=============================================
Downloads real BTS On-Time Performance data directly from the
Bureau of Transportation Statistics (transtats.bts.gov).

Usage:
    pip install requests pandas numpy tqdm
    python fetch_data.py

Output:
    data/bts_ontime_delta.csv       — cleaned Delta flights
    data/summary_stats.json         — pre-computed chart values
"""

import os
import io
import json
import zipfile
import requests
import pandas as pd
import numpy as np
from tqdm import tqdm

# ── CONFIG ────────────────────────────────────────────────────
YEARS  = [2022, 2023]          # Change to [2019,2020,2021,2022,2023] for full dataset
MONTHS = list(range(1, 13))    # All 12 months
OUT_DIR = "data"
os.makedirs(OUT_DIR, exist_ok=True)

# BTS download URL pattern
# Source: https://www.transtats.bts.gov/DL_SelectFields.aspx
BTS_URL = (
    "https://transtats.bts.gov/PREZIP/"
    "On_Time_Reporting_Carrier_On_Time_Performance_1987_present_"
    "{year}_{month}.zip"
)

COLUMNS_NEEDED = [
    "FlightDate", "Reporting_Airline", "Flight_Number_Reporting_Airline",
    "Origin", "Dest", "CRSDepTime", "DepDelay", "DepDel15",
    "ArrDelay", "ArrDel15", "Cancelled", "Diverted",
    "CarrierDelay", "WeatherDelay", "NASDelay",
    "SecurityDelay", "LateAircraftDelay",
    "CRSElapsedTime", "Distance"
]

# ── STEP 1: DOWNLOAD ─────────────────────────────────────────
def download_month(year, month):
    url = BTS_URL.format(year=year, month=month)
    print(f"  Downloading {year}-{month:02d}...", end=" ")
    try:
        r = requests.get(url, timeout=120)
        r.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            csv_name = [n for n in z.namelist() if n.endswith('.csv')][0]
            with z.open(csv_name) as f:
                df = pd.read_csv(f, usecols=lambda c: c in COLUMNS_NEEDED,
                                 low_memory=False)
        print(f"✓ {len(df):,} rows")
        return df
    except Exception as e:
        print(f"✗ Failed: {e}")
        return None

print("=" * 60)
print("BTS On-Time Performance Data Downloader")
print("=" * 60)

frames = []
for year in YEARS:
    print(f"\nYear {year}:")
    for month in MONTHS:
        df = download_month(year, month)
        if df is not None:
            frames.append(df)

raw = pd.concat(frames, ignore_index=True)
print(f"\nTotal raw records: {len(raw):,}")

# ── STEP 2: FILTER TO DELTA ──────────────────────────────────
print("\nFiltering to Delta Air Lines (DL)...")
delta = raw[raw["Reporting_Airline"] == "DL"].copy()
print(f"Delta records: {len(delta):,}")

# ── STEP 3: CLEAN ────────────────────────────────────────────
print("Cleaning...")

delta["FlightDate"] = pd.to_datetime(delta["FlightDate"])
delta = delta[delta["Cancelled"] == 0].copy()        # Remove cancellations
delta = delta.dropna(subset=["DepDelay"])            # Need departure delay

# Fill delay cause NaNs with 0 (non-delayed flights have null causes)
cause_cols = ["CarrierDelay","WeatherDelay","NASDelay","SecurityDelay","LateAircraftDelay"]
delta[cause_cols] = delta[cause_cols].fillna(0)

# Derived features
delta["dep_hour"]    = delta["CRSDepTime"] // 100
delta["month"]       = delta["FlightDate"].dt.month
delta["day_of_week"] = delta["FlightDate"].dt.dayofweek
delta["is_weekend"]  = delta["day_of_week"].isin([5, 6]).astype(int)
delta["is_delayed"]  = (delta["DepDelay"] > 15).astype(int)
delta["season"]      = pd.cut(delta["month"],
                               bins=[0,3,6,9,12],
                               labels=["Q1 Winter","Q2 Spring","Q3 Summer","Q4 Fall"])

print(f"Clean records: {len(delta):,}")
print(f"Overall delay rate: {delta['is_delayed'].mean():.1%}")

# Save cleaned data
out_path = f"{OUT_DIR}/bts_ontime_delta.csv"
delta.to_csv(out_path, index=False)
print(f"Saved: {out_path}")

# ── STEP 4: COMPUTE SUMMARY STATS FOR CHARTS ─────────────────
print("\nComputing summary statistics for charts...")

stats = {}

# --- Delay cause breakdown ---
total_delay_mins = delta[cause_cols].sum().sum()
stats["cause_breakdown"] = {
    cause.replace("Delay","").replace("LateAircraft","Late Aircraft").strip(): {
        "minutes": int(delta[cause].sum()),
        "pct":     round(delta[cause].sum() / total_delay_mins * 100, 1)
    }
    for cause in cause_cols
}

# --- Monthly delay rate ---
monthly = (delta.groupby("month")
               .agg(delay_rate=("is_delayed","mean"),
                    avg_delay=("DepDelay", lambda x: x[x>0].mean()))
               .reset_index())
month_names = ["Jan","Feb","Mar","Apr","May","Jun",
               "Jul","Aug","Sep","Oct","Nov","Dec"]
stats["monthly"] = {
    "months":      month_names,
    "delay_rates": [round(r*100, 1) for r in monthly["delay_rate"].tolist()],
    "avg_delays":  [round(d, 1) for d in monthly["avg_delay"].tolist()]
}

# --- Airport rankings ---
airport_stats = (delta.groupby("Origin")
                      .agg(total=("DepDelay","count"),
                           delayed=("is_delayed","sum"),
                           avg_delay=("DepDelay", lambda x: x[x>0].mean()))
                      .reset_index())
airport_stats["delay_rate"] = airport_stats["delayed"] / airport_stats["total"]
airport_stats = airport_stats[airport_stats["total"] > 1000]  # meaningful volume
top10 = airport_stats.nlargest(10, "avg_delay")
stats["airports"] = {
    "codes":      top10["Origin"].tolist(),
    "avg_delays": [round(d, 1) for d in top10["avg_delay"].tolist()],
    "delay_rates":[round(r*100,1) for r in top10["delay_rate"].tolist()]
}

# --- Hour of day ---
hour_stats = (delta.groupby("dep_hour")
                   .agg(avg_delay=("DepDelay", lambda x: x[x>0].mean()),
                        delay_rate=("is_delayed","mean"))
                   .reset_index())
hour_stats = hour_stats[(hour_stats["dep_hour"] >= 5) & (hour_stats["dep_hour"] <= 22)]
stats["by_hour"] = {
    "hours":      hour_stats["dep_hour"].tolist(),
    "avg_delays": [round(d,1) for d in hour_stats["avg_delay"].tolist()],
    "delay_rates":[round(r*100,1) for r in hour_stats["delay_rate"].tolist()]
}

# --- Seasonal: weather vs late aircraft ---
seasonal = (delta.groupby("season")[["WeatherDelay","LateAircraftDelay"]]
                 .mean()
                 .reset_index())
stats["seasonal"] = {
    "seasons":       seasonal["season"].tolist(),
    "weather":       [round(d,1) for d in seasonal["WeatherDelay"].tolist()],
    "late_aircraft": [round(d,1) for d in seasonal["LateAircraftDelay"].tolist()]
}

# --- KPI summary ---
delayed_only = delta[delta["DepDelay"] > 15]
stats["kpi"] = {
    "total_flights":     len(delta),
    "total_delayed":     int(delta["is_delayed"].sum()),
    "delay_rate":        round(delta["is_delayed"].mean() * 100, 1),
    "avg_delay_mins":    round(delayed_only["DepDelay"].mean(), 1),
    "late_aircraft_pct": round(delta["LateAircraftDelay"].sum() / total_delay_mins * 100, 1),
    "top_cause":         max(stats["cause_breakdown"],
                             key=lambda k: stats["cause_breakdown"][k]["pct"])
}

# Save stats
stats_path = f"{OUT_DIR}/summary_stats.json"
with open(stats_path, "w") as f:
    json.dump(stats, f, indent=2)
print(f"Saved: {stats_path}")

# ── STEP 5: PRINT SUMMARY ────────────────────────────────────
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"Total Delta flights analyzed: {stats['kpi']['total_flights']:,}")
print(f"Overall delay rate:           {stats['kpi']['delay_rate']}%")
print(f"Avg delay (delayed flights):  {stats['kpi']['avg_delay_mins']} min")
print(f"Top delay cause:              {stats['kpi']['top_cause']}")
print(f"\nDelay cause breakdown:")
for cause, vals in stats["cause_breakdown"].items():
    bar = "█" * int(vals["pct"] / 2)
    print(f"  {cause:<20} {vals['pct']:>5.1f}%  {bar}")

print(f"\n✓ All files saved to ./{OUT_DIR}/")
print("✓ Update the project HTML to load from summary_stats.json")
print("  or connect the Python charts directly via Jupyter/Dash")
