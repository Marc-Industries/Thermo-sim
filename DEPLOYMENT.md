# Thermo Lab - Deployment Guide

## Setup GitHub

```bash
cd /Users/matteo/Desktop/thermo-sim

# Initialize Git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Next.js + Node.js thermodinamics engine

- Migrated from CRA to Next.js 14 with TypeScript
- Implemented thermodynamic state calculations (ideal gas & water)
- Added Zustand store with localStorage persistence
- Full responsive design with Tailwind CSS
- Substance data JSON with 8 ideal gases + 5 real fluids
- API routes for serverless computation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Add remote (replace with your GitHub repo)
git remote add origin https://github.com/YOUR_USERNAME/thermo-sim.git

# Push to main
git branch -M main
git push -u origin main
```

## Deploy to Vercel

### Option 1: Via Web (Recommended)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repo `thermo-sim`
4. Vercel auto-detects Next.js configuration
5. Click "Deploy"
6. Done! Your app is live

**Your URL will be:** `https://thermo-sim.vercel.app`

### Option 2: CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Production deploy
vercel --prod
```

## Environment Variables (if needed)

Add to Vercel dashboard:
- `NEXT_PUBLIC_API_URL` (optional - defaults to same origin)

## Project Structure (after deployment)

```
thermo-sim.vercel.app/
├── /                     # Home (shell with nav)
├── /calculator           # State calculator
├── /analysis             # Process analysis
├── /cycles               # Cycle builder
├── /diagrams             # Thermodynamic diagrams
└── /api/compute-state    # Serverless API endpoint
```

## API Usage Example

```javascript
// From frontend (auto-uses same origin in production)
const response = await fetch('/api/compute-state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'ideal_gas',
    substance: 'Air',
    prop1: { name: 'P', value: 100000, unit: 'Pa' },
    prop2: { name: 'T', value: 300, unit: 'K' },
  })
})

const { state, extra } = await response.json()
console.log(state)
// {
//   P: 100000,
//   T: 300,
//   v: 0.861,
//   h: 300150,
//   u: 214500,
//   s: 6890.5,
//   phase: 'gas'
// }
```

## Monitoring & Analytics

In Vercel dashboard:
- View logs: Dashboard → Project → Deployments → Logs
- Performance: Dashboard → Project → Analytics
- Edge Functions: Dashboard → Project → Logs → Functions

## Next Steps (Post-Deployment)

1. **Add CoolProp Integration** (for more accurate real fluid calculations)
   - Use `coolprop-js` or fetch from NIST API

2. **Implement Process Calculations**
   - Add Q, W, η calculations in `thermo-engine.ts`

3. **Enhance Diagrams**
   - Add saturation curves for T-s, P-v diagrams
   - Interactive drag points on diagrams

4. **Add Cycle Presets**
   - Rankine, Otto, Diesel, Brayton cycles templates

5. **Export Features**
   - PDF report generation
   - LaTeX output for academic papers
   - Python code generation

## Troubleshooting

**"Module not found" error:**
```bash
# Clear cache and rebuild
rm -rf .next
pnpm build
```

**Build fails on Vercel:**
- Check logs: `vercel logs --prod`
- Ensure all dependencies in `package.json`
- Verify TypeScript types: `pnpm type-check`

**API returns 500:**
- Check `/api/compute-state` input format
- Verify substance name matches `substance-data.json`

## Support

- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/docs
- Thermodynamics: Check `lib/thermo-engine.ts` for equations

