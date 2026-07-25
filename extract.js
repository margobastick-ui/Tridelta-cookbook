// Cloudflare Pages Function — proxies /api/extract to the Anthropic API.
// Requires an ANTHROPIC_API_KEY secret (Pages project settings > Environment variables).
// Keeping the API key server-side means it's never exposed to the browser.

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "Server is missing ANTHROPIC_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { image, text } = body;

  const instruction = `You are helping organize a community cookbook. Read the recipe ${
    image ? "in the attached image" : "in the text below"
  } and return ONLY a raw JSON object (no markdown fences, no commentary) with exactly these keys:
{
  "recipeName": string,
  "prepTime": string (e.g. "15 min", empty string if unknown),
  "cookTime": string (e.g. "30 min", empty string if unknown),
  "servings": string (e.g. "4", empty string if unknown),
  "difficulty": one of "Easy","Medium","Hard",
  "category": one of "app","main","side","dessert","breakfast","drink","other",
  "ingredients": array of clean ingredient strings, one item per line, standardized quantities,
  "instructions": array of clean, numbered-in-order step strings (do not include numbers, just the step text),
  "notes": string (any tips, substitutions, or storage notes mentioned; empty string if none)
}
Clean up spelling, remove clutter, and standardize measurement abbreviations. If information is missing, use your best reasonable judgment or leave it blank — never invent implausible details.${
    text ? `\n\nRECIPE TEXT:\n${text}` : ""
  }`;

  const content = image
    ? [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
        { type: "text", text: instruction },
      ]
    : instruction;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: "Anthropic API error", detail: errText }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const textBlock = data.content.find((b) => b.type === "text");
    if (!textBlock) {
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Response.json(parsed);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Extraction failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
