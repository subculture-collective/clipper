/**
 * Content script injected into Twitch clip pages.
 *
 * Detects the clip URL from the current page and notifies the background
 * service worker so it can show the action badge and store clip info.
 * Sends `clipInfo: null` when the current page is not a clip, so the
 * background can clear stale badge/state on SPA navigation away.
 */

import { extractTwitchClipInfo } from './lib/twitch';

function notifyBackground(): void {
  const clipInfo = extractTwitchClipInfo(window.location.href) ?? null;

  chrome.runtime.sendMessage({
    type: 'TWITCH_CLIP_DETECTED',
    clipInfo,
  });
}

// Notify on initial load.
notifyBackground();

// Twitch is a SPA; watch for URL changes via History API patches.
const _pushState = history.pushState.bind(history);
history.pushState = function (...args) {
  _pushState(...args);
  notifyBackground();
};

window.addEventListener('popstate', notifyBackground);
