import { GoogleGenAI } from "@google/genai";

// NOTE: In a real production app, you should NEVER expose your API key in the frontend code.
// Requests should go through your own backend which holds the key.
// For this demo structure, we assume the environment variable is available or we use a placeholder.
// The prompt says "Correct environment variable configuration", but in a pure frontend generated response,
// we often can't set .env files on the server. I will code this to use process.env.API_KEY.

const apiKey = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;
try {
    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
    }
} catch (error) {
    console.error("Failed to initialize Gemini Client", error);
}

export const generateGeminiResponse = async (prompt: string): Promise<string> => {
  if (!ai) {
    return "I'm sorry, my brain (API Key) is missing. Please configure the API_KEY.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "I didn't have anything to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I encountered an error thinking about that.";
  }
};