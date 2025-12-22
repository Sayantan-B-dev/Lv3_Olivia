const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const cohortChatGPTIndex = pc.Index("cohort-chat-gpt");

async function createMemory({ vectors, metadata, messageId }) {
  return await cohortChatGPTIndex.upsert([{
    id: messageId,
    values: vectors,
    metadata
  }]);
}

async function queryMemory({ queryVector, limit = 5, filter }) {
  const data = await cohortChatGPTIndex.query({
    vector: queryVector,
    topK: limit,
    filter: filter || undefined,
    includeMetadata: true
  });

  return data.matches;
}

module.exports = {
  createMemory,
  queryMemory
};
