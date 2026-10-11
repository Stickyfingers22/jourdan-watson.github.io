"""
Economic Mobility in Black America — Data Processing Pipeline
=============================================================
Processes two uploaded datasets:
  1. Opportunity Atlas (shown_cz_kfr_rP_gP_pall.csv)
  2. Federal Reserve SCF 2022 (SCFP2022.csv)

Usage:
    pip install pandas numpy
    python clean_data.py

Output:
    data/summary_stats.json     — chart-ready stats
    data/atlas_clean.csv        — cleaned mobility data
    data/scf_clean.csv          — cleaned wealth data
"""

import os, json
import pandas as pd
import numpy as np

os.makedirs('data', exist_ok=True)

# ── HELPER ────────────────────────────────────────────────────
def weighted_median(data, weights):
    df = pd.DataFrame({'val': data, 'wgt': weights}).dropna().sort_values('val')
    cumsum = df['wgt'].cumsum()
    cutoff  = df['wgt'].sum() / 2.0
    return float(df['val'][cumsum >= cutoff].iloc[0])

# ── 1. OPPORTUNITY ATLAS ──────────────────────────────────────
print("Processing Opportunity Atlas...")
atlas = pd.read_csv('shown_cz_kfr_rP_gP_pall.csv')
atlas.columns = ['cz', 'name', 'household_income_p35']
atlas = atlas.dropna()
atlas['household_income_p35'] = atlas['household_income_p35'].astype(float)

atlas_clean = atlas.sort_values('household_income_p35', ascending=False).reset_index(drop=True)
atlas_clean['rank'] = atlas_clean.index + 1
atlas_clean['percentile'] = (atlas_clean['household_income_p35']
                              .rank(pct=True) * 100).round(1)

atlas_clean.to_csv('data/atlas_clean.csv', index=False)
print(f"  Saved {len(atlas_clean)} commuting zones")

top10  = atlas_clean.nlargest(10, 'household_income_p35')[['name','household_income_p35']]
bot10  = atlas_clean.nsmallest(10,'household_income_p35')[['name','household_income_p35']]

# ── 2. SCF 2022 ───────────────────────────────────────────────
print("Processing Federal Reserve SCF 2022...")
scf_cols = ['RACE','NETWORTH','INCOME','WAGEINC','EDUC','AGE','HHSEX','WGT']
scf = pd.read_csv('SCFP2022.csv', usecols=scf_cols)

# RACE: 1=White, 2=Black, 3=Hispanic, 4=Asian/Other
race_map = {1:'White', 2:'Black', 3:'Hispanic', 4:'Asian/Other'}
scf['race_label'] = scf['RACE'].map(race_map)
scf_clean = scf[scf['race_label'].notna()].copy()

# Compute weighted stats by race
wealth = {}
for code, label in [(1,'White'),(2,'Black'),(3,'Hispanic'),(4,'Asian/Other')]:
    sub = scf_clean[scf_clean['RACE'] == code]
    wealth[label] = {
        'n':               len(sub),
        'median_networth': round(weighted_median(sub['NETWORTH'], sub['WGT'])),
        'mean_networth':   round((sub['NETWORTH']*sub['WGT']).sum() / sub['WGT'].sum()),
        'median_income':   round(weighted_median(sub['INCOME'],   sub['WGT'])),
        'mean_income':     round((sub['INCOME']*sub['WGT']).sum()   / sub['WGT'].sum()),
    }

# Education breakdown for Black households
educ_map = {1:'No HS', 2:'No HS', 3:'HS Diploma', 4:'Some College',
            5:'Some College', 6:"Bachelor's", 7:'Graduate', 8:'Graduate'}
black = scf_clean[scf_clean['RACE'] == 2].copy()
black['educ_label'] = black['EDUC'].map(educ_map)
educ_income = (black.groupby('educ_label')
                    .apply(lambda g: weighted_median(g['INCOME'], g['WGT']))
                    .reset_index())
educ_income.columns = ['educ_level','median_income']

scf_clean.to_csv('data/scf_clean.csv', index=False)
print(f"  Saved {len(scf_clean)} SCF households")

# ── 3. SAVE SUMMARY STATS ─────────────────────────────────────
stats = {
    'wealth_by_race': wealth,
    'top_metros':  top10.rename(columns={'household_income_p35':'income'}).to_dict('records'),
    'bottom_metros': bot10.rename(columns={'household_income_p35':'income'}).to_dict('records'),
    'atlas_stats': {
        'mean':    round(atlas_clean['household_income_p35'].mean()),
        'median':  round(atlas_clean['household_income_p35'].median()),
        'min':     round(atlas_clean['household_income_p35'].min()),
        'max':     round(atlas_clean['household_income_p35'].max()),
        'n_zones': len(atlas_clean)
    },
    'black_educ_income': educ_income.to_dict('records')
}

with open('data/summary_stats.json', 'w') as f:
    json.dump(stats, f, indent=2)

# ── 4. PRINT SUMMARY ──────────────────────────────────────────
print("\n" + "="*60)
print("WEALTH BY RACE (SCF 2022, Weighted Medians)")
print("="*60)
for race, vals in wealth.items():
    print(f"  {race:<15} NW: ${vals['median_networth']:>10,}  Income: ${vals['median_income']:>8,}")

white_nw = wealth['White']['median_networth']
black_nw = wealth['Black']['median_networth']
print(f"\n  White/Black wealth ratio: {white_nw/black_nw:.1f}x")

print("\nOPPORTUNITY ATLAS — Income Range at 35")
print(f"  Best CZ:   {top10.iloc[0]['name']} — ${top10.iloc[0]['household_income_p35']:,.0f}")
print(f"  Worst CZ:  {bot10.iloc[0]['name']} — ${bot10.iloc[0]['household_income_p35']:,.0f}")
print(f"  Gap ratio: {top10.iloc[0]['household_income_p35']/bot10.iloc[0]['household_income_p35']:.1f}x")

print("\n✓ All files saved to ./data/")
print("✓ Use summary_stats.json to update chart values in index.html")
