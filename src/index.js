require("dotenv").config();

const { fetchAllNews } = require("./fetchNews");
const { summarizeTopStories } = require("./summarize");
const { sendDigestEmail } = require("./sendEmail");

async function main() {
  console.log("[1/3] Fetching Bangladesh news from RSS feeds...");
  const candidates = await fetchAllNews(30);
  console.log(`      Collected ${candidates.length} candidate headlines.`);

  console.log("[2/3] Asking Claude to pick and summarize the top 10 stories...");
  const stories = await summarizeTopStories(candidates);
  console.log(`      Got ${stories.length} summarized stories.`);

  console.log("[3/3] Sending digest email...");
  await sendDigestEmail(stories);
  console.log("      Email sent successfully.");

  console.log("Done.");
}

main().catch((err) => {
  console.error("Bangladesh News AI Agent failed:", err);
  process.exit(1);
});
