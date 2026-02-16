import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a question formatter for a university course called "התנהגות ארגונית מיקרו" (Micro Organizational Behavior).

Your job is to take free-form text and extract/standardize ALL multiple-choice questions found in it into a JSON array.

Rules:
- Extract EVERY question you can identify from the text.
- Each question must be in Hebrew.
- CRITICAL: Preserve the EXACT number of options each question has. If a question has 5 options (א–ה), output 5 options. If it has 3, output 3. Do NOT add or remove options. Only when generating new questions from topics/concepts, default to 4.
- One option must be correct (correctAnswerIndex is 0-based).
- When the user provides existing questions with marked answers, keep ALL original options and their order. Set correctAnswerIndex to match the marked correct answer.
- When generating NEW questions from concepts/topics (no existing options provided), randomize the correct answer position across 0, 1, 2, 3.
- Clean up the text: fix typos and grammar, make questions clear and concise, but do NOT restructure or drop any options.
- Keep the academic level appropriate for a university course.
- If only one question is found, still return it as an array with one element.

Output ONLY a JSON array (no explanation, no markdown, no wrapping text). Examples:

4-option question:
{"question": "...", "options": ["א", "ב", "ג", "ד"], "correctAnswerIndex": 1}

5-option question:
{"question": "...", "options": ["א", "ב", "ג", "ד", "ה"], "correctAnswerIndex": 4}`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 10000,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "OpenAI API error", details: errData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("OpenAI route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
