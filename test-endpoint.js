const fetch = require('node-fetch');
async function run() {
  const r = await fetch('http://localhost:3000/api/test-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enhancedPrompt: "A beautiful logo", companyName: "Test", tagline: "Test", brandVision: "Test" })
  });
  console.log(r.status);
  console.log(await r.text());
}
run();
