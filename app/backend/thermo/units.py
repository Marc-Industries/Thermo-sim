"""Unit conversion helpers. Internal storage is always SI base:
P [Pa], T [K], v [m3/kg], h/u [J/kg], s [J/kg/K]."""

# ---- Pressure: factor to Pa, plus offset (none) ----
PRESSURE = {
    "Pa": 1.0,
    "kPa": 1e3,
    "MPa": 1e6,
    "bar": 1e5,
    "atm": 101325.0,
    "psi": 6894.757293168,
}

# ---- Specific energy: factor to J/kg ----
ENERGY = {
    "J/kg": 1.0,
    "kJ/kg": 1e3,
}

# ---- Specific entropy: factor to J/kg/K ----
ENTROPY = {
    "J/kg.K": 1.0,
    "kJ/kg.K": 1e3,
}

VOLUME = {
    "m3/kg": 1.0,
    "L/kg": 1e-3,
    "cm3/g": 1e-3,
}


def temp_to_SI(value, unit):
    if unit == "K":
        return value
    if unit == "C":
        return value + 273.15
    if unit == "F":
        return (value - 32.0) * 5.0 / 9.0 + 273.15
    raise ValueError(f"Unknown temperature unit {unit}")


def temp_from_SI(value_K, unit):
    if unit == "K":
        return value_K
    if unit == "C":
        return value_K - 273.15
    if unit == "F":
        return (value_K - 273.15) * 9.0 / 5.0 + 32.0
    raise ValueError(f"Unknown temperature unit {unit}")


def to_SI(value, unit, kind):
    if kind == "P":
        return value * PRESSURE[unit]
    if kind == "T":
        return temp_to_SI(value, unit)
    if kind == "v":
        return value * VOLUME[unit]
    if kind in ("h", "u"):
        return value * ENERGY[unit]
    if kind == "s":
        return value * ENTROPY[unit]
    if kind == "x":
        return value
    raise ValueError(kind)


def from_SI(value, unit, kind):
    if value is None:
        return None
    if kind == "P":
        return value / PRESSURE[unit]
    if kind == "T":
        return temp_from_SI(value, unit)
    if kind == "v":
        return value / VOLUME[unit]
    if kind in ("h", "u"):
        return value / ENERGY[unit]
    if kind == "s":
        return value / ENTROPY[unit]
    if kind == "x":
        return value
    raise ValueError(kind)


# Default unit systems presented to the user
UNIT_SYSTEMS = {
    "SI_kJ": {"P": "kPa", "T": "K", "v": "m3/kg", "h": "kJ/kg", "u": "kJ/kg", "s": "kJ/kg.K"},
    "SI_C_bar": {"P": "bar", "T": "C", "v": "m3/kg", "h": "kJ/kg", "u": "kJ/kg", "s": "kJ/kg.K"},
    "SI_MPa": {"P": "MPa", "T": "C", "v": "m3/kg", "h": "kJ/kg", "u": "kJ/kg", "s": "kJ/kg.K"},
    "Imperial_like": {"P": "psi", "T": "F", "v": "m3/kg", "h": "kJ/kg", "u": "kJ/kg", "s": "kJ/kg.K"},
}


def convert_state_from_SI(state_si, units):
    """state_si: dict with SI keys P,T,v,h,u,s,x. Returns converted dict."""
    out = {}
    for k in ("P", "T", "v", "h", "u", "s"):
        out[k] = from_SI(state_si.get(k), units.get(k), k)
    out["x"] = state_si.get("x")
    out["phase"] = state_si.get("phase")
    out["phase_key"] = state_si.get("phase_key")
    return out
