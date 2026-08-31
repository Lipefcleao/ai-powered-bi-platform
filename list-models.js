async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`);
    const data = await response.json();
    data.models.forEach(model => {
      console.log(model.name);
    });
  } catch (e) {
    console.error(e);
  }
}
listModels();

