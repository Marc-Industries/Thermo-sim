(async function(){
  try {
    const res = await fetch('http://localhost:3000/api/self-check?full=1')
    if (!res.ok) {
      console.error('Self-check endpoint failed:', res.status)
      process.exit(2)
    }
    const json = await res.json()
    if (!json || !json.results) {
      console.error('Invalid self-check response')
      process.exit(3)
    }
    const failed = json.results.filter((r) => !r.ok)
    if (failed.length > 0) {
      console.error('Some validations failed:', failed)
      process.exit(4)
    }
    console.log('All self-check validations passed')
    process.exit(0)
  } catch (e) {
    console.error('Self-validate script error:', e)
    process.exit(1)
  }
})()
