import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function EmptyState({ title = 'No clips found', message = 'Try adjusting your filters or check back later.', icon }) {
    return (_jsxs("div", { className: "text-center py-12", children: [icon && (_jsx("div", { className: "flex justify-center mb-4 text-muted-foreground", children: icon })), _jsx("h3", { className: "text-xl font-semibold mb-2", children: title }), _jsx("p", { className: "text-muted-foreground", children: message })] }));
}
