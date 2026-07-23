"""Substance catalog. Two families: ideal gases (constant cp) and real fluids (CoolProp)."""

RU = 8.314462618  # universal gas constant J/mol/K

# Ideal gases: M [g/mol], cp [J/kg/K] near 300 K, family
IDEAL_GASES = {
    "Air":      {"name": {"it": "Aria", "en": "Air"}, "M": 28.97, "cp": 1005.0, "atomicity": "diatomic"},
    "N2":       {"name": {"it": "Azoto (N₂)", "en": "Nitrogen (N₂)"}, "M": 28.013, "cp": 1039.0, "atomicity": "diatomic"},
    "O2":       {"name": {"it": "Ossigeno (O₂)", "en": "Oxygen (O₂)"}, "M": 31.999, "cp": 918.0, "atomicity": "diatomic"},
    "CO2":      {"name": {"it": "Anidride carbonica (CO₂)", "en": "Carbon dioxide (CO₂)"}, "M": 44.01, "cp": 846.0, "atomicity": "polyatomic"},
    "H2":       {"name": {"it": "Idrogeno (H₂)", "en": "Hydrogen (H₂)"}, "M": 2.016, "cp": 14307.0, "atomicity": "diatomic"},
    "He":       {"name": {"it": "Elio (He)", "en": "Helium (He)"}, "M": 4.0026, "cp": 5193.0, "atomicity": "monatomic"},
    "Ar":       {"name": {"it": "Argon (Ar)", "en": "Argon (Ar)"}, "M": 39.948, "cp": 520.3, "atomicity": "monatomic"},
    "CH4":      {"name": {"it": "Metano (CH₄)", "en": "Methane (CH₄)"}, "M": 16.043, "cp": 2220.0, "atomicity": "polyatomic"},
    "CO":       {"name": {"it": "Monossido di carbonio (CO)", "en": "Carbon monoxide (CO)"}, "M": 28.01, "cp": 1040.0, "atomicity": "diatomic"},
    "Steam_ig": {"name": {"it": "Vapore acqueo (gas ideale)", "en": "Water vapor (ideal gas)"}, "M": 18.015, "cp": 1872.0, "atomicity": "polyatomic"},
}

# Real fluids handled by CoolProp. key -> CoolProp fluid name
REAL_FLUIDS = {
    "Water":     {"name": {"it": "Acqua / Vapore", "en": "Water / Steam"}, "coolprop": "Water"},
    "R134a":     {"name": {"it": "R-134a", "en": "R-134a"}, "coolprop": "R134a"},
    "R22":       {"name": {"it": "R-22", "en": "R-22"}, "coolprop": "R22"},
    "R410A":     {"name": {"it": "R-410A", "en": "R-410A"}, "coolprop": "R410A"},
    "Ammonia":   {"name": {"it": "Ammoniaca (R-717)", "en": "Ammonia (R-717)"}, "coolprop": "Ammonia"},
    "CO2_real":  {"name": {"it": "Anidride carbonica (R-744)", "en": "Carbon dioxide (R-744)"}, "coolprop": "CO2"},
    "Propane":   {"name": {"it": "Propano (R-290)", "en": "Propane (R-290)"}, "coolprop": "n-Propane"},
    "Nitrogen":  {"name": {"it": "Azoto (reale)", "en": "Nitrogen (real)"}, "coolprop": "Nitrogen"},
}


def ideal_props(key):
    g = IDEAL_GASES[key]
    R = RU / (g["M"] / 1000.0)          # J/kg/K
    cp = g["cp"]
    cv = cp - R
    gamma = cp / cv
    return {"R": R, "cp": cp, "cv": cv, "gamma": gamma, "M": g["M"], "atomicity": g["atomicity"]}


def list_substances():
    ideal = [{"key": k, "name": v["name"], "atomicity": v["atomicity"], "M": v["M"]}
             for k, v in IDEAL_GASES.items()]
    real = [{"key": k, "name": v["name"], "coolprop": v["coolprop"]}
            for k, v in REAL_FLUIDS.items()]
    return {"ideal_gas": ideal, "real": real}
