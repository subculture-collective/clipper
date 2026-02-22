/**
 * Clipper API client for the browser extension.
 *
 * All requests include `Authorization: Bearer <token>` obtained from the
 * Clipper access_token cookie.  The extension must declare host_permissions
 * for the API origin so Chrome relaxes CORS enforcement for extension contexts.
 */

import type {
  ClipMetadata,
  Tag,
  SubmitClipRequest,
  SubmissionResponse,
  ExtensionConfig,
} from '../types';

interface TagListResponse {
  success: boolean;
  data: Tag[];
  tags?: Tag[];
}

interface MetadataApiResponse {
  success: boolean;
  data: ClipMetadata;
}

/**
 * Fetches clip metadata from the Clipper API (which proxies Twitch).
 */
export async function fetchClipMetadata(
  clipUrl: string,
  token: string,
  config: ExtensionConfig
): Promise<ClipMetadata> {
  const url = `${config.apiBaseUrl}/submissions/metadata?url=${encodeURIComponent(clipUrl)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata: ${res.status}`);
  }
  const body = await res.json() as MetadataApiResponse;
  return body.data;
}

/**
 * Fetches the list of available tags from the Clipper API.
 */
export async function fetchTags(
  token: string,
  config: ExtensionConfig
): Promise<Tag[]> {
  const res = await fetch(`${config.apiBaseUrl}/tags?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const body = await res.json() as TagListResponse;
  return body.data ?? body.tags ?? [];
}

/**
 * Submits a clip to Clipper.
 */
export async function submitClip(
  request: SubmitClipRequest,
  token: string,
  config: ExtensionConfig
): Promise<SubmissionResponse> {
  const res = await fetch(`${config.apiBaseUrl}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });
  const body = await res.json() as SubmissionResponse;
  if (!res.ok) {
    throw new Error((body as unknown as { error?: string }).error ?? `Submission failed: ${res.status}`);
  }
  return body;
}
