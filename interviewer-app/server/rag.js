import fs from 'fs';
import { embedContentWithFallback } from './ai_fallback.js';

const curriculum = JSON.parse(fs.readFileSync('./data/curriculum.json', 'utf8'));

let vectorStore = [];

// Cosine similarity between two vectors
const cosineSimilarity = (vecA, vecB) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const initializeRAG = async () => {
    console.log("Initializing RAG Vector Store...");
    
    // Check if we have cached embeddings to save API calls
    if (fs.existsSync('./data/embeddings.json')) {
        console.log("Loading cached embeddings...");
        vectorStore = JSON.parse(fs.readFileSync('./data/embeddings.json', 'utf8'));
        return;
    }

    console.log("Generating embeddings for curriculum...");
    const chunks = curriculum.days.map(day => ({
        id: day.day,
        text: `Day ${day.day}: ${day.title}. Type: ${day.type}. Tools: ${day.tools.join(', ')}. Objectives: ${day.objectives.join('; ')}`
    }));

    // Generate embeddings sequentially to avoid rate limits
    for (const chunk of chunks) {
        try {
            const embedding = await embedContentWithFallback(chunk.text);
            vectorStore.push({
                id: chunk.id,
                text: chunk.text,
                embedding: embedding
            });
            // Small delay to respect free tier rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`Failed to embed Day ${chunk.id}:`, error.message);
        }
    }
    
    // Save to cache
    fs.writeFileSync('./data/embeddings.json', JSON.stringify(vectorStore));
    console.log(`RAG initialized with ${vectorStore.length} vectors.`);
};

export const retrieveContext = async (query, topK = 3) => {
    if (vectorStore.length === 0) return [];
    
    try {
        const queryEmbedding = await embedContentWithFallback(query);
        
        // Calculate similarity for all chunks
        const scoredChunks = vectorStore.map(chunk => ({
            ...chunk,
            score: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        
        // Sort by highest score
        scoredChunks.sort((a, b) => b.score - a.score);
        
        // Return top K
        return scoredChunks.slice(0, topK);
    } catch (error) {
        console.error("RAG Retrieval Error:", error);
        return [];
    }
};
