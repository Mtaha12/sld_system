import dotenv from 'dotenv';
dotenv.config({ path: '../.env', override: true });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Using API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');

try {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const data = await response.json();
  console.log('Available Models:');
  if (data.models) {
    data.models.forEach(m => {
      console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(', ')})`);
    });
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
} catch (err) {
  console.error('Error listing models:', err);
}
