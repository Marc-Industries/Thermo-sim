# Graph Report - .  (2026-07-29)

## Corpus Check
- Corpus is ~34,615 words - fits in a single context window. You may not need a graph.

## Summary
- 389 nodes · 570 edges · 27 communities (19 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- React UI Components
- Thermodynamic Engine + API Routes
- npm Dependencies
- Dev Tooling Config
- TypeScript Globals
- Deployment + Professor Mode Workflow
- Rust WASM Core
- Unit Conversion Logic
- Professor Derivation Generators
- Build Scripts
- Radix UI Primitives
- WASM Loader Bridge
- Community 12
- TypeScript Config
- Vercel Deployment Settings
- LaTeX/PDF Route
- child_process Spawn Helpers
- Community 17
- Community 19
- Community 20
- Community 21
- Community 22
- Community 24
- Community 26

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 23 edges
2. `useStore` - 13 edges
3. `generateProfessorReport()` - 11 edges
4. `scripts` - 11 edges
5. `convertFromSI()` - 10 edges
6. `NUM()` - 9 edges
7. `generateCycleReport()` - 9 edges
8. `Parser` - 9 edges
9. `computeThermodynamicState()` - 9 edges
10. `analyzeCycle()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Thermonator baseline app` --semantically_similar_to--> `WASM drop-in replacement plan`  [INFERRED] [semantically similar]
  prompt.md → wasm/README.md
- `Ideal gas solver (Rust)` --semantically_similar_to--> `lib/thermo-engine.ts`  [INFERRED] [semantically similar]
  rust-wasm/README.md → DEPLOYMENT.md
- `/api/compute-state endpoint` --references--> `Ideal gas state calculation`  [INFERRED]
  DEPLOYMENT.md → prompt.md
- `Ideal gas solver (Rust)` --conceptually_related_to--> `Ideal gas state calculation`  [INFERRED]
  rust-wasm/README.md → prompt.md
- `Polytropic helper` --conceptually_related_to--> `Ideal gas state calculation`  [INFERRED]
  rust-wasm/README.md → prompt.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Thermo Lab CI pipeline** — github_workflows_pdf_yml_pdfyml, github_workflows_self_check_yml_self_checkyml, github_workflows_self_check_yml_self_check_endpoint, github_workflows_pdf_yml_tectonic, github_workflows_pdf_yml_latex [EXTRACTED 1.00]
- **Thermodynamic state calculation concept** — prompt_md_ideal_gas_state_calc, rust_wasm_readme_md_ideal_gas_solver, deployment_md_thermo_engine_ts, deployment_md_api_compute_state [INFERRED 0.85]
- **WASM dual-engine migration** — rust_wasm_readme_md_parallel_engines, wasm_readme_md_wasm_drop_in_plan, rust_wasm_readme_md_wasm_bindgen, readme_md_rust_wasm_pipeline [INFERRED 0.85]

## Communities (27 total, 8 thin omitted)

### Community 0 - "React UI Components"
Cohesion: 0.07
Nodes (42): ProcessAnalysis(), Model, StateCalculator(), CYCLE_TYPES, CycleBuilder(), reportMarkdownToHTML(), triggerDownload(), criticalPointForPlane() (+34 more)

### Community 1 - "Thermodynamic Engine + API Routes"
Cohesion: 0.09
Nodes (33): POST(), POST(), GET(), analyzeCycle(), analyzeProcess(), buildSaturationMaps(), calculateIdealGasCpTState(), calculateIdealGasState() (+25 more)

### Community 2 - "npm Dependencies"
Cohesion: 0.05
Nodes (39): axios, class-variance-authority, clsx, jspdf, lucide-react, next, dependencies, axios (+31 more)

### Community 3 - "Dev Tooling Config"
Cohesion: 0.05
Nodes (37): autoprefixer, eslint, eslint-config-next, description, devDependencies, autoprefixer, eslint, eslint-config-next (+29 more)

### Community 4 - "TypeScript Globals"
Cohesion: 0.06
Nodes (34): DOM, DOM.Iterable, ES2020, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+26 more)

### Community 5 - "Deployment + Professor Mode Workflow"
Cohesion: 0.09
Nodes (25): /api/compute-state endpoint, lib/thermo-engine.ts, Vercel hosting, LaTeX report artifact, PDF workflow, Professor Mode LaTeX/PDF workflow, Tectonic TeXLive container, Self-check API endpoint (+17 more)

### Community 6 - "Rust WASM Core"
Cohesion: 0.18
Nodes (22): HashMap, JsValue, Option, Result, compute_state_js(), ComputeResult, ideal_gas(), ideal_gas_basic() (+14 more)

### Community 7 - "Unit Conversion Logic"
Cohesion: 0.14
Nodes (18): POST(), PropField(), PropFieldProps, unitHintSI(), ConversionTables, convertToSI(), defaultUnitFor(), ENERGY_ALIASES (+10 more)

### Community 8 - "Professor Derivation Generators"
Cohesion: 0.23
Nodes (18): GET(), POST(), sampleRankine(), braytonDerivation(), buildFullLatexDoc(), carnotDerivation(), dieselDerivation(), escape() (+10 more)

### Community 9 - "Build Scripts"
Cohesion: 0.11
Nodes (15): basicIdealGas(), cpTempByName, fs, idealGases, legacy, OUT, output, path (+7 more)

### Community 10 - "Radix UI Primitives"
Cohesion: 0.12
Nodes (15): SelectContent, SelectContentProps, SelectItem, SelectItemProps, SelectTrigger, SelectTriggerProps, SelectValue, SelectValueProps (+7 more)

### Community 11 - "WASM Loader Bridge"
Cohesion: 0.33
Nodes (5): metadata, RootProvider(), hasWasmCore(), loadWasmCore(), WasmCore

### Community 13 - "TypeScript Config"
Cohesion: 0.22
Nodes (8): next.config.js, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 14 - "Vercel Deployment Settings"
Cohesion: 0.40
Nodes (4): buildCommand, devCommand, framework, installCommand

### Community 15 - "LaTeX/PDF Route"
Cohesion: 0.83
Nodes (3): compileLaTeX(), findLaTeXBinary(), POST()

### Community 16 - "child_process Spawn Helpers"
Cohesion: 0.50
Nodes (3): args, child, { spawn }

## Knowledge Gaps
- **174 isolated node(s):** `Model`, `CYCLE_TYPES`, `metadata`, `NAV`, `PAGES` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `npm Dependencies` to `React UI Components`, `Dev Tooling Config`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Why does `react` connect `React UI Components` to `npm Dependencies`, `Unit Conversion Logic`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `CycleBuilder()` connect `React UI Components` to `Thermodynamic Engine + API Routes`, `npm Dependencies`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **What connects `Model`, `CYCLE_TYPES`, `metadata` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.07111756168359942 - nodes in this community are weakly interconnected._
- **Should `Thermodynamic Engine + API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08636977058029689 - nodes in this community are weakly interconnected._
- **Should `npm Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._