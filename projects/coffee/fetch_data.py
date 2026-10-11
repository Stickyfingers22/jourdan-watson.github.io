"""
The World Runs on Coffee — data pipeline
========================================
Downloads public coffee data and writes the tables the analysis uses.

Sources (free, no account needed):
  - USDA Foreign Agricultural Service, PSD database (coffee):
    https://apps.fas.usda.gov/psdonline/downloads/psd_coffee_csv.zip
  - IMF global coffee prices, published on FRED:
    PCOFFOTMUSDM  Other Mild Arabicas, US cents per pound, monthly
    PCOFFROBUSDM  Robustas, US cents per pound, monthly

Usage:
    pip install -r requirements.txt
    python fetch_data.py

Output (./data/):
    supply.csv          one row per country per market year
    price_monthly.csv   monthly arabica and robusta prices
    summary_stats.json  numbers used on the project page
"""

import io
import json
import os
import zipfile

import pandas as pd
import requests

OUT = "data"
os.makedirs(OUT, exist_ok=True)

PSD_URL = "https://apps.fas.usda.gov/psdonline/downloads/psd_coffee_csv.zip"
FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}"
HEADERS = {"User-Agent": "coffee-portfolio-project/1.0"}

# PSD attribute names -> our column names (values are in thousand 60 kg bags)
ATTRS = {
    "Production": "production_kb",
    "Arabica Production": "arabica_kb",
    "Robusta Production": "robusta_kb",
    "Bean Exports": "bean_exports_kb",
    "Roast & Ground Exports": "rg_exports_kb",
    "Soluble Exports": "soluble_exports_kb",
    "Domestic Consumption": "consumption_kb",
}

# Names to ISO-3 for the countries the page and SQL refer to
ISO3 = {
    "Brazil": "BRA", "Vietnam": "VNM", "Colombia": "COL", "Indonesia": "IDN",
    "Ethiopia": "ETH", "Uganda": "UGA", "India": "IND", "Honduras": "HND",
    "Peru": "PER", "Mexico": "MEX", "United States": "USA", "Japan": "JPN",
    "European Union": "EUU", "Philippines": "PHL", "Canada": "CAN",
}


def fetch_supply() -> pd.DataFrame:
    print("Downloading USDA PSD coffee data...")
    r = requests.get(PSD_URL, headers=HEADERS, timeout=120)
    r.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        raw = pd.read_csv(z.open(name))

    raw = raw[raw["Attribute_Description"].isin(ATTRS)]
    wide = (raw.pivot_table(index=["Country_Name", "Market_Year"],
                            columns="Attribute_Description",
                            values="Value", aggfunc="sum")
               .rename(columns=ATTRS)
               .reset_index()
               .rename(columns={"Country_Name": "country_name",
                                "Market_Year": "market_year"}))

    for col in ATTRS.values():
        if col not in wide:
            wide[col] = 0
    wide = wide.fillna(0)
    wide["exports_kb"] = (wide["bean_exports_kb"] + wide["rg_exports_kb"]
                          + wide["soluble_exports_kb"])
    wide["country_code"] = wide["country_name"].map(ISO3).fillna(
        wide["country_name"].str[:3].str.upper())

    cols = ["country_code", "country_name", "market_year", "production_kb",
            "arabica_kb", "robusta_kb", "exports_kb", "consumption_kb"]
    wide = wide[cols].sort_values(["market_year", "production_kb"],
                                  ascending=[True, False])
    print(f"  {wide['country_name'].nunique()} countries, "
          f"{wide['market_year'].min()}-{wide['market_year'].max()}")
    return wide


def fetch_fred(series: str) -> pd.Series:
    print(f"Downloading FRED series {series}...")
    r = requests.get(FRED_URL.format(series=series), headers=HEADERS, timeout=60)
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text))
    date_col = df.columns[0]           # 'observation_date' or 'DATE'
    df[date_col] = pd.to_datetime(df[date_col])
    s = pd.to_numeric(df[series], errors="coerce")
    s.index = df[date_col]
    return s.dropna()


def main() -> None:
    supply = fetch_supply()
    supply.to_csv(f"{OUT}/supply.csv", index=False)

    price = pd.DataFrame({
        "arabica_c_lb": fetch_fred("PCOFFOTMUSDM"),
        "robusta_c_lb": fetch_fred("PCOFFROBUSDM"),
    })
    price.index.name = "date"
    price.to_csv(f"{OUT}/price_monthly.csv")

    # ── Summary numbers for the page ──────────────────────────
    last_full = supply.groupby("market_year")["production_kb"].sum()
    last_full = last_full[last_full > 0].index.max()
    yr = supply[(supply["market_year"] == last_full)
                & (supply["country_name"] != "European Union")]
    total = yr["production_kb"].sum()
    top = yr.nlargest(10, "production_kb")

    annual = price["arabica_c_lb"].resample("YS").mean()

    stats = {
        "market_year": int(last_full),
        "world_production_m_bags": round(total / 1000, 1),
        "top_producers": [
            {"country": r.country_name,
             "m_bags": round(r.production_kb / 1000, 1),
             "share_pct": round(100 * r.production_kb / total, 1)}
            for r in top.itertuples()
        ],
        "top5_share_pct": round(100 * top.head(5)["production_kb"].sum() / total, 1),
        "arabica_annual_avg_c_lb": {str(d.year): round(v, 1)
                                    for d, v in annual.items() if d.year >= 2010},
        "arabica_max_month": {
            "date": price["arabica_c_lb"].idxmax().strftime("%Y-%m"),
            "c_lb": round(price["arabica_c_lb"].max(), 1),
        },
    }
    with open(f"{OUT}/summary_stats.json", "w") as f:
        json.dump(stats, f, indent=2)

    print("\nSUMMARY")
    print(f"  Market year {stats['market_year']}: "
          f"{stats['world_production_m_bags']}M bags")
    print(f"  Top 5 share: {stats['top5_share_pct']}%")
    for p in stats["top_producers"][:5]:
        print(f"    {p['country']:<12} {p['m_bags']:>6}M  {p['share_pct']}%")
    m = stats["arabica_max_month"]
    print(f"  Highest monthly arabica price: {m['c_lb']} c/lb in {m['date']}")
    print(f"\nSaved supply.csv, price_monthly.csv, summary_stats.json to ./{OUT}/")
    print("Swap these numbers into the chart arrays in index.html to use exact values.")


if __name__ == "__main__":
    main()
