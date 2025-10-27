import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const sizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
};
export function BadgeDisplay({ badges, maxVisible = 3, size = 'md', showTooltip = true }) {
    const visibleBadges = badges.slice(0, maxVisible);
    const remainingCount = badges.length - maxVisible;
    if (badges.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "flex items-center gap-2", children: [visibleBadges.map((badge) => (_jsx("div", { className: `${sizeClasses[size]} ${showTooltip ? 'cursor-help' : ''}`, title: showTooltip ? `${badge.name}: ${badge.description}` : undefined, "aria-label": `${badge.name}: ${badge.description}`, children: badge.icon }, badge.id))), remainingCount > 0 && (_jsxs("span", { className: "text-sm text-gray-400", children: ["+", remainingCount] }))] }));
}
export function BadgeGrid({ badges, columns = 3 }) {
    if (badges.length === 0) {
        return (_jsx("div", { className: "py-8 text-center text-gray-400", children: "No badges earned yet" }));
    }
    return (_jsx("div", { className: "grid gap-4", style: { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }, children: badges.map((badge) => (_jsx("div", { className: "hover:bg-gray-750 p-4 transition-colors bg-gray-800 rounded-lg", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "shrink-0 text-3xl", children: badge.icon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-semibold text-white truncate", children: badge.name }), _jsx("p", { className: "mt-1 text-sm text-gray-400", children: badge.description }), _jsxs("div", { className: "mt-2 text-xs text-gray-500", children: ["Earned ", new Date(badge.awarded_at).toLocaleDateString()] })] })] }) }, badge.id))) }));
}
export function BadgeList({ badges }) {
    if (badges.length === 0) {
        return (_jsx("div", { className: "py-4 text-center text-gray-400", children: "No badges earned yet" }));
    }
    return (_jsx("div", { className: "space-y-2", children: badges.map((badge) => (_jsxs("div", { className: "hover:bg-gray-750 flex items-center gap-3 p-3 transition-colors bg-gray-800 rounded-lg", children: [_jsx("div", { className: "shrink-0 text-2xl", children: badge.icon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-semibold text-white", children: badge.name }), _jsx("div", { className: "text-sm text-gray-400", children: badge.description })] }), _jsx("div", { className: "text-xs text-gray-500", children: new Date(badge.awarded_at).toLocaleDateString() })] }, badge.id))) }));
}
