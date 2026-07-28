import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Renders a Professor Mode report as a PDF.
 *
 * Two paths:
 *  1. If a LaTeX binary is available on PATH (`tectonic`, `pdflatex`, or `xelatex`)
 *     → compile the LaTeX source and stream the PDF.
 *  2. Otherwise → return a JSON `{ text: <report markdown> }` so the client
 *     can fall back to `window.print()` with a print-friendly HTML. This path
 *     keeps the route functional on Vercel without a TexLive install.
 *
 * GitHub Actions builds the PDF natively (see .github/workflows/pdf.yml).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const latex: string = body?.latex || ''
    if (!latex) return NextResponse.json({ error: 'latex is required' }, { status: 400 })

    const texBin = await findLaTeXBinary()
    if (texBin) {
      try {
        const pdf = await compileLaTeX(texBin, latex)
        const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
        return new Response(blob, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="professor-${body.cycle || 'report'}.pdf"`,
          },
        })
      } catch (compileErr: any) {
        // LaTeX binary present but compile failed → fall back to client-side
        // rendering so the user still gets a usable document.
        return NextResponse.json({
          text: body?.markdown || '',
          warning: 'LaTeX compile failed: ' + (compileErr?.message || 'unknown error') + '. Falling back to client-side PDF.',
        })
      }
    }

    // Fallback: server cannot compile LaTeX here. Return the markdown so the
    // client can render it in HTML and use the browser's print-to-PDF.
    return NextResponse.json({
      text: body?.markdown || '',
      warning: 'No LaTeX binary found on server; falling back to client-side PDF. Set up a build with tectonic or deploy the GitHub Action workflow for server-side PDF.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'PDF error' }, { status: 500 })
  }
}

async function findLaTeXBinary(): Promise<string | null> {
  const candidates = ['tectonic', 'xelatex', 'pdflatex']
  for (const b of candidates) {
    try {
      const { spawnSync } = await import('child_process')
      const r = spawnSync(b, ['--version'], { encoding: 'utf8' })
      if (r.status === 0) return b
    } catch {
      // keep trying
    }
  }
  return null
}

async function compileLaTeX(bin: string, source: string): Promise<Buffer> {
  const { spawn } = await import('child_process')
  const { mkdtemp, writeFile, rm } = await import('fs/promises')
  const { tmpdir } = await import('os')
  const path = await import('path')
  const dir = await mkdtemp(path.join(tmpdir(), 'thermo-pdf-'))
  const texFile = path.join(dir, 'report.tex')
  await writeFile(texFile, source, 'utf8')
  return new Promise<Buffer>((resolve, reject) => {
    const proc = spawn(bin, bin === 'tectonic' ? [texFile, '--outdir', dir] : ['-interaction=nonstopmode', '-halt-on-error', '-output-directory', dir, texFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stderr: Buffer[] = []
    proc.stderr.on('data', (c) => stderr.push(c))
    proc.on('close', async (code) => {
      if (code !== 0) {
        await rm(dir, { recursive: true, force: true }).catch(() => {})
        reject(new Error(`LaTeX exited with ${code}: ${Buffer.concat(stderr).toString('utf8')}`))
        return
      }
      const pdfPath = path.join(dir, 'report.pdf')
      const { readFile } = await import('fs/promises')
      try {
        const buf = await readFile(pdfPath)
        await rm(dir, { recursive: true, force: true }).catch(() => {})
        resolve(buf)
      } catch (e: any) {
        await rm(dir, { recursive: true, force: true }).catch(() => {})
        reject(new Error(`PDF not produced: ${e.message}`))
      }
    })
  })
}
