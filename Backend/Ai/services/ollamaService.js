class OllamaUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OllamaUnavailableError';
  }
}

class OllamaService {
  async generateResponse(prompt, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          temperature: 0.2
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Cloud LLM HTTP Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      clearTimeout(timeout);
      // Catch aborts or connection errors
      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
        throw new OllamaUnavailableError('Cloud LLM is unreachable or timed out.');
      }
      throw error;
    }
  }
}

module.exports = {
  OllamaService: new OllamaService(),
  OllamaUnavailableError
};
