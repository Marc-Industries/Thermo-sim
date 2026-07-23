"""Thermodynamic state computation for ideal gases and real fluids (CoolProp)."""
import math
from CoolProp.CoolProp import PropsSI, PhaseSI
from .substances import ideal_props, REAL_FLUIDS

TREF = 298.15      # K  ideal-gas reference
PREF = 101325.0    # Pa

PHASE_MAP = {
    "liquid": {"it": "Liquido sottoraffreddato", "en": "Subcooled liquid", "key": "liquid"},
    "supercritical_liquid": {"it": "Liquido supercritico", "en": "Supercritical liquid", "key": "supercritical"},
    "supercritical": {"it": "Fluido supercritico", "en": "Supercritical fluid", "key": "supercritical"},
    "supercritical_gas": {"it": "Vapore surriscaldato", "en": "Superheated vapor", "key": "gas"},
    "gas": {"it": "Vapore surriscaldato", "en": "Superheated vapor", "key": "gas"},
    "twophase": {"it": "Miscela bifase (liquido-vapore)", "en": "Two-phase mixture (liquid-vapor)", "key": "twophase"},
    "saturated_liquid": {"it": "Liquido saturo", "en": "Saturated liquid", "key": "twophase"},
    "saturated_vapor": {"it": "Vapore saturo secco", "en": "Saturated vapor", "key": "twophase"},
}


# -------------------- IDEAL GAS --------------------
def ideal_state(key, prop1, prop2):
    """prop* = {name, value} in SI. Accepts any two independent of P,T,v,h,u,s."""
    p = ideal_props(key)
    R, cp, cv = p["R"], p["cp"], p["cv"]
    props = {prop1["name"]: prop1["value"], prop2["name"]: prop2["value"]}

    # First resolve T
    T = props.get("T")
    if T is None:
        if "h" in props:
            T = TREF + props["h"] / cp
        elif "u" in props:
            T = TREF + props["u"] / cv
        elif "P" in props and "v" in props:
            T = props["P"] * props["v"] / R
    # Resolve P
    P = props.get("P")
    v = props.get("v")
    if P is None and v is not None and T is not None:
        P = R * T / v
    # If we have P & s -> T ; s & v etc. Handle s-based
    if T is None and "s" in props:
        s = props["s"]
        if "P" in props:
            # s = cp ln(T/Tref) - R ln(P/Pref)
            T = TREF * math.exp((s + R * math.log(props["P"] / PREF)) / cp)
            P = props["P"]
        elif "v" in props:
            # s = cv ln(T/Tref) + R ln(v/vref), vref = R Tref/Pref
            vref = R * TREF / PREF
            T = TREF * math.exp((s - R * math.log(props["v"] / vref)) / cv)
    if T is None:
        raise ValueError("Coppia di proprietà non risolvibile per gas ideale")
    if P is None and v is not None:
        P = R * T / v
    if P is None and "P" in props:
        P = props["P"]
    if P is None:
        raise ValueError("Impossibile determinare la pressione")
    if v is None:
        v = R * T / P

    h = cp * (T - TREF)
    u = cv * (T - TREF)
    s = cp * math.log(T / TREF) - R * math.log(P / PREF)
    return {
        "P": P, "T": T, "v": v, "h": h, "u": u, "s": s, "x": None,
        "phase": {"it": "Gas ideale", "en": "Ideal gas"}, "phase_key": "ideal",
        "R": R, "cp": cp, "cv": cv, "gamma": p["gamma"],
    }


# -------------------- REAL FLUID (CoolProp) --------------------
_CP_INPUT = {"P": "P", "T": "T", "h": "H", "u": "U", "s": "S", "x": "Q"}


def _cp_pair(name, value):
    if name == "v":
        return "D", 1.0 / value
    return _CP_INPUT[name], value


def real_state(key, prop1, prop2):
    fluid = REAL_FLUIDS[key]["coolprop"]
    n1, v1 = _cp_pair(prop1["name"], prop1["value"])
    n2, v2 = _cp_pair(prop2["name"], prop2["value"])

    P = PropsSI("P", n1, v1, n2, v2, fluid)
    T = PropsSI("T", n1, v1, n2, v2, fluid)
    D = PropsSI("D", n1, v1, n2, v2, fluid)
    h = PropsSI("H", n1, v1, n2, v2, fluid)
    u = PropsSI("U", n1, v1, n2, v2, fluid)
    s = PropsSI("S", n1, v1, n2, v2, fluid)
    Q = PropsSI("Q", n1, v1, n2, v2, fluid)

    x = None
    if 0.0 <= Q <= 1.0:
        x = Q
        phase_str = "twophase"
    else:
        try:
            phase_str = PhaseSI(n1, v1, n2, v2, fluid)
        except Exception:
            phase_str = "gas"
    phase = PHASE_MAP.get(phase_str, {"it": phase_str, "en": phase_str, "key": phase_str})
    return {
        "P": P, "T": T, "v": 1.0 / D, "h": h, "u": u, "s": s, "x": x,
        "phase": {"it": phase["it"], "en": phase["en"]}, "phase_key": phase["key"],
    }


def fluid_meta(key):
    """Critical & triple point info for real fluids."""
    fluid = REAL_FLUIDS[key]["coolprop"]
    meta = {
        "Tcrit": PropsSI("Tcrit", fluid),
        "Pcrit": PropsSI("Pcrit", fluid),
    }
    try:
        meta["Ttriple"] = PropsSI("Ttriple", fluid)
        meta["Ptriple"] = PropsSI("ptriple", fluid)
    except Exception:
        pass
    return meta


def compute_state(model, key, prop1, prop2):
    if model == "ideal_gas":
        return ideal_state(key, prop1, prop2)
    return real_state(key, prop1, prop2)
