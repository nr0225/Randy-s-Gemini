import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Attachment {
  mimeType: string;
  data: string; // base64
  name: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  attachments?: Attachment[];
}

export async function* streamGeminiChat(
  message: string,
  attachments: Attachment[],
  context: string,
  history: ChatMessage[],
  userMemory: string,
  promptRuler: string,
  customInstructions: string
) {
  const systemInstruction = `You are a helpful AI assistant integrated into a web page sidebar.
You act as the user's personal agent.

User's Digital Identity & External Memory:
---
${userMemory || 'No memory recorded yet.'}
---

Prompt (Guidelines/Templates to follow):
---
${promptRuler || 'No specific prompts.'}
---

Custom Instructions for Gemini:
---
${customInstructions || 'No custom instructions.'}
---

Current Web Page Content:
---
${context}
---
Use this context, the user's memory, prompt ruler, and custom instructions to answer their questions, act as their agent, and help them with their tasks. 
If they ask you to remember something, acknowledge it and remind them they can also update their "Digital Identity" (數位身分與記憶體) panel to make it permanent.
You can understand images, audio, and video provided by the user.
You have access to Google Search and Google Maps tools. Use them when the user asks for real-time information, locations, navigation, or places.`;

  const contents = history.map((msg) => {
    const parts: any[] = [];
    if (msg.text) parts.push({ text: msg.text });
    if (msg.attachments) {
      msg.attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }
    return { role: msg.role, parts };
  });

  const currentParts: any[] = [];
  if (message) currentParts.push({ text: message });
  if (attachments && attachments.length > 0) {
    attachments.forEach(att => {
      currentParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      });
    });
  }

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  const responseStream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
    },
  });

  let groundingAppended = false;
  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }

    if (!groundingAppended) {
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        let groundingText = '\n\n**參考資料與地圖連結：**\n';
        let hasLinks = false;
        
        groundingChunks.forEach((gChunk: any) => {
          if (gChunk.web?.uri && gChunk.web?.title) {
            groundingText += `- [${gChunk.web.title}](${gChunk.web.uri})\n`;
            hasLinks = true;
          } else if (gChunk.maps?.uri) {
            const title = gChunk.maps.title || 'Google Maps 地點';
            groundingText += `- [📍 ${title}](${gChunk.maps.uri})\n`;
            hasLinks = true;
          }
        });
        
        if (hasLinks) {
          yield groundingText;
          groundingAppended = true;
        }
      }
    }
  }
}
