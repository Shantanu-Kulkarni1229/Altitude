class OllamaUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OllamaUnavailableError';
  }
}

class OllamaService {
  async generateResponse(prompt, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Using native fetch (Node 18+)
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1', // or whatever model is used
          prompt: prompt,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Ollama HTTP Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;

    } catch (error) {
      clearTimeout(timeout);
      // Catch aborts or connection refused
      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
        throw new OllamaUnavailableError('Local Ollama instance is unreachable or timed out.');
      }
      throw error;
    }
  }
}

module.exports = {
  OllamaService: new OllamaService(),
  OllamaUnavailableError
};
