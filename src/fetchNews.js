const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; BangladeshNewsAgent/1.0; +https://github.com/mahabub2016)",
  },
});

const FEEDS = [
  { name: "প্রথম আলো", url: "https://www.prothomalo.com/feed/" },
  { name: "কালের কণ্ঠ", url: "https://www.kalerkantho.com/rss.xml" },
  { name: "যুগান্তর", url: "https://www.jugantor.com/feed/rss.xml" },
  { name: "বাংলানিউজ২৪", url: "https://www.banglanews24.com/rss/rss.xml" },
  { name: "দ্য ডেইলি স্টার বাংলা", url: "https://bangla.thedailystar.net/rss" },
];

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).map((item) => ({
      title: (item.title || "").trim(),
      link: item.link || "",
      pubDate: item.pubDate ? new Date(item.pubDate) : null,
      snippet: (item.contentSnippet || item.content || "").replace(/\s+/g, " ").trim(),
      source: feed.name,
    }));
  } catch (err) {
    console.warn(`[fetchNews] Skipping "${feed.name}" (${feed.url}): ${err.message}`);
    return [];
  }
}

async function fetchAllNews(limit = 30) {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const allItems = results.flat();

  if (allItems.length === 0) {
    throw new Error(
      "No news items were fetched from any source. All RSS feeds failed or returned empty."
    );
  }

  const seen = new Set();
  const deduped = [];
  for (const item of allItems) {
    if (!item.title) continue;
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  deduped.sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));

  return deduped.slice(0, limit);
}

module.exports = { fetchAllNews, FEEDS };
