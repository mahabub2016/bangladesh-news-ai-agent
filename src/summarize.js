const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-sonnet-4-6";

function buildPrompt(candidates) {
  const list = candidates
    .map((c, i) => {
      return [
        `[${i + 1}]`,
        `Title: ${c.title}`,
        `Source: ${c.source}`,
        `Link: ${c.link}`,
        `Snippet: ${c.snippet || "(no snippet available)"}`,
      ].join("\n");
    })
    .join("\n\n");

  return `You are curating a daily Bangladesh news digest for a busy professional. The digest must be written entirely in Bangla (বাংলা), in standard/formal written Bengali (লেখ্য বাংলা), regardless of the language of the source snippets below.

Below are recent headlines pulled from multiple Bangla-language Bangladesh news outlets (প্রথম আলো, কালের কণ্ঠ, যুগান্তর, বাংলানিউজ২৪, দ্য ডেইলি স্টার বাংলা). Some may be duplicates covering the same story, low-importance filler, or non-news content (ads, section labels). Your job:

1. Select the 10 most significant, genuinely newsworthy stories about Bangladesh (জাতীয় সংবাদ, রাজনীতি, অর্থনীতি, এবং বাংলাদেশ সম্পর্কিত গুরুত্বপূর্ণ আন্তর্জাতিক সংবাদ)। Prefer national significance over celebrity/entertainment gossip unless nothing else qualifies.
2. If two entries clearly cover the same underlying story, treat them as one and pick the better-sourced link.
3. For each selected story, write the title and a clear, neutral 2-3 sentence summary IN BANGLA, based ONLY on the title and snippet given below. If the source text is already in Bangla, keep it in Bangla; do not translate into English. Do not invent facts, numbers, or quotes that are not implied by the source text.
4. Keep each summary objective and concise -- no editorializing.

Candidates:

${list}

Respond with ONLY a JSON array (no markdown fences, no preamble/explanation) of exactly 10 objects, ordered by importance, in this exact shape. All "title" and "summary" values must be written in Bangla:
[
  {"title": "string (Bangla)", "summary": "2-3 sentence summary (Bangla)", "link": "string", "source": "string"}
]`;
}

async function summarizeTopStories(candidates) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable / secret.");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: buildPrompt(candidates) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error("Claude response did not contain a text block.");
  }

  const cleaned = textBlock.text.replace(/^```json\s*|^```\s*|```$/gm, "").trim();

  let stories;
  try {
    stories = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse Claude's JSON response: ${err.message}\nRaw: ${cleaned}`);
  }

  if (!Array.isArray(stories) || stories.length === 0) {
    throw new Error("Claude did not return a non-empty array of stories.");
  }

  return stories;
}

module.exports = { summarizeTopStories };
