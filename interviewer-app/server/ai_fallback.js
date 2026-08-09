import { GoogleGenAI } from '@google/genai';

let geminiClients = [];
let currentGeminiIndex = 0;

export const initAI = () => {
    const keysStr = process.env.GEMINI_API_KEY || '';
    const keys = keysStr.split(',').map(k => k.trim()).filter(k => k);
    if (keys.length === 0) {
        console.warn("No GEMINI_API_KEY provided");
    }
    geminiClients = keys.map(key => new GoogleGenAI({ apiKey: key }));
    currentGeminiIndex = 0;
};

export const getGeminiClient = () => {
    if (geminiClients.length === 0) return null;
    return geminiClients[currentGeminiIndex];
};

export const rotateGeminiClient = () => {
    if (geminiClients.length > 0) {
        currentGeminiIndex = (currentGeminiIndex + 1) % geminiClients.length;
        console.log(`Rotated to Gemini API key index ${currentGeminiIndex}`);
    }
};

export const generateContentWithFallback = async (model, contents, config) => {
    let lastError = null;

    // 1. Try Gemini Clients
    for (let i = 0; i < geminiClients.length; i++) {
        const client = getGeminiClient();
        try {
            const response = await client.models.generateContent({
                model,
                contents,
                config
            });
            return response.text;
        } catch (error) {
            console.warn(`Gemini Key ${currentGeminiIndex} failed:`, error.message);
            lastError = error;
            rotateGeminiClient();
        }
    }

    // 2. Fallback to Groq (fast, free, reliable) — rotates through all keys
    const groqKeysStr = process.env.GROQ_API_KEY || '';
    const groqKeys = groqKeysStr.split(',').map(k => k.trim()).filter(k => k);
    if (groqKeys.length > 0) {
        for (let gi = 0; gi < groqKeys.length; gi++) {
            console.log(`Trying Groq API key ${gi + 1}/${groqKeys.length}...`);
            try {
                let groqMessages = [];
                if (config?.systemInstruction) {
                    groqMessages.push({ role: 'system', content: config.systemInstruction });
                }
                if (typeof contents === 'string') {
                    groqMessages.push({ role: 'user', content: contents });
                } else if (Array.isArray(contents)) {
                    contents.forEach(msg => {
                        groqMessages.push({
                            role: msg.role === 'model' ? 'assistant' : 'user',
                            content: msg.parts[0].text
                        });
                    });
                }

                const groqBody = {
                    model: 'llama-3.1-70b-versatile',
                    messages: groqMessages,
                    temperature: config?.temperature || 0.7,
                };
                if (config?.responseMimeType === "application/json") {
                    groqBody.response_format = { type: "json_object" };
                }

                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${groqKeys[gi]}`
                    },
                    body: JSON.stringify(groqBody)
                });

                if (!groqRes.ok) {
                    const text = await groqRes.text();
                    throw new Error(`Groq API Error: ${groqRes.status} - ${text}`);
                }

                const groqData = await groqRes.json();
                console.log(`Groq key ${gi + 1} succeeded!`);
                return groqData.choices[0].message.content;

            } catch (error) {
                console.error(`Groq key ${gi + 1} failed:`, error.message);
                lastError = error;
            }
        }
    }

    // 3. Fallback to Freemodel API (with retry)
    const freemodelKey = process.env.FREEMODEL_API_KEY;
    if (freemodelKey) {
        console.log("Falling back to Freemodel API...");
        let openaiMessages = [];
        
        if (config?.systemInstruction) {
            openaiMessages.push({ role: 'system', content: config.systemInstruction });
        }

        if (typeof contents === 'string') {
            openaiMessages.push({ role: 'user', content: contents });
        } else if (Array.isArray(contents)) {
            contents.forEach(msg => {
                openaiMessages.push({
                    role: msg.role === 'model' ? 'assistant' : 'user',
                    content: msg.parts[0].text
                });
            });
        }

        let responseFormat;
        if (config?.responseMimeType === "application/json") {
            responseFormat = { type: "json_object" };
        }

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const res = await fetch('https://api.freemodel.dev/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${freemodelKey}`
                    },
                    body: JSON.stringify({
                        model: 'gemini-1.5-pro',
                        messages: openaiMessages,
                        temperature: config?.temperature || 0.7,
                        response_format: responseFormat
                    })
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Freemodel API Error: ${res.status} - ${text}`);
                }

                const data = await res.json();
                return data.choices[0].message.content;

            } catch (error) {
                console.error(`Freemodel API fallback attempt ${attempt} failed:`, error.message);
                lastError = error;
                if (attempt < maxRetries && (error.message.includes('503') || error.message.includes('429'))) {
                    console.log(`Waiting ${2000 * attempt}ms before retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                } else {
                    break;
                }
            }
        }
    }

    console.warn("ALL AI ENDPOINTS FAILED. USING MOCK FALLBACK.");
    if (config?.responseMimeType === "application/json") {
        const isParseTracker = config.systemInstruction && config.systemInstruction.includes("isNewQuestion");
        if (isParseTracker) {
            return JSON.stringify({ "isNewQuestion": true, "targetedDay": 1 });
        }
        return JSON.stringify({
            score: 80,
            summary: "[MOCK REPORT] The AI provider is currently offline, so this is a simulated fallback report. The candidate communicated well despite the outage.",
            strengths: ["Maintained composure during a 503 system outage."],
            gaps: ["Actual technical evaluation unavailable due to API limits."],
            next: ["Wait 5 minutes for the Freemodel container to spin back up, or add a real Gemini key."],
            revisionDeck: [{ topic: "Resiliency", concept: "Handling external API outages gracefully." }]
        });
    } else {
        const isOpening = (typeof contents === 'string' && contents.toLowerCase().includes("ready to begin")) || 
                          (Array.isArray(contents) && contents.length <= 1);
        if (isOpening) {
            return "Welcome to the technical interview! To kick things off: Could you briefly walk me through your technical background and the most challenging system architecture problem you solved in your recent projects?";
        }
        return "I am experiencing a temporary connection issue with my AI backend (503 Outage). Could you elaborate on your last point, or perhaps we can move on to the next topic while the connection restores?";
    }
};

export const embedContentWithFallback = async (query) => {
    let lastError = null;

    for (let i = 0; i < geminiClients.length; i++) {
        const client = getGeminiClient();
        try {
            const response = await client.models.embedContent({
                model: 'text-embedding-004',
                contents: query
            });
            return response.embeddings[0].values;
        } catch (error) {
            console.warn(`Gemini Embedding Key ${currentGeminiIndex} failed:`, error.message);
            lastError = error;
            rotateGeminiClient();
        }
    }
    
    throw new Error(`All embedding keys failed. Last error: ${lastError?.message}`);
};
