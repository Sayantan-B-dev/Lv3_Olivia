const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = "cohort-chat-gpt";

async function initPinecone() {
  try {
    const existing = (await pc.listIndexes()) || [];
    const exists = existing.indexes?.some(i => i.name === indexName);

    if (!exists) {
      console.log("[PINECONE] Creating index...");
      await pc.createIndexForModel({
        name: indexName,
        cloud: "aws",
        region: "us-east-1",
        embed: {
          model: "llama-text-embed-v2",
          fieldMap: { text: "chunk_text" }
        },
        waitUntilReady: true
      });
      console.log("[PINECONE] Index created");
    } else {
      console.log("[PINECONE] Index exists");
    }

  } catch (err) {
    if (String(err.message).includes("ALREADY_EXISTS")) {
      console.log("[PINECONE] Index already exists (409 ignored)");
      return;
    }
    console.error("[PINECONE] Init error:", err.message);
    throw err;
  }
}

module.exports = initPinecone;
