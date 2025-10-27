import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FeedHeader({ title, description }) {
    return (_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: title }), description && (_jsx("p", { className: "text-muted-foreground", children: description }))] }));
}
