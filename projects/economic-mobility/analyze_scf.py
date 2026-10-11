"""
Economic Mobility in Black America — SCF 2022 analysis
======================================================
Every number on the project page that comes from the Survey of Consumer
Finances is produced by this script.

Input:  SCFP2022.csv (Federal Reserve SCF 2022 summary extract)
Output: data/scf_results.json

Notes on the SCF:
- 4,595 households, each stored as 5 "implicates" (multiple imputation of
  missing answers), so the file has 22,975 rows.
- WGT is the population weight. Medians use all implicates with WGT,
  the same approach the Federal Reserve uses in its published tables.
- Regressions are run on each implicate separately and combined with
  Rubin's rules, so standard errors reflect imputation uncertainty.

Usage:
    pip install pandas numpy statsmodels scikit-learn
    python analyze_scf.py path/to/SCFP2022.csv
"""

import json
import os
import sys

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split

SRC = sys.argv[1] if len(sys.argv) > 1 else "SCFP2022.csv"
OUT = "data"
os.makedirs(OUT, exist_ok=True)

COLS = ["YY1", "Y1", "WGT", "RACE", "AGE", "HHSEX", "EDUC", "EDCL", "MARRIED",
        "KIDS", "LF", "INCOME", "NETWORTH", "HOUSECL", "HBUS", "HSTOCKS"]
df = pd.read_csv(SRC, usecols=COLS)
df["implicate"] = df["Y1"] % 10

RACE = {1: "White", 2: "Black", 3: "Hispanic", 4: "Asian/Other", 5: "Other"}
EDCL = {1: "No HS diploma", 2: "HS diploma", 3: "Some college / Assoc.", 4: "Bachelor's+"}
# SCF EDUC codes -> approximate years of schooling
EDUC_YEARS = {-1: 0, 1: 2.5, 2: 5.5, 3: 7.5, 4: 9, 5: 10, 6: 11, 7: 12, 8: 12,
              9: 13, 10: 14, 11: 14, 12: 16, 13: 18, 14: 20}

df["race"] = df["RACE"].map(RACE)
df["edu_group"] = df["EDCL"].map(EDCL)
df["educ_years"] = df["EDUC"].map(EDUC_YEARS)
df["black"] = (df["RACE"] == 2).astype(int)
df["female"] = (df["HHSEX"] == 2).astype(int)
df["married"] = (df["MARRIED"] == 1).astype(int)
df["homeowner"] = (df["HOUSECL"] == 1).astype(int)
df["working"] = (df["LF"] == 1).astype(int)
df["owns_business"] = (df["HBUS"] == 1).astype(int)
df["owns_stocks"] = (df["HSTOCKS"] == 1).astype(int)
df["bachelors"] = (df["EDCL"] == 4).astype(int)


def wmedian(values, weights):
    d = pd.DataFrame({"v": values, "w": weights}).dropna().sort_values("v")
    c = d["w"].cumsum()
    return float(d.loc[c >= d["w"].sum() / 2, "v"].iloc[0])


def wmean(values, weights):
    return float(np.average(values, weights=weights))


res = {"n_households": int(df["YY1"].nunique()), "n_rows": int(len(df))}

# ── 1. Median income and net worth by education, Black vs White ──
bw = df[df["RACE"].isin([1, 2])]
rows = []
for (race, edu), g in bw.groupby(["race", "edu_group"]):
    rows.append({"race": race, "edu_group": edu,
                 "median_income": round(wmedian(g["INCOME"], g["WGT"])),
                 "median_networth": round(wmedian(g["NETWORTH"], g["WGT"])),
                 "n_households": int(g["YY1"].nunique())})
res["by_education"] = rows

# ── 2. Headline medians by race ──
res["by_race"] = {
    RACE[r]: {"median_income": round(wmedian(g["INCOME"], g["WGT"])),
              "median_networth": round(wmedian(g["NETWORTH"], g["WGT"])),
              "homeownership_pct": round(100 * wmean(g["homeowner"], g["WGT"]), 1),
              "bachelors_pct": round(100 * wmean(g["bachelors"], g["WGT"]), 1),
              "stock_ownership_pct": round(100 * wmean(g["owns_stocks"], g["WGT"]), 1),
              "business_ownership_pct": round(100 * wmean(g["owns_business"], g["WGT"]), 1),
              "n_households": int(g["YY1"].nunique())}
    for r, g in df.groupby("RACE") if r in (1, 2, 3, 4)
}

# ── 3. Wealth by homeownership, Black vs White ──
res["networth_by_homeownership"] = [
    {"race": race, "homeowner": bool(h),
     "median_networth": round(wmedian(g["NETWORTH"], g["WGT"]))}
    for (race, h), g in bw.groupby(["race", "homeowner"])
]

# ── 4. OLS on log income with Rubin's rules ──
# Sample: household heads 25-64 with positive income, Black or White
reg = bw[(bw["AGE"].between(25, 64)) & (bw["INCOME"] > 0)].copy()
reg["log_income"] = np.log(reg["INCOME"])
reg["age_c"] = reg["AGE"] - 45
reg["age_c2"] = reg["age_c"] ** 2
reg["black_x_bachelors"] = reg["black"] * reg["bachelors"]
X_COLS = ["educ_years", "age_c", "age_c2", "female", "married", "homeowner",
          "working", "black", "black_x_bachelors"]


def rubin(models, names):
    m = len(models)
    est = np.array([md.params[names].values for md in models])
    var = np.array([md.bse[names].values ** 2 for md in models])
    qbar = est.mean(0)
    w = var.mean(0)
    b = est.var(0, ddof=1)
    t = w + (1 + 1 / m) * b
    se = np.sqrt(t)
    z = qbar / se
    from scipy.stats import norm
    p = 2 * (1 - norm.cdf(np.abs(z)))
    return pd.DataFrame({"coef": qbar, "se": se, "p": p}, index=names)


models, r2 = [], []
for i, g in reg.groupby("implicate"):
    X = sm.add_constant(g[X_COLS])
    md = sm.WLS(g["log_income"], X, weights=g["WGT"]).fit(cov_type="HC3")
    models.append(md)
    r2.append(md.rsquared)
names = ["const"] + X_COLS
tab = rubin(models, names)
tab["pct_effect"] = (np.exp(tab["coef"]) - 1) * 100
res["ols"] = {
    "sample_households": int(reg["YY1"].nunique()),
    "r2_mean": round(float(np.mean(r2)), 3),
    "coefficients": {k: {"coef": round(v.coef, 4), "se": round(v.se, 4),
                         "p": round(v.p, 4), "pct_effect": round(v.pct_effect, 1)}
                     for k, v in tab.iterrows()},
}

# ── 5. Random forest feature importance (Black households) ──
blk = reg[reg["black"] == 1]
F_COLS = ["educ_years", "AGE", "female", "married", "homeowner", "working",
          "KIDS", "owns_stocks", "owns_business"]
imps, test_r2 = [], []
for i, g in blk.groupby("implicate"):
    Xtr, Xte, ytr, yte, wtr, wte = train_test_split(
        g[F_COLS], g["log_income"], g["WGT"], test_size=0.25, random_state=42)
    rf = RandomForestRegressor(n_estimators=400, min_samples_leaf=10,
                               random_state=42, n_jobs=-1)
    rf.fit(Xtr, ytr, sample_weight=wtr)
    test_r2.append(rf.score(Xte, yte, sample_weight=wte))
    pi = permutation_importance(rf, Xte, yte, n_repeats=10, random_state=42,
                                sample_weight=wte)
    imps.append(pi.importances_mean)
imp = pd.Series(np.mean(imps, 0), index=F_COLS).sort_values(ascending=False)
res["rf"] = {"sample_households": int(blk["YY1"].nunique()),
             "test_r2_mean": round(float(np.mean(test_r2)), 3),
             "permutation_importance": {k: round(float(v), 4) for k, v in imp.items()}}

# ── 6. Correlations among Black households (one implicate) ──
one = blk[blk["implicate"] == 1].copy()
one["log_networth"] = np.sign(one["NETWORTH"]) * np.log1p(np.abs(one["NETWORTH"]))
corr_cols = ["log_income", "educ_years", "AGE", "homeowner", "married",
             "working", "owns_stocks", "log_networth"]
res["corr"] = {"cols": corr_cols,
               "matrix": one[corr_cols].corr().round(2).values.tolist()}

with open(f"{OUT}/scf_results.json", "w") as f:
    json.dump(res, f, indent=2)

print(json.dumps({k: res[k] for k in ["n_households", "by_race"]}, indent=2))
print(tab.round(4))
print("R2 mean:", res["ols"]["r2_mean"], "| RF test R2:", res["rf"]["test_r2_mean"])
print(imp.round(4))
