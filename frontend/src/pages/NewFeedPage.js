import { jsx as _jsx } from "react/jsx-runtime";
import { Container } from '../components';
import { ClipFeed } from '../components/clip';
export function NewFeedPage() {
    return (_jsx(Container, { className: "py-8", children: _jsx(ClipFeed, { title: "New Clips", description: "Latest clips from the community", defaultSort: "new" }) }));
}
