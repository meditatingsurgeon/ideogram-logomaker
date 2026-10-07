const apiKey = process.env.IDEOGRAM_API_KEY;
async function test() {
  for (const ratio of ["ASPECT_1_1", "ASPECT_16_9", "ASPECT_3_1", "ASPECT_9_16"]) {
    console.log(`Testing ${ratio}...`);
    const r = await fetch("https://api.ideogram.ai/generate", {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_request: {
          prompt: "A beautiful logo",
          aspect_ratio: ratio,
          model: "V_2",
          magic_prompt_option: "AUTO"
        }
      })
    });
    const d = await r.json();
    console.log(ratio, r.status, d.error || (d.data && "success"));
  }
}
test();
