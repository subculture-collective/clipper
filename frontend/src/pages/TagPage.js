import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { Container } from '../components';
export function TagPage() {
    const { tagSlug } = useParams();
    return (_jsxs(Container, { className: "py-8", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("h1", { className: "text-3xl font-bold mb-2", children: ["Tag: #", tagSlug] }), _jsxs("p", { className: "text-muted-foreground", children: ["Viewing clips with tag: ", tagSlug] })] }), _jsxs("div", { className: "text-center text-muted-foreground py-12", children: [_jsx("p", { className: "text-lg", children: "Tagged clips coming soon..." }), _jsx("p", { className: "text-sm mt-2", children: "This is a placeholder for tag-filtered clips." })] })] }));
}
