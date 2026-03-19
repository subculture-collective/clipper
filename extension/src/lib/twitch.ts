/**
 * Twitch URL detection utilities.
 * Identifies Twitch clip URLs and extracts clip identifiers.
 */

import type { TwitchClipInfo } from '../types';

/**
 * Regex patterns for Twitch clip URLs.
 *   1. https://www.twitch.tv/{channel}/clip/{clipId}
 *   2. https://clips.twitch.tv/{clipId}
 */
const TWITCH_CHANNEL_CLIP_RE =
  /^https:\/\/(?:www\.)?twitch\.tv\/([^/]+)\/clip\/([A-Za-z0-9_-]+)/;
const TWITCH_CLIPS_RE =
  /^https:\/\/clips\.twitch\.tv\/([A-Za-z0-9_-]+)/;

/**
 * Checks whether a URL is a Twitch clip URL.
 */
export function isTwitchClipUrl(url: string): boolean {
  return TWITCH_CHANNEL_CLIP_RE.test(url) || TWITCH_CLIPS_RE.test(url);
}

/**
 * Extracts Twitch clip information from a URL.
 * Returns `null` if the URL is not a valid Twitch clip URL.
 */
export function extractTwitchClipInfo(url: string): TwitchClipInfo | null {
  const channelMatch = TWITCH_CHANNEL_CLIP_RE.exec(url);
  if (channelMatch) {
    return {
      clipId: channelMatch[2],
      clipUrl: url.split('?')[0], // strip query params
      channel: channelMatch[1],
    };
  }

  const clipMatch = TWITCH_CLIPS_RE.exec(url);
  if (clipMatch) {
    return {
      clipId: clipMatch[1],
      clipUrl: url.split('?')[0],
    };
  }

  return null;
}
