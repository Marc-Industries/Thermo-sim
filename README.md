# Thermonator Pro - Next.js + Rust Wasm + Vercel

Advanced thermodynamic simulation and calculation app for students, researchers, and engineers.

## Features

- 🌡️ Thermodynamic state calculation (ideal gas & real fluids)
- 📊 Interactive diagrams (T-s, P-v, h-s, P-h, etc.)
- ♻️ Cycle analysis (Rankine, Otto, Diesel, Brayton, etc.)
- ⚡ High-performance calculations via Rust WebAssembly
- 📱 Responsive design (desktop & mobile)
- 🌍 Multi-language support (Italian, English)
- 💾 No database - session-based state management

## Quick Start

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build
pnpm start
```

## Architecture

- **Frontend**: Next.js 14 + React 19 + TypeScript
- **Calculations**: Rust compiled to WebAssembly (via wasm-bindgen)
- **State Management**: Zustand + localStorage
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

## Directory Structure

```
├── app/               # Next.js pages
│   ├── calculator/    # State calculator
│   ├── analysis/      # Process analysis
│   ├── cycles/        # Cycle builder
│   ├── diagrams/      # Diagram viewer
│   └── layout.tsx     # Root layout
├── components/        # Reusable React components
├── lib/              # Utilities & store
├── public/           # Static assets (substance-data.json)
├── styles/           # Global CSS
├── rust-wasm/        # Rust WebAssembly source
└── package.json
```

## Next Steps

1. [ ] Complete React components migration
2. [ ] Setup Rust Wasm build pipeline
3. [ ] Implement substance property calculations
4. [ ] Add diagram rendering (Plotly/Chart.js)
5. [ ] Deploy to Vercel
6. [ ] Enable GitHub auto-deployment

## Deployment on Vercel

```bash
git push origin main
# Vercel automatically deploys
```

## License

MIT
