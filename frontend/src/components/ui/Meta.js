import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Helmet } from 'react-helmet-async';
const DEFAULT_TITLE = 'Clipper - Discover Gaming Highlights';
const DEFAULT_DESCRIPTION = 'Clipper is the best place to discover and share gaming highlights from Twitch. Browse clips by game, creator, or trending topics.';
const DEFAULT_IMAGE = '/og-image.png';
export function Meta({ title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, url, type = 'website', }) {
    const fullTitle = title === DEFAULT_TITLE ? title : `${title} | Clipper`;
    const fullUrl = url || window.location.href;
    return (_jsxs(Helmet, { children: [_jsx("title", { children: fullTitle }), _jsx("meta", { name: "title", content: fullTitle }), _jsx("meta", { name: "description", content: description }), _jsx("meta", { property: "og:type", content: type }), _jsx("meta", { property: "og:url", content: fullUrl }), _jsx("meta", { property: "og:title", content: fullTitle }), _jsx("meta", { property: "og:description", content: description }), _jsx("meta", { property: "og:image", content: image }), _jsx("meta", { property: "twitter:card", content: "summary_large_image" }), _jsx("meta", { property: "twitter:url", content: fullUrl }), _jsx("meta", { property: "twitter:title", content: fullTitle }), _jsx("meta", { property: "twitter:description", content: description }), _jsx("meta", { property: "twitter:image", content: image })] }));
}
