/**
 * Known link-preview crawlers and bots.
 * Previews must not be counted as human konfigurator visits / unique customers.
 */

const BOT_PATTERNS: RegExp[] = [
  /facebookexternalhit/i,
  /facebot/i,
  /meta-externalagent/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /slack-imgproxy/i,
  /discordbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /pinterest/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /vkshare/i,
  /w3c_validator/i,
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /baiduspider/i,
  /applebot/i,
  /petalbot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /chatgpt-user/i,
  /preview/i,
  /crawler/i,
  /spider/i,
  /bot\b/i,
  /headlesschrome/i,
];

export type BotClassification = {
  isBot: boolean;
  matchedPattern: string | null;
  kind: "human" | "link_preview" | "crawler";
};

export function classifyUserAgent(
  userAgent: string | null | undefined,
): BotClassification {
  if (!userAgent || !userAgent.trim()) {
    // Empty UA is ambiguous — treat as non-human for attribution safety
    return {
      isBot: true,
      matchedPattern: "empty_ua",
      kind: "crawler",
    };
  }

  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      const previewLike =
        /facebookexternalhit|facebot|meta-externalagent|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|embedly|preview/i.test(
          userAgent,
        );
      return {
        isBot: true,
        matchedPattern: pattern.source,
        kind: previewLike ? "link_preview" : "crawler",
      };
    }
  }

  return { isBot: false, matchedPattern: null, kind: "human" };
}
