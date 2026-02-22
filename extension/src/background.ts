/**
 * Background service worker for the Clipper extension.
 *
 * Responsibilities:
 *  - Register and update the "Share to Clipper" context menu item.
 *  - Listen for context menu clicks and open the popup or a new tab.
 *  - Track the clip URL detected on the active tab so the popup can read it.
 */

import { isTwitchClipUrl, extractTwitchClipInfo } from './lib/twitch';
import type { TwitchClipInfo } from './types';

const MENU_ITEM_ID = 'share-to-clipper';

/** Stores the most recently detected clip per tab. */
const tabClips = new Map<number, TwitchClipInfo>();

// ─── Context Menu ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ITEM_ID,
    title: 'Share to Clipper',
    contexts: ['page', 'link'],
    documentUrlPatterns: [
      'https://www.twitch.tv/*/clip/*',
      'https://clips.twitch.tv/*',
    ],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ITEM_ID) return;

  // Prefer the link URL (right-click on a link), fall back to the page URL.
  const targetUrl = info.linkUrl ?? info.pageUrl ?? '';
  const clipInfo = extractTwitchClipInfo(targetUrl);

  if (clipInfo && tab?.id != null) {
    tabClips.set(tab.id, clipInfo);
  }

  // Open the extension popup by focusing the browser action.
  // Note: programmatic popup opening requires Manifest V3 special handling;
  // we use chrome.action.openPopup() when available (Chrome 99+).
  if (typeof chrome.action.openPopup === 'function') {
    chrome.action.openPopup();
  }
});

// ─── Tab Tracking ─────────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  if (isTwitchClipUrl(tab.url)) {
    const clipInfo = extractTwitchClipInfo(tab.url);
    if (clipInfo) {
      tabClips.set(tabId, clipInfo);
    }
    // Enable the action badge to signal that a clip is available.
    chrome.action.setBadgeText({ text: '▶', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#9146FF', tabId });
  } else {
    tabClips.delete(tabId);
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  tabClips.delete(tabId);
});

// ─── Message Passing ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_CLIP') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ clipInfo: null });
        return;
      }
      const clipInfo = tabClips.get(tab.id) ?? null;

      // Also check the tab URL directly if not already cached.
      if (!clipInfo && tab.url && isTwitchClipUrl(tab.url)) {
        const fresh = extractTwitchClipInfo(tab.url);
        if (fresh) tabClips.set(tab.id, fresh);
        sendResponse({ clipInfo: fresh });
      } else {
        sendResponse({ clipInfo });
      }
    });
    return true; // keep message channel open for async response
  }
  return false;
});
