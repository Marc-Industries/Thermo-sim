"""Process (transformation) analysis + Professor Mode step generation.
Closed-system (non-flow) convention: Q = ΔU + W, with W = ∫P dv (boundary work)."""
import numpy as np
from .substances import ideal_props
from .state import TREF, PREF
from .diagrams import process_path

PROCESS_NAMES = {
    "isochoric": {"it": "Isocora (v = cost)", "en": "Isochoric (v = const)"},
    "isobaric": {"it": "Isobara (P = cost)", "en": "Isobaric (P = const)"},
    "isothermal": {"it": "Isoterma (T = cost)", "en": "Isothermal (T = const)"},
    "isentropic": {"it": "Adiabatica / Isentropica (s = cost)", "en": "Adiabatic / Isentropic (s = const)"},
    "adiabatic": {"it": "Adiabatica / Isentropica (s = cost)", "en": "Adiabatic / Isentropic (s = const)"},
    "polytropic": {"it": "Politropica (P·vⁿ = cost)", "en": "Polytropic (P·vⁿ = const)"},
}


def _num_work(path):
    """Boundary work ∫P dv via trapezoidal rule over SI path points."""
    if len(path) < 2:
        return 0.0
    v = np.array([p["v"] for p in path])
    P = np.array([p["P"] for p in path])
    return float(np.trapz(P, v))


def analyze_ideal(key, s1, s2, process):
    p = ideal_props(key)
    R, cp, cv, g = p["R"], p["cp"], p["cv"], p["gamma"]
    T1, T2 = s1["T"], s2["T"]
    P1, P2 = s1["P"], s2["P"]
    v1, v2 = s1["v"], s2["v"]
    du = cv * (T2 - T1)
    dh = cp * (T2 - T1)
    ds = s2["s"] - s1["s"]
    steps = []

    def add(title_it, title_en, latex):
        steps.append({"title": {"it": title_it, "en": title_en}, "latex": latex})

    if process == "isochoric":
        W = 0.0
        Q = du
        add("Lavoro", "Work", r"W = \int_1^2 P\,dv = 0 \quad (v=\text{cost})")
        add("Primo principio", "First law",
            rf"Q = \Delta u = c_v (T_2 - T_1) = {cv:.1f}\cdot({T2:.2f}-{T1:.2f}) = {Q/1000:.3f}\ \text{{kJ/kg}}")
    elif process == "isobaric":
        W = P1 * (v2 - v1)
        Q = dh
        add("Lavoro", "Work",
            rf"W = \int_1^2 P\,dv = P(v_2 - v_1) = {P1/1000:.2f}\cdot({v2:.5f}-{v1:.5f}) = {W/1000:.3f}\ \text{{kJ/kg}}")
        add("Primo principio", "First law",
            rf"Q = \Delta h = c_p (T_2 - T_1) = {Q/1000:.3f}\ \text{{kJ/kg}}")
    elif process == "isothermal":
        W = R * T1 * np.log(v2 / v1)
        Q = W
        add("Lavoro", "Work",
            rf"W = \int_1^2 \frac{{RT}}{{v}}dv = R T \ln\frac{{v_2}}{{v_1}} = {R:.1f}\cdot{T1:.2f}\cdot\ln\frac{{{v2:.5f}}}{{{v1:.5f}}} = {W/1000:.3f}\ \text{{kJ/kg}}")
        add("Primo principio", "First law",
            r"\Delta u = 0 \Rightarrow Q = W = " + rf"{Q/1000:.3f}\ \text{{kJ/kg}}")
    elif process in ("isentropic", "adiabatic"):
        Q = 0.0
        W = -du
        add("Adiabatica", "Adiabatic", r"Q = 0 \quad (\delta q = 0)")
        add("Primo principio", "First law",
            rf"W = -\Delta u = -c_v (T_2 - T_1) = -{cv:.1f}\cdot({T2:.2f}-{T1:.2f}) = {W/1000:.3f}\ \text{{kJ/kg}}")
        add("Relazione isentropica", "Isentropic relation",
            rf"\frac{{T_2}}{{T_1}} = \left(\frac{{v_1}}{{v_2}}\right)^{{\gamma-1}},\quad \gamma = {g:.3f}")
    else:  # polytropic
        nexp = np.log(P2 / P1) / np.log(v1 / v2) if abs(v1 - v2) > 1e-12 else g
        if abs(nexp - 1.0) < 1e-6:
            W = P1 * v1 * np.log(v2 / v1)
        else:
            W = (P1 * v1 - P2 * v2) / (nexp - 1.0)
        Q = du + W
        add("Esponente politropico", "Polytropic exponent",
            rf"n = \frac{{\ln(P_2/P_1)}}{{\ln(v_1/v_2)}} = {nexp:.4f}")
        add("Lavoro", "Work",
            rf"W = \int_1^2 P\,dv = \frac{{P_1 v_1 - P_2 v_2}}{{n-1}} = {W/1000:.3f}\ \text{{kJ/kg}}")
        add("Primo principio", "First law",
            rf"Q = \Delta u + W = {du/1000:.3f} + {W/1000:.3f} = {Q/1000:.3f}\ \text{{kJ/kg}}")

    return {
        "Q": Q, "W": W, "du": du, "dh": dh, "ds": ds,
        "process_name": PROCESS_NAMES[process], "steps": steps,
        "path": process_path("ideal_gas", key, s1, s2, process),
    }


def analyze_real(key, s1, s2, process):
    du = s2["u"] - s1["u"]
    dh = s2["h"] - s1["h"]
    ds = s2["s"] - s1["s"]
    path = process_path("real", key, s1, s2, process)
    if process == "isochoric":
        W = 0.0
        Q = du
    elif process == "isobaric":
        W = s1["P"] * (s2["v"] - s1["v"])
        Q = dh
    elif process in ("isentropic", "adiabatic"):
        W = -du
        Q = 0.0
    else:
        W = _num_work(path) if len(path) > 1 else s1["P"] * (s2["v"] - s1["v"])
        Q = du + W
    steps = [
        {"title": {"it": "Variazioni di stato", "en": "State changes"},
         "latex": rf"\Delta u = {du/1000:.3f},\ \Delta h = {dh/1000:.3f}\ \text{{kJ/kg}},\ \Delta s = {ds/1000:.4f}\ \text{{kJ/kg·K}}"},
        {"title": {"it": "Lavoro di confine", "en": "Boundary work"},
         "latex": rf"W = \int_1^2 P\,dv = {W/1000:.3f}\ \text{{kJ/kg}}"},
        {"title": {"it": "Primo principio", "en": "First law"},
         "latex": rf"Q = \Delta u + W = {Q/1000:.3f}\ \text{{kJ/kg}}"},
    ]
    return {"Q": Q, "W": W, "du": du, "dh": dh, "ds": ds,
            "process_name": PROCESS_NAMES[process], "steps": steps, "path": path}


def analyze(model, key, s1, s2, process):
    if model == "ideal_gas":
        return analyze_ideal(key, s1, s2, process)
    return analyze_real(key, s1, s2, process)
