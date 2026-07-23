import axios from "axios";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const getSubstances = () => api.get("/substances").then((r) => r.data);
export const getUnits = () => api.get("/units").then((r) => r.data);
export const computeState = (body) => api.post("/state", body).then((r) => r.data);
export const analyzeProcess = (body) => api.post("/process", body).then((r) => r.data);
export const solveCycle = (body) => api.post("/cycle", body).then((r) => r.data);
export const getDome = (key, units) =>
  api
    .get(`/dome/${key}`, {
      params: {
        units_h: units.h, units_s: units.s, units_P: units.P,
        units_T: units.T, units_v: units.v,
      },
    })
    .then((r) => r.data);
export const exportDoc = (body) => api.post("/export", body).then((r) => r.data);
