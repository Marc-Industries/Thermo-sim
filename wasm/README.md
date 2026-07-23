Thermo-sim WASM scaffold

This folder contains scaffolding and notes for porting the thermodynamic engine to Rust and compiling to WebAssembly.

Goals:
- Implement core numerical engine (state calculations, EOS) in Rust
- Expose a small JS-friendly API via wasm-bindgen or wasm-pack
- Integrate into /lib as a drop-in replacement with runtime feature flag

Steps (quick):
1. Install Rust toolchain + wasm32-unknown-unknown target
2. cargo init --lib
3. add wasm-bindgen and build scripts
4. expose compute_state(payload) -> JSON

CI: Add cargo build step and wasm artifact publishing.

This README is a placeholder to store the plan and commands for future work.
