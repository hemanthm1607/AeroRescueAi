import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { validateAnalysisResult } from "@/lib/validate";
import type { ApiAnalyzeResponse } from "@/types";

const VISION_MODEL =
  process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.6-27b";

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

Rules:
- Return JSON only.
- Do not use markdown.
- peopleDetected must be an integer.
- urgentPeople must be an integer.
- urgentPeople cannot be greater than peopleDetected.
- Always include every required key.
- If no people are visible, use 0.
- If no hazards are visible, return an empty hazards array.
- disasterType must be based only on visible evidence in the image.
`;

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiAnalyzeResponse>> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("[analyze] GROQ_API_KEY is not set");

    return NextResponse.json(
      {
        success: false,
        error:
          "AI service is not configured. Add GROQ_API_KEY to .env.local and restart the dev server.",
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
    const groq = new Groq({
      apiKey,
    });

    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,

      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text",
              text: ANALYSIS_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],

      temperature: 0.1,
      max_tokens: 2048,

      response_format: {
        type: "json_object",
      },
      });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      console.error("[analyze] Empty response from Groq");

      return NextResponse.json(
        {
          success: false,
          error: "AI returned an empty response. Please try again.",
        },
        { status: 502 }
      );
    }

    console.log("[analyze] Groq response:", rawContent);

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
    };

    console.error("[analyze] Groq API error:", error);

    if (error.status === 401 || error.message?.includes("401")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid API key. Please check your GROQ_API_KEY configuration.",
        },
        { status: 401 }
      );
    }

    if (error.status === 400 || error.message?.includes("400")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI model rejected the request. Check the image size or model configuration.",
        },
        { status: 400 }
      );
    }

    if (error.status === 404 || error.message?.includes("404")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected Groq vision model is unavailable. Check GROQ_VISION_MODEL.",
        },
        { status: 404 }
      );
    }

    if (error.status === 429 || error.message?.includes("429")) {
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
        error: `AI analysis failed: ${
          error.message ?? "Unknown error"
        }. Please try again.`,
      },
      { status: 500 }
    );
  }
}