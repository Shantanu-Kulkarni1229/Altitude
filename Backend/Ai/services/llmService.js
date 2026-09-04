// Thin client for the LLM backing the AI concierge. Currently calls Groq's
// cloud chat-completions API (not a local Ollama instance, despite this
// module's historical name) — kept isolated here so swapping providers only
// touches this file.
class LLMUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LLMUnavailableError';
  }
}

class LLMService {
  constructor() {
    this.lastCallOk = null; // null = never called yet, true/false = last result
  }

  async generateResponse(prompt, timeoutMs = 15000, { jsonMode = false } = {}) {
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
          temperature: 0.2,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Cloud LLM HTTP Error: ${response.statusText}`);
      }

      const data = await response.json();
      this.lastCallOk = true;
      return data.choices[0].message.content;

    } catch (error) {
      clearTimeout(timeout);
      this.lastCallOk = false;
      // Catch aborts or connection errors
      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
        throw new LLMUnavailableError('Cloud LLM is unreachable or timed out.');
      }
      throw error;
    }
  }
}

module.exports = {
  LLMService: new LLMService(),
  LLMUnavailableError
};
