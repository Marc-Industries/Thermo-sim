//! Thermonator WASM core.
//!
//! The crate exposes the same JSON-shaped API as the TypeScript engine, so a
//! thin wrapper in `lib/wasm-loader.ts` can opt in to running the WASM kernel
//! without changing the rest of the app.
//!
//! WASM target: `wasm32-unknown-unknown` (no_std-friendly). Built artefacts
//! land in `public/wasm/` for the browser and `dist/wasm/` for Node.
//!
//! Build with:
//!   wasm-pack build --release --target web --out-dir ../../public/wasm
//!
//! Smoke test (native) with:
//!   cargo test

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum ThermoError {
    #[error("unknown substance: {0}")]
    UnknownSubstance(String),
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("not enough independent properties")]
    InsufficientProperties,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct State {
    pub P: Option<f64>,
    pub T: Option<f64>,
    pub v: Option<f64>,
    pub h: Option<f64>,
    pub u: Option<f64>,
    pub s: Option<f64>,
    pub x: Option<f64>,
    pub phase: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComputeResult {
    pub state: State,
    pub extra: Option<serde_json::Value>,
}

/// Substance registry — keyed by canonical id. cp and R in J/(kg·K).
#[derive(Debug, Clone)]
pub struct Substance {
    pub R: f64,
    pub cp: f64,
    pub cv: f64,
    pub gamma: f64,
}

fn registry() -> &'static std::collections::HashMap<&'static str, Substance> {
    use std::collections::HashMap;
    use std::sync::OnceLock;
    static R: OnceLock<HashMap<&'static str, Substance>> = OnceLock::new();
    R.get_or_init(|| {
        let mut m: HashMap<&'static str, Substance> = HashMap::new();
        let sub = |r: f64, cp: f64| Substance { R: r, cp, cv: cp - r, gamma: cp / (cp - r) };
        m.insert("Air", sub(287.05, 1005.0));
        m.insert("N2", sub(296.8, 1040.0));
        m.insert("O2", sub(259.8, 918.0));
        m.insert("He", sub(2077.0, 5193.0));
        m.insert("CO2", sub(188.9, 846.0));
        m.insert("H2", sub(4124.0, 14300.0));
        m.insert("Ar", sub(208.1, 520.0));
        m.insert("Steam", sub(461.5, 1850.0));
        m.insert("CH4", sub(518.3, 2226.0));
        m.insert("C3H8", sub(188.6, 1678.0));
        m
    })
}

fn validate_inputs(prop1: (&str, f64), prop2: (&str, f64)) -> Result<(String, f64, String, f64), ThermoError> {
    if !prop1.0.is_ascii() || !prop2.0.is_ascii() {
        return Err(ThermoError::InvalidInput("non-ascii property name".into()));
    }
    Ok((prop1.0.to_string(), prop1.1, prop2.0.to_string(), prop2.1))
}

/// Compute a thermodynamic state for an ideal gas given two independent
/// properties (P, T, v, h, u, s).
pub fn ideal_gas(substance: &str, prop1: (&str, f64), prop2: (&str, f64)) -> Result<ComputeResult, ThermoError> {
    let (n1, v1, n2, v2) = validate_inputs(prop1, prop2)?;
    let subs = registry();
    let data = subs.get(substance).ok_or_else(|| ThermoError::UnknownSubstance(substance.into()))?;
    let R = data.R;
    let cp = data.cp;
    let cv = data.cv;

    let mut t: Option<f64> = None;
    let mut p: Option<f64> = None;
    let mut v: Option<f64> = None;
    let mut h: Option<f64> = None;

    let read = |name: &str, val: f64| -> Option<f64> {
        match name {
            "P" => Some(val),
            "T" => Some(val),
            "v" => Some(val),
            "h" => Some(val),
            "u" => Some(val),
            "s" => Some(val),
            _ => None,
        }
    };
    if let Some(x) = read(&n1, v1) {
        match n1.as_str() { "P" => p = Some(x), "T" => t = Some(x), "v" => v = Some(x), "h" => h = Some(x), _ => {} }
    }
    if let Some(x) = read(&n2, v2) {
        match n2.as_str() { "P" => p = Some(x), "T" => t = Some(x), "v" => v = Some(x), "h" => h = Some(x), _ => {} }
    }

    // Solve for missing variables
    if t.is_none() && p.is_some() && v.is_some() { t = Some(p.unwrap() * v.unwrap() / R); }
    if p.is_none() && t.is_some() && v.is_some() { p = Some(R * t.unwrap() / v.unwrap()); }
    if v.is_none() && p.is_some() && t.is_some() { v = Some(R * t.unwrap() / p.unwrap()); }
    if t.is_none() && h.is_some() { t = Some(298.15 + h.unwrap() / cp); }

    let (P, T, v) = match (p, t, v) {
        (Some(P), Some(T), Some(v)) => (P, T, v),
        _ => return Err(ThermoError::InsufficientProperties),
    };
    let h = cp * (T - 298.15);
    let u = cv * (T - 298.15);
    let s = cp * (T / 298.15_f64).ln() - R * (P / 101325.0_f64).ln();
    let extra = serde_json::json!({ "R": R, "cp": cp, "cv": cv, "gamma": cp / cv });
    Ok(ComputeResult {
        state: State { P: Some(P), T: Some(T), v: Some(v), h: Some(h), u: Some(u), s: Some(s), x: None, phase: Some("gas".into()) },
        extra: Some(extra),
    })
}

/// Rankine-style eta placeholder (analytical formula on enthalpy).
pub fn rankine_eta(h1: f64, h2: f64, h3: f64, h4: f64) -> f64 {
    let q_in = h3 - h2;
    let w_net = (h3 - h4) - (h2 - h1);
    if q_in.abs() < 1e-9 { 0.0 } else { w_net / q_in }
}

/// Compute W and Q for a polytropic process (ideal gas, n != 1).
pub fn polytropic(substance: &str, p1: f64, v1: f64, p2: f64, v2: f64, n: f64) -> Result<(f64, f64), ThermoError> {
    let subs = registry();
    let data = subs.get(substance).ok_or_else(|| ThermoError::UnknownSubstance(substance.into()))?;
    let w = (p2 * v2 - p1 * v1) / (1.0 - n);
    let q = ((data.gamma - n) / (data.gamma - 1.0)) * w;
    Ok((w, q))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ideal_gas_basic() {
        let r = ideal_gas("Air", ("P", 101325.0), ("T", 288.15)).unwrap();
        let v = r.state.v.unwrap();
        // expected v ≈ 0.8165 m³/kg
        assert!((v - 0.8165).abs() < 0.01, "v = {}", v);
    }

    #[test]
    fn rankine_eta_check() {
        // Smoke: with h1=200, h2=210, h3=2800, h4=2200
        let eta = rankine_eta(200.0, 210.0, 2800.0, 2200.0);
        // q_in = 2590, w_net = 600-10 = 590, η ≈ 0.2278
        assert!((eta - 0.2278).abs() < 0.001, "eta = {}", eta);
    }

    #[test]
    fn polytropic_check() {
        let (w, q) = polytropic("Air", 1e5, 0.8, 5e5, 0.2, 1.3).unwrap();
        assert!(w > 0.0);
        assert!(q.abs() > 0.0);
    }
}

/* ----- WASM bindings (only compiled when targeting wasm32) ------------- */
#[cfg(all(target_arch = "wasm32", not(feature = "no_bindgen")))]
mod wasm_bindings {
    use super::*;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub fn compute_state_js(payload: JsValue) -> Result<JsValue, JsValue> {
        let req: WasmRequest = serde_wasm_bindgen::from_value(payload).map_err(|e| JsValue::from_str(&e.to_string()))?;
        let result = match req.model.as_str() {
            "ideal_gas" => ideal_gas(&req.substance, (req.prop1.name.as_str(), req.prop1.value), (req.prop2.name.as_str(), req.prop2.value))?,
            other => return Err(JsValue::from_str(&format!("unknown model: {other}"))),
        };
        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub fn rankine_eta_js(h1: f64, h2: f64, h3: f64, h4: f64) -> f64 {
        rankine_eta(h1, h2, h3, h4)
    }

    #[derive(Deserialize)]
    struct WasmRequest {
        model: String,
        substance: String,
        prop1: WasmProp,
        prop2: WasmProp,
    }
    #[derive(Deserialize)]
    struct WasmProp {
        name: String,
        value: f64,
    }
}

#[cfg(all(target_arch = "wasm32", not(feature = "no_bindgen")))]
pub use wasm_bindings::*;
