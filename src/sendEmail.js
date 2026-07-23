const nodemailer = require("nodemailer");

const RECIPIENT = process.env.DIGEST_RECIPIENT || "ai.token.mahabub@gmail.com";

function formatDateForSubject() {
  return new Date().toLocaleDateString("bn-BD", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(stories, dateStr) {
  const rows = stories
    .map((s, i) => {
      const title = escapeHtml(s.title || "শিরোনাম নেই");
      const summary = escapeHtml(s.summary || "");
      const source = escapeHtml(s.source || "");
      const link = s.link || "#";
      return `
        <tr>
          <td style="padding:18px 0;border-bottom:1px solid #e5e5e5;">
            <div style="font-size:12px;letter-spacing:.04em;color:#0a7a4b;font-weight:600;margin-bottom:4px;">
              ${i + 1}. ${source}
            </div>
            <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:6px;line-height:1.4;">
              ${title}
            </div>
            <div style="font-size:14px;color:#3d3d3d;line-height:1.7;margin-bottom:8px;">
              ${summary}
            </div>
            <a href="${link}" style="font-size:13px;color:#0a7a4b;text-decoration:none;font-weight:600;">
              বিস্তারিত পড়ুন &rarr;
            </a>
          </td>
        </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="bn">
  <body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Noto Sans Bengali','Nirmala UI',Georgia,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#0a7a4b;padding:24px 28px;">
                <div style="color:#ffffff;font-size:20px;font-weight:700;">🇧🇩 বাংলাদেশ সংবাদ সংক্ষিপ্তসার</div>
                <div style="color:#d7f0e3;font-size:13px;margin-top:4px;">${dateStr}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 4px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px 28px;font-size:11px;color:#999;">
                প্রতিদিন সকালে আপনার Bangladesh News AI Agent (Claude + GitHub Actions) দ্বারা স্বয়ংক্রিয়ভাবে তৈরি। সারসংক্ষেপগুলো পাবলিক RSS হেডলাইন থেকে AI দ্বারা তৈরি, তাই সম্পূর্ণ বিস্তারিত জানতে মূল লিংকে যান।
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildPlainText(stories, dateStr) {
  const lines = stories.map((s, i) => {
    return `${i + 1}. ${s.title} (${s.source})\n${s.summary}\nবিস্তারিত: ${s.link}\n`;
  });
  return `বাংলাদেশ সংবাদ সংক্ষিপ্তসার -- ${dateStr}\n\n${lines.join("\n")}`;
}

async function sendDigestEmail(stories) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variable / secret.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const dateStr = formatDateForSubject();

  await transporter.sendMail({
    from: `"Bangladesh News AI Agent" <${user}>`,
    to: RECIPIENT,
    subject: `🇧🇩 বাংলাদেশ সংবাদ সংক্ষিপ্তসার -- ${dateStr}`,
    text: buildPlainText(stories, dateStr),
    html: buildHtml(stories, dateStr),
  });
}

module.exports = { sendDigestEmail };
