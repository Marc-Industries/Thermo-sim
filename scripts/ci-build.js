#!/usr/bin/env node
// Wrapper to invoke `next build` and ignore forwarded pnpm/npm flags like --silent
const { spawn } = require('child_process')

const args = ['build']

const child = spawn('npx', ['next', ...args], { stdio: 'inherit', shell: true })

child.on('close', (code) => {
  process.exit(code)
})
