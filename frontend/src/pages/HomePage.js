import { jsx as _jsx } from "react/jsx-runtime";
import { Container } from '../components';
import { ClipFeed } from '../components/clip';
export function HomePage() {
    return (_jsx(Container, { className: "py-8", children: _jsx(ClipFeed, { title: "Home Feed", description: "Discover the best Twitch clips", defaultSort: "hot" }) }));
}
