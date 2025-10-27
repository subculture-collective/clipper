import { jsx as _jsx } from "react/jsx-runtime";
import { Container } from '../components';
import { ClipFeed } from '../components/clip';
export function TopFeedPage() {
    return (_jsx(Container, { className: "py-8", children: _jsx(ClipFeed, { title: "Top Clips", description: "Top rated clips", defaultSort: "top", defaultTimeframe: "day" }) }));
}
