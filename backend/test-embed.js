const Groq = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  try {
    const MODEL = process.env.GROQ_EMBEDDING_MODEL || 'llama-3.1-8b-embedding';
    console.log('[TEST] Using embedding model:', MODEL);

    const res = await client.embeddings.create({ model: MODEL, input: 'hello world' });
    console.log('[TEST] Full response:', JSON.stringify(res, null, 2));

    const embed = res?.data?.[0]?.embedding;
    if (!Array.isArray(embed)) {
      console.error('[TEST] No embedding array found');
      process.exit(2);
    }

    console.log('[TEST] Embedding length:', embed.length);
    console.log('[TEST] First values:', embed.slice(0, 8));
  } catch (err) {
    console.error('[TEST] EMBED ERROR:', err);
    process.exit(1);
  }
}

if (require.main === module) test();
