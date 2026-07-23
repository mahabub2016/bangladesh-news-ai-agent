# Bangladesh News AI Agent

Runs automatically every morning at **7:00 AM EST** via GitHub Actions.
It pulls fresh headlines from five Bangla-language Bangladesh news outlets,
asks Claude to pick the **top 10** most significant stories and write a tight
2-3 sentence summary for each **in Bangla** (with a "বিস্তারিত পড়ুন" link back
to the original article), and emails the digest to **ai.token.mahabub@gmail.com**.

## How it works

```
src/fetchNews.js   -> pulls & merges RSS feeds (প্রথম আলো, কালের কণ্ঠ, যুগান্তর,
                       বাংলানিউজ২৪, দ্য ডেইলি স্টার বাংলা), dedupes, sorts by date
src/summarize.js   -> sends candidates to Claude (Anthropic API), gets back
                       JSON: top 10 stories with 2-3 sentence Bangla summaries
src/sendEmail.js   -> renders a Bangla HTML email and sends it via Gmail SMTP
src/index.js        -> orchestrates the three steps above
.github/workflows/daily-digest.yml -> cron job that runs it every morning
```

### How the 7:00 AM EST/EDT schedule works

GitHub Actions cron always runs in UTC and has no concept of US daylight
saving, so a single fixed cron line can't stay pinned to "7:00 AM Eastern"
year-round. This workflow works around that with an **auto-switching**
setup:

1. It's scheduled to fire at **both** `11:00 UTC` and `12:00 UTC` every day
   -- one of those is always 7:00 AM Eastern, depending on whether it's
   EDT (UTC-4, roughly mid-March to early November) or EST (UTC-5, the
   rest of the year).
2. The first step, **Check local time**, computes the actual current hour
   in `America/New_York`. If it isn't 7 AM, every remaining step is skipped
   (no email sent, no API calls made) -- so only the correct one of the two
   daily triggers actually does anything.
3. Manually running it from the **Actions** tab (`workflow_dispatch`)
   always runs regardless of the time check, so you can test it anytime.

No maintenance needed across the DST switch -- it just keeps landing on
7:00 AM on your wall clock.

If an RSS source is down or renamed, that one feed is skipped (logged as a
warning) and the rest still run -- the whole job won't fail because of one
dead feed.

## One-time setup

### 1. Create the GitHub repo

```bash
# from inside this folder
git init
git add .
git commit -m "Initial commit: Bangladesh News AI Agent"
git branch -M main
git remote add origin https://github.com/mahabub2016/bangladesh-news-ai-agent.git
git push -u origin main
```

(Create the empty repo `bangladesh-news-ai-agent` under
[github.com/mahabub2016](https://github.com/mahabub2016) first, or use
`gh repo create bangladesh-news-ai-agent --public --source=. --push` if you
have the GitHub CLI installed.)

### 2. Get an Anthropic API key

1. Go to <https://console.anthropic.com/settings/keys> and create a key.
2. This is a paid API (separate from your Claude.ai subscription) -- each
   run costs a small fraction of a cent, well under the free credits most
   new accounts get.

### 3. Create a Gmail App Password (do NOT use your real Gmail password)

1. Turn on 2-Step Verification on the sending Gmail account, if not already on:
   <https://myaccount.google.com/security>
2. Generate an app password: <https://myaccount.google.com/apppasswords>
3. Copy the 16-character password (no spaces).

> You can use `ai.token.mahabub@gmail.com` itself as the sender, or a
> different Gmail account -- either works, since the recipient is set
> separately.

### 4. Add repository secrets

In your GitHub repo: **Settings -> Secrets and variables -> Actions -> New
repository secret**. Add these four:

| Secret name           | Value                                              |
|------------------------|-----------------------------------------------------|
| `ANTHROPIC_API_KEY`    | Your Anthropic API key from step 2                  |
| `GMAIL_USER`           | The Gmail address that will send the email          |
| `GMAIL_APP_PASSWORD`   | The 16-character app password from step 3           |
| `DIGEST_RECIPIENT`     | `ai.token.mahabub@gmail.com` (optional -- this is already the default in code if you skip it) |

### 5. Enable the workflow and test it

1. Push the code (step 1). The workflow file is already in
   `.github/workflows/daily-digest.yml`.
2. Go to the **Actions** tab in your repo, select **Bangladesh News Daily
   Digest**, and click **Run workflow** to trigger it manually and confirm
   you get the email.
3. After that, it will run automatically every day at 7:00 AM Bangladesh
   time (01:00 UTC) -- no further action needed.

## Running it locally (optional, for testing)

```bash
cd bangladesh-news-ai-agent
npm install
cp .env.example .env   # then fill in your real keys in .env
npm start
```

## Customizing

- **Change the schedule:** edit the `cron` lines and/or the target hour
  (`"07"`) in the "Check local time" step of
  `.github/workflows/daily-digest.yml`.
- **Add/remove news sources:** edit the `FEEDS` array in `src/fetchNews.js`.
- **Change story count, tone, or language:** edit the prompt in
  `src/summarize.js` (currently instructed to write in Bangla).
- **Change recipient:** update the `DIGEST_RECIPIENT` secret, or edit the
  default in `src/sendEmail.js`.

## Notes

- RSS feed URLs occasionally change when news sites redesign their sites.
  If a source stops showing up in your digest, check its feed URL and update
  `src/fetchNews.js`.
- Claude is instructed to summarize only from the title/snippet it's given
  (no fabrication), and to treat clear duplicate stories as one.
