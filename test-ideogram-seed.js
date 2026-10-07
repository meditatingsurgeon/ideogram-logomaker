const apiKey = process.env.IDEOGRAM_API_KEY;
async function test() {
  const r = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      image_request: {
        prompt: "A beautiful logo",
        aspect_ratio: "ASPECT_16_9",
        model: "V_2",
        magic_prompt_option: "AUTO",
        seed: 12345
      }
    })
  });
  const d = await r.json();
  console.log(r.status, d);
}
test();
