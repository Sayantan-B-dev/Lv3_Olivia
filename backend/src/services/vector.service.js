const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pc.Index("cohort-chat-gpt").namespace("default");

// store memory
async function createMemory({ metadata, text, messageId }) {
  try {
    if (!text) return;

    const records = [
      {
        _id: String(messageId),
        text,
        ...metadata
      }
    ];

    await index.upsertRecords(records);

  } catch (err) {
    console.error("[PINECONE] Memory upsert error:", err.message);
  }
}

// search memory
async function queryMemory({ query, limit = 5, filter }) {
  try {
    if (!query) return [];

    const result = await index.searchRecords({
      query: {
        topK: limit,
        inputs: { text: query }
      },
      filter
    });

    return result.result?.hits || [];

  } catch (err) {
    console.error("[PINECONE] Query error:", err.message);
    return [];
  }
}

module.exports = { createMemory, queryMemory };
