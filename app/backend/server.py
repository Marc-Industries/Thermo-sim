from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from thermo import units as U
from thermo.substances import list_substances
from thermo.state import compute_state, fluid_meta
from thermo.process import analyze
from thermo.cycles import solve_cycle
from thermo.diagrams import saturation_dome

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Thermonator Pro API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("thermonator")

ENERGY_KEYS = ("w_net", "w_turbine", "w_pump", "w_in", "q_in", "q_out", "q_L", "q_H")


# ----------------------------- models -----------------------------
class PropInput(BaseModel):
    name: str            # P,T,v,h,u,s,x
    value: float
    unit: str


class StateRequest(BaseModel):
    model: str           # ideal_gas | real
    substance: str
    prop1: PropInput
    prop2: PropInput
    units: Dict[str, str]


class ProcessRequest(BaseModel):
    model: str
    substance: str
    process: str
    state1: List[PropInput]
    state2: List[PropInput]
    units: Dict[str, str]


class CycleRequest(BaseModel):
    cycle_type: str
    params: Dict[str, Any]
    units: Dict[str, str]


class ExportRequest(BaseModel):
    title: str
    steps: List[Dict[str, Any]]
    lang: str = "it"
    fmt: str = "latex"


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    kind: str
    payload: Dict[str, Any]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ----------------------------- helpers -----------------------------
def prop_to_si(p: PropInput):
    return {"name": p.name, "value": U.to_SI(p.value, p.unit, p.name)}


def point_to_units(pt, units):
    out = {}
    for k in ("P", "T", "v", "h", "u", "s"):
        if pt.get(k) is not None:
            out[k] = U.from_SI(pt[k], units.get(k), k)
    if "x" in pt:
        out["x"] = pt["x"]
    return out


def perf_to_units(perf, units):
    ef = U.ENERGY[units["h"]]
    out = {}
    for k, val in perf.items():
        if k in ENERGY_KEYS and val is not None:
            out[k] = val / ef
        else:
            out[k] = val
    return out


# ----------------------------- endpoints -----------------------------
@api.get("/")
async def root():
    return {"app": "Thermonator Pro", "status": "ok"}


@api.get("/substances")
async def substances():
    return list_substances()


@api.get("/units")
async def units_config():
    return {"systems": U.UNIT_SYSTEMS,
            "options": {"P": list(U.PRESSURE.keys()), "T": ["K", "C", "F"],
                        "v": list(U.VOLUME.keys()), "h": list(U.ENERGY.keys()),
                        "u": list(U.ENERGY.keys()), "s": list(U.ENTROPY.keys())}}


@api.get("/fluid-meta/{key}")
async def fluid_metadata(key: str):
    try:
        return fluid_meta(key)
    except Exception as e:
        raise HTTPException(400, str(e))


@api.get("/dome/{key}")
async def dome(key: str, units_h: str = "kJ/kg", units_s: str = "kJ/kg.K",
               units_P: str = "kPa", units_T: str = "K", units_v: str = "m3/kg"):
    units = {"h": units_h, "s": units_s, "P": units_P, "T": units_T, "v": units_v, "u": units_h}
    try:
        d = saturation_dome(key)
        return {"liquid": [point_to_units(p, units) for p in d["liquid"]],
                "vapor": [point_to_units(p, units) for p in d["vapor"]],
                "critical": point_to_units(d["critical"], units)}
    except Exception as e:
        raise HTTPException(400, str(e))


@api.post("/state")
async def state(req: StateRequest):
    try:
        s = compute_state(req.model, req.substance, prop_to_si(req.prop1), prop_to_si(req.prop2))
    except Exception as e:
        raise HTTPException(400, f"Calcolo stato non riuscito: {e}")
    disp = point_to_units(s, req.units)
    disp["phase"] = s.get("phase")
    disp["phase_key"] = s.get("phase_key")
    extra = {k: s[k] for k in ("R", "cp", "cv", "gamma") if k in s}
    return {"state": disp, "extra": extra, "si": {k: s.get(k) for k in ("P", "T", "v", "h", "u", "s", "x")}}


@api.post("/process")
async def process(req: ProcessRequest):
    try:
        s1 = compute_state(req.model, req.substance,
                           prop_to_si(req.state1[0]), prop_to_si(req.state1[1]))
        s2 = compute_state(req.model, req.substance,
                           prop_to_si(req.state2[0]), prop_to_si(req.state2[1]))
        res = analyze(req.model, req.substance, s1, s2, req.process)
    except Exception as e:
        raise HTTPException(400, f"Analisi trasformazione non riuscita: {e}")
    ef = U.ENERGY[req.units["h"]]
    sf = U.ENTROPY[req.units["s"]]
    return {
        "state1": {**point_to_units(s1, req.units), "phase": s1.get("phase")},
        "state2": {**point_to_units(s2, req.units), "phase": s2.get("phase")},
        "results": {"Q": res["Q"] / ef, "W": res["W"] / ef,
                    "du": res["du"] / ef, "dh": res["dh"] / ef, "ds": res["ds"] / sf},
        "process_name": res["process_name"],
        "steps": res["steps"],
        "path": [point_to_units(p, req.units) for p in res["path"]],
    }


@api.post("/cycle")
async def cycle(req: CycleRequest):
    try:
        # convert params (values arrive already in SI-ish? no -> convert known keys)
        params = _convert_cycle_params(req.cycle_type, req.params, req.units)
        res = solve_cycle(req.cycle_type, params)
    except Exception as e:
        raise HTTPException(400, f"Risoluzione ciclo non riuscita: {e}")
    payload = {
        "nodes": [point_to_units(n, req.units) for n in res["nodes"]],
        "segments": res["segments"],
        "path": [point_to_units(p, req.units) for p in res["path"]],
        "performance": perf_to_units(res["performance"], req.units),
        "steps": res["steps"],
        "model": res["model"],
        "fluid_key": res["fluid_key"],
    }
    if "dome" in res:
        payload["dome"] = {
            "liquid": [point_to_units(p, req.units) for p in res["dome"]["liquid"]],
            "vapor": [point_to_units(p, req.units) for p in res["dome"]["vapor"]],
            "critical": point_to_units(res["dome"]["critical"], req.units),
        }
    return payload


def _convert_cycle_params(cycle_type, params, units):
    """Convert user-facing param units to SI for solvers."""
    p = dict(params)
    for k in ("P_boiler", "P_cond", "P_evap", "P1"):
        if k in p:
            p[k] = U.to_SI(float(p[k]), units["P"], "P")
    for k in ("T_turbine_in", "T1", "T3", "T_high", "T_low"):
        if k in p:
            p[k] = U.to_SI(float(p[k]), units["T"], "T")
    for k in ("q_in",):
        if k in p:
            p[k] = U.to_SI(float(p[k]), units["h"], "h")
    for k in ("r", "rp", "eta_turbine", "eta_pump", "eta_comp"):
        if k in p:
            p[k] = float(p[k])
    return p


@api.post("/export")
async def export(req: ExportRequest):
    if req.fmt == "python":
        return {"content": _python_export(req), "filename": "thermonator.py", "language": "python"}
    return {"content": _latex_export(req), "filename": "thermonator.tex", "language": "latex"}


def _latex_export(req: ExportRequest):
    lines = [r"\documentclass{article}", r"\usepackage{amsmath}",
             r"\usepackage[utf8]{inputenc}", r"\begin{document}",
             rf"\section*{{{req.title}}}"]
    for i, st in enumerate(req.steps, 1):
        title = st.get("title", {}).get(req.lang, "")
        lines.append(rf"\subsection*{{{i}. {title}}}")
        lines.append(r"\[")
        lines.append(st.get("latex", ""))
        lines.append(r"\]")
    lines.append(r"\end{document}")
    return "\n".join(lines)


def _python_export(req: ExportRequest):
    header = ('"""Auto-generated by Thermonator Pro. Requires: pip install CoolProp"""\n'
              "from CoolProp.CoolProp import PropsSI\n\n"
              f"# {req.title}\n")
    body = "\n".join(f"# Step {i}: {st.get('title', {}).get(req.lang, '')}\n#   {st.get('latex','')}"
                     for i, st in enumerate(req.steps, 1))
    return header + body + "\n"


@api.post("/projects")
async def save_project(p: Project):
    await db.projects.insert_one(p.model_dump())
    return p


@api.get("/projects")
async def get_projects():
    docs = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("shutdown")
async def shutdown():
    client.close()
