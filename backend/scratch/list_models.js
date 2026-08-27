import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6If9gELxT_qaDd7mKLt7PmVJ1UUOk9otVQazjcW_x3KrA';

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (!data.models) {
      console.log('No models returned. API Response:', data);
      return;
    }
    const filtered = data.models
      .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name);
    console.log('Supported generateContent Models:', filtered);
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
