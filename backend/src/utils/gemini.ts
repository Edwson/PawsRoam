import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("GEMINI_API_KEY is not set. PawsAI features will be disabled.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

const modelConfig = {
  // model: "gemini-pro", // Basic text model
  // model: "gemini-1.0-pro", // Or specify version
  model: "gemini-1.5-flash-latest", // Using a fast model for testing
  // safetySettings: [ // Optional: configure safety settings
  //   {
  //     category: HarmCategory.HARM_CATEGORY_HARASSMENT,
  //     threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  //   },
  // ],
  // generationConfig: { // Optional: configure generation parameters
  //   maxOutputTokens: 100,
  //   temperature: 0.9,
  //   topP: 0.1,
  //   topK: 16,
  // },
};

/**
 * Generates content based on a text prompt using the Gemini API.
 * @param promptText The text prompt to send to the model.
 * @returns The generated text response or an error message.
 */
export async function generateTextFromGemini(promptText: string): Promise<string> {
  if (!genAI) {
    return "Gemini API key not configured. PawsAI features are disabled.";
  }
  if (!promptText || promptText.trim() === "") {
    return "Prompt cannot be empty.";
  }

  try {
    const generativeModel = genAI.getGenerativeModel({ model: modelConfig.model });
    const result = await generativeModel.generateContent(promptText);
    const response = result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      // It's good to check if the error is an instance of Error
      if (error.message.includes("API key not valid")) {
         return "Gemini API Error: The API key is not valid. Please check your .env file.";
      }
      return `Gemini API Error: ${error.message}`;
    }
    return "Gemini API Error: An unknown error occurred.";
  }
}

// Example usage (can be called from a resolver or service)
// (async () => {
//   if (API_KEY) { // Only run if API_KEY is set
//     const samplePrompt = "Write a short story about a dog who discovers a magical park.";
//     console.log(`\nSending prompt to Gemini: "${samplePrompt}"`);
//     const response = await generateTextFromGemini(samplePrompt);
//     console.log("\nGemini Response:");
//     console.log(response);
//   }
// })();
