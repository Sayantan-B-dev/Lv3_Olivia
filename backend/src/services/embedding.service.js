const { pipeline, Tensor } = require("@xenova/transformers");

let embedder = null;

async function generateVector(input) {
  try {
    if (!embedder) {
      embedder = await pipeline(
        "feature-extraction",
        "Xenova/all-mpnet-base-v2"
      );
      console.log("Embedding model loaded.");
    }

    if (!input || typeof input !== "string" || !input.trim()) {
      console.error("Invalid embedding input:", input);
      return null;
    }

    // Run embedding
    const output = await embedder(input, { pooling: 'mean' });

    // 'pooling: mean' returns [768]
    const vector = Array.from(output.data);

    if (vector.length !== 768) {
      console.error("Unexpected vector length:", vector.length);
      return null;
    }

    return vector;

  } catch (err) {
    console.error("Embedding error:", err.message);
    return null;
  }
}

module.exports = { generateVector };
