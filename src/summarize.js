const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-sonnet-4-6";

function buildPrompt(candidates) {
  const list = candidates
    .map((c, i) => {
      return [
        `[${i + 1}]`,
        `Title: ${c.title}`,
        `Source: ${c.source}`,
        `Snippet: ${c.snippet || "(no snippet available)"}`,
      ].join("\n");
    })
    .join("\n\n");

  return `You are curating a daily Bangladesh news digest for a busy professional. The digest must be written entirely in Bangla (বাংলা), in standard/formal written Bengali (লেখ্য বাংলা).

Below are recent headlines pulled from Bangla-language Bangladesh news coverage. Some may be duplicates covering the same story, low-importance filler, or non-news content. Your job:

1. Select the 10 most significant, genuinely newsworthy stories about Bangladesh (জাতীয় সংবাদ, রাজনীতি, অর্থনীতি, এবং বাংলাদেশ সম্পর্কিত গুরুত্বপূর্ণ আন্তর্জাতিক সংবাদ). Prefer national significance over celebrity/entertainment gossip unless nothing else qualifies.
2. If two entries clearly cover the same underlying story, treat them as one and pick whichever index has the better title/snippet.
3. For each selected story, write a clear, neutral 2-3 sentence summary IN BANGLA, based ONLY on the title and snippet given below. Do not invent facts, numbers, or quotes.
4. Keep each summary objective and concise -- no editorializing.
5. Do NOT repeat the link or URL anywhere -- just reference the candidate's bracketed number.

Candidates:

${list}

Respond with ONLY a JSON array (no markdown fences, no preamble/explanation) of exactly 10 objects, ordered by importance, in this exact shape. "index" must be the bracketed candidate number [n] above. "summary" must be written in Bangla:
[
  {"index": 1, "summary": "2-3 sentence summary (Bangla)"}
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

  let picks;
  try {
    picks = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse Claude's JSON response: ${err.message}\nRaw: ${cleaned}`);
  }

  if (!Array.isArray(picks) || picks.length === 0) {
    throw new Error("Claude did not return a non-empty array of picks.");
  }

  // Map each pick back to its original candidate to get the real title/link/
  // source -- Claude only ever had to output an index + summary, never the
  // long Google News redirect URL, which keeps the response small and exact.
  const stories = picks
    .map((pick) => {
      const candidate = candidates[pick.index - 1];
      if (!candidate) return null;
      return {
        title: candidate.title,
        summary: pick.summary,
        link: candidate.link,
        source: candidate.source,
      };
    })
    .filter(Boolean);

  if (stories.length === 0) {
    throw new Error("None of Claude's picks matched a valid candidate index.");
  }

  return stories;
}

module.exports = { summarizeTopStories };
