// Ollama Provider — raw fetch, no SDK
// Compatible con el endpoint OpenAI-style de Ollama

import { LLMProvider } from './provider.mjs';

export class OllamaProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'ollama';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.apiKey = config.apiKey || 'ollama';           // dummy key – Ollama la ignora
    this.model = config.model || 'llama3.1';           // ← cambia según el modelo que tengas
  }

  get isConfigured() {
    return true; // No requiere key real
  }

  async complete(systemPrompt, userMessage, opts = {}) {
    const url = `${this.baseUrl}/v1/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,   // aunque se ignora
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens || 4096,         // Ollama prefiere max_tokens
        // max_completion_tokens también suele funcionar, pero max_tokens es más común
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
        temperature: opts.temperature ?? 0.7,
        top_p: opts.topP ?? 0.9,
        stream: false,                              // puedes poner true si quieres implementar streaming después
      }),
      signal: AbortSignal.timeout(opts.timeout || 60000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Ollama API ${res.status}: ${err.substring(0, 200)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    return {
      text,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
      model: data.model || this.model,
    };
  }
}
