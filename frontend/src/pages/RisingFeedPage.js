import { jsx as _jsx } from "react/jsx-runtime";
import { Container } from '../components';
import { ClipFeed } from '../components/clip';
export function RisingFeedPage() {
    return (_jsx(Container, { className: "py-8", children: _jsx(ClipFeed, { title: "Rising Clips", description: "Clips trending upward", defaultSort: "rising" }) }));
}
