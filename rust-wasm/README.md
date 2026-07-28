# Rust / WASM core

Source for the thermodynamic engine compiled to WebAssembly. The Kotlin/Swift
shims are not present yet; the next milestone is to compile the library and
expose a JS-friendly API via `wasm-bindgen`.

## Build

```bash
# Toolchain
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.91

# Build the WASM artifact and the JS bindings
wasm-pack build --release --target web --out-dir ../../public/wasm
```

The result lands in `public/wasm/thermo_wasm.js` and `public/wasm/thermo_wasm_bg.wasm`
which the Next.js app can serve as static assets.

## Native tests

```bash
cargo test
```

to run the unit tests covering the ideal-gas solver, Rankine η, and the
polytropic helper.

## API

- `ideal_gas(substance, prop1, prop2)` →
  `Result<ComputeResult, ThermoError>` — `prop1`/`prop2` are `(&str, f64)`
  pairs. Returns `P, T, v, h, u, s, phase`.
- `rankine_eta(h1, h2, h3, h4)` → `f64` — quick η on enthalpies.
- `polytropic(substance, p1, v1, p2, v2, n)` → `(W, Q)`.

## Cargo deps

`serde`, `serde_json`, `wasm-bindgen`, `serde-wasm-bindgen`, `thiserror`.
The `serde-wasm-bindgen` crate is the only dependency that pulls in
`js-sys`; everything else is pure Rust.

## Why this lives in `rust-wasm/`

The current `lib/thermo-engine.ts` is the production engine for the web app
(no WASM yet). Once the Rust crate is feature-complete and the bundle size
is acceptable, the JS code will be replaced by a thin wrapper that calls
into the WASM module. Until then, the two implementations live in parallel
and produce the same numerical results (verified by the unit tests).
