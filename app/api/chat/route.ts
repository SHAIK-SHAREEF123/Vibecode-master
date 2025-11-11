export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface EnhancePromptRequest {
  prompt: string;
  context?: {
    fileName?: string;
    language?: string;
    codeContent?: string;
  };
}

async function generateAIResponse(messages: ChatMessage[]) {
  const systemPrompt = `You are an expert AI coding assistant...`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
  const prompt = fullMessages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n");

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini AI error:", error);
    throw new Error("Failed to generate response using Gemini");
  }
}

async function enhancePrompt(request: EnhancePromptRequest) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const enhancementPrompt = `
You are a prompt enhancement assistant...
Original prompt: "${request.prompt}"
Context: ${request.context ? JSON.stringify(request.context, null, 2) : "No additional context"}
`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: enhancementPrompt }],
        },
      ],
    });

    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini prompt enhancement error:", error);
    return request.prompt;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Enhancement
    if (body.action === "enhance") {
      const enhanced = await enhancePrompt(body as EnhancePromptRequest);
      return NextResponse.json({ enhancedPrompt: enhanced });
    }

    // Chat
    const { message, history } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const validHistory = Array.isArray(history)
      ? history.filter(
          (msg: any) =>
            msg && typeof msg === "object" && ["user", "assistant"].includes(msg.role)
        )
      : [];

    const messages: ChatMessage[] = [...validHistory.slice(-10), { role: "user", content: message }];

    const aiResponse = await generateAIResponse(messages);

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in AI chat route:", error);

    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "AI Chat API is running",
    timestamp: new Date().toISOString(),
  });
}
