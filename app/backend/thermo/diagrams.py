"""Diagram data generators: saturation dome for real fluids, process paths."""
import numpy as np
from CoolProp.CoolProp import PropsSI
from .substances import REAL_FLUIDS, ideal_props
from .state import TREF, PREF

# axis -> (x_key, y_key)
DIAGRAMS = {
    "Pv": ("v", "P"),
    "Ts": ("s", "T"),
    "Ph": ("h", "P"),
    "hs": ("s", "h"),
    "Tv": ("v", "T"),
    "PT": ("T", "P"),
}


def saturation_dome(key, n=80):
    """Return liquid & vapor saturation lines in SI for a real fluid."""
    fluid = REAL_FLUIDS[key]["coolprop"]
    Tt = PropsSI("Ttriple", fluid)
    Tc = PropsSI("Tcrit", fluid)
    Ts = np.linspace(Tt + 0.5, Tc - 0.5, n)
    liq, vap = [], []
    for T in Ts:
        try:
            for Q, arr in ((0.0, liq), (1.0, vap)):
                P = PropsSI("P", "T", T, "Q", Q, fluid)
                D = PropsSI("D", "T", T, "Q", Q, fluid)
                h = PropsSI("H", "T", T, "Q", Q, fluid)
                s = PropsSI("S", "T", T, "Q", Q, fluid)
                arr.append({"P": P, "T": T, "v": 1.0 / D, "h": h, "s": s})
        except Exception:
            continue
    # critical point
    Pc = PropsSI("Pcrit", fluid)
    Dc = PropsSI("rhocrit", fluid)
    hc = PropsSI("H", "T", Tc, "D", Dc, fluid)
    sc = PropsSI("S", "T", Tc, "D", Dc, fluid)
    crit = {"P": Pc, "T": Tc, "v": 1.0 / Dc, "h": hc, "s": sc}
    return {"liquid": liq, "vapor": vap, "critical": crit}


def process_path(model, key, s1, s2, process, n=40):
    """Generate intermediate SI states along a process between two computed states."""
    pts = []
    if model == "ideal_gas":
        p = ideal_props(key)
        R, cp, cv, g = p["R"], p["cp"], p["cv"], p["gamma"]
        P1, v1, T1 = s1["P"], s1["v"], s1["T"]
        P2, v2, T2 = s2["P"], s2["v"], s2["T"]

               def emit(P, T):
            v = R * T / P
            h = cp * (T - TREF)
            u = cv * (T - TREF)
            s = cp * np.log(T / TREF) - R * np.log(P / PREF)
            pts.append({"P": P, "T": T, "v": v, "h": h, "u": u, "s": s})

        if process == "isochoric":
            for T in np.linspace(T1, T2, n):
                emit(R * T / v1, T)
        elif process == "isobaric":
            for v in np.linspace(v1, v2, n):
                emit(P1, P1 * v / R)
        elif process == "isothermal":
            for v in np.linspace(v1, v2, n):
                emit(R * T1 / v, T1)
        elif process in ("isentropic", "adiabatic"):
            for v in np.linspace(v1, v2, n):
                P = P1 * (v1 / v) ** g
                emit(P, P * v / R)
        else:  # polytropic: derive n from the two endpoints
            nexp = np.log(P2 / P1) / np.log(v1 / v2) if abs(v1 - v2) > 1e-12 else g
            for v in np.linspace(v1, v2, n):
                P = P1 * (v1 / v) ** nexp
                emit(P, P * v / R)
    else:
        fluid = REAL_FLUIDS[key]["coolprop"]
        # interpolate along pressure or entropy depending on process
        if process in ("isentropic", "adiabatic"):
            Ps = np.linspace(s1["P"], s2["P"], n)
            for P in Ps:
                try:
                    D = PropsSI("D", "P", P, "S", s1["s"], fluid)
                    T = PropsSI("T", "P", P, "S", s1["s"], fluid)
                    h = PropsSI("H", "P", P, "S", s1["s"], fluid)
                    s = s1["s"]
                    pts.append({"P": P, "T": T, "v": 1.0 / D, "h": h, "s": s})
                except Exception:
                    continue
        elif process == "isobaric":
            hs = np.linspace(s1["h"], s2["h"], n)
            for h in hs:
                try:
                    D = PropsSI("D", "P", s1["P"], "H", h, fluid)
                    T = PropsSI("T", "P", s1["P"], "H", h, fluid)
                    s = PropsSI("S", "P", s1["P"], "H", h, fluid)
                    pts.append({"P": s1["P"], "T": T, "v": 1.0 / D, "h": h, "s": s})
                except Exception:
                    continue
        elif process == "isothermal":
            Ps = np.linspace(s1["P"], s2["P"], n)
            for P in Ps:
                try:
                    D = PropsSI("D", "P", P, "T", s1["T"], fluid)
                    h = PropsSI("H", "P", P, "T", s1["T"], fluid)
                    s = PropsSI("S", "P", P, "T", s1["T"], fluid)
                    pts.append({"P": P, "T": s1["T"], "v": 1.0 / D, "h": h, "s": s})
                except Exception:
                    continue
        else:
            pts = [s1, s2]
    return pts
