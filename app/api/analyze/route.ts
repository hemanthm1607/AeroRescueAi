import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { validateAnalysisResult } from "@/lib/validate";
import type { ApiAnalyzeResponse } from "@/types";

const VISION_MODEL = "gemini-3.1-flash-lite";

const ANALYSIS_PROMPT = `
Analyze this flood/disaster image for rescue operations.

Return a JSON object with exactly these keys:

peopleDetected: integer
urgentPeople: integer
floodSeverity: one of LOW, MEDIUM, HIGH, CRITICAL
waterCondition: string
rescuePriority: one of LOW, MEDIUM, HIGH, CRITICAL
hazards: array of objects
recommendations: array of strings
summary: string
disasterType: string describing the disaster visible (e.g. Flood, Earthquake, Landslide, Cyclone, Fire, or Other)

Each hazard object must contain:
name: string
description: string
severity: one of LOW, MEDIUM, HIGH, CRITICAL

Example format:

{
  "peopleDetected": 3,
  "urgentPeople": 1,
  "floodSeverity": "HIGH",
  "waterCondition": "Deep and muddy floodwater",
  "rescuePriority": "HIGH",
  "hazards": [
    {
      "name": "Floodwater",
      "description": "Deep moving water creates a drowning risk.",
      "severity": "HIGH"
    }
  ],
  "recommendations": [
    "Deploy rescue personnel to the affected area.",
    "Avoid entering deep moving water."
  ],
  "summary": "The image shows significant flooding with people potentially requiring assistance. Rescue teams should assess the area and prioritize people in immediate danger.",
  "disasterType": "Flood"
}

CRITICAL RULES:
- Return JSON only, no markdown.
- Do not invent people that are not clearly visible in the image.
- Count only people you can see with reasonable clarity.
- peopleDetected must be an integer (0 if no people visible).
- urgentPeople must be an integer, cannot exceed peopleDetected.
- floodSeverity: assess water depth, flow speed, turbidity. Use LOW for minor water, MEDIUM for ankle-to-knee depth, HIGH for waist-to-chest, CRITICAL for overhead/dangerous conditions.
- waterCondition: describe the actual visible water state (color, depth, flow, hazards).
- rescuePriority: based on people count, hazards, and visible risks.
- hazards: list only actual visible threats (water, debris, structures, etc.).
- recommendations: actionable rescue/safety guidance based on visible conditions.
- disasterType: identify from image evidence only (Flood, Earthquake, Landslide, Cyclone, Fire, Other).
- Always include every required key.
- If no people are visible, use 0.
- If no hazards are visible, return an empty hazards array.
- Be conservative: if uncertain, mark as uncertain in the recommendation rather than guessing.
`;

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiAnalyzeResponse>> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("[analyze] GEMINI_API_KEY is not set");

    return NextResponse.json(
      {
        success: false,
        error:
          "AI service is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }

  let imageBase64: string;
  let mimeType: string;

  try {
    const body = await req.json();

    imageBase64 = body.imageBase64;
    mimeType = body.mimeType ?? "image/jpeg";

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid imageBase64 field.",
        },
        { status: 400 }
      );
    }

    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedMimes.includes(mimeType)) {
      mimeType = "image/jpeg";
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: VISION_MODEL });

    const generationConfig = {
      temperature: 0.1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    };

    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: ANALYSIS_PROMPT,
            },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig,
    });

    const rawContent = response.response.text();

    if (!rawContent) {
      console.error("[analyze] Empty response from Gemini");

      return NextResponse.json(
        {
          success: false,
          error: "AI returned an empty response. Please try again.",
        },
        { status: 502 }
      );
    }

    console.log("[analyze] Gemini response:", rawContent);

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent);
    } catch (parseError) {
      console.error(
        "[analyze] JSON parsing failed:",
        parseError,
        rawContent
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "AI response format was invalid. Please retry the analysis.",
        },
        { status: 502 }
      );
    }

    const result = validateAnalysisResult(parsed);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    const error = err as Error & {
      status?: number;
      code?: string;
      message?: string;
    };

    console.error("[analyze] Gemini API error:", error);

    const errorMessage = error.message || "Unknown error";

    if (error.status === 401 || errorMessage.includes("401") || errorMessage.includes("API key")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid API key. Please check your GEMINI_API_KEY configuration.",
        },
        { status: 401 }
      );
    }

    if (error.status === 400 || errorMessage.includes("400")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI model rejected the request. Check the image size or format.",
        },
        { status: 400 }
      );
    }

    if (error.status === 404 || errorMessage.includes("404")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected Gemini model is unavailable.",
        },
        { status: 404 }
      );
    }

    if (error.status === 429 || errorMessage.includes("429") || errorMessage.includes("quota")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI service rate limit reached. Please wait a moment and retry.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `AI analysis failed: ${errorMessage}. Please try again.`,
      },
      { status: 500 }
    );
  }
}