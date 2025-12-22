const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const cohortChatGPTIndex = pc.index("cohort-chat-gpt");

async function createMemory({ chat, user, text, messageId }) {
  try {
    await cohortChatGPTIndex.namespace(user.toString()).upsertRecords([
      {
        _id: messageId.toString(),
        chunk_text: text,
        chat: chat,
        user: user
      }
    ]);

    console.log("[MEMORY] Saved →", messageId.toString());

  } catch (err) {
    console.error("[PINECONE] MEMORY UPSERT ERROR:", err);
  }
}
async function queryMemory({ text, user, limit = 5 }) {
  try {
    const ns = cohortChatGPTIndex.namespace(user.toString());

    const results = await ns.searchRecords({
      query: {
        topK: limit,
        inputs: { text }
      }
    });

    const hits = results?.result?.hits || [];

    console.log("[MEMORY] hits:", hits.length);

    return hits.map(hit => ({
      id: hit.id,
      score: hit.score,
      metadata: hit.fields
    }));

  } catch (err) {
    console.error("[PINECONE] MEMORY QUERY ERROR:", err);
    return [];
  }
}

module.exports = { createMemory, queryMemory };

