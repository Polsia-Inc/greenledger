const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Chat with OpenAI GPT model.
 * Drop-in replacement for the old Polsia AI proxy.
 */
async function chat(message, options = {}) {
  const response = await openai.chat.completions.create({
    model: options.model || process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: options.maxTokens || 8192,
    messages: [
      ...(options.system ? [{ role: 'system', content: options.system }] : []),
      { role: 'user', content: message },
    ],
  });
  return response.choices[0].message.content;
}

module.exports = { openai, chat };
