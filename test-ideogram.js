const apiKey = process.env.IDEOGRAM_API_KEY;
fetch("https://api.ideogram.ai/generate", {
  method: "POST",
  headers: {
    "Api-Key": apiKey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    image_request: {
      prompt: "A beautiful logo",
      aspect_ratio: "ASPECT_1_1",
      model: "V_2",
      magic_prompt_option: "AUTO"
    }
  })
}).then(r => r.json().then(d => ({status: r.status, data: d}))).then(console.log).catch(console.error);
