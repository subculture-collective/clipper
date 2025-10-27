import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Link } from "react-router-dom";
export const TagChip = ({ tag, size = "medium", removable = false, onRemove, onClick, }) => {
    const sizeClasses = {
        small: "text-xs px-2 py-0.5",
        medium: "text-sm px-3 py-1",
    };
    const baseClasses = `inline-flex items-center gap-1 rounded-full font-medium transition-all hover:opacity-80 ${sizeClasses[size]}`;
    const style = {
        backgroundColor: tag.color || "#4169E1",
        color: "#ffffff",
    };
    const handleClick = (e) => {
        if (onClick) {
            e.preventDefault();
            onClick(tag.slug);
        }
    };
    const handleRemove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onRemove) {
            onRemove(tag.slug);
        }
    };
    const content = (_jsxs(_Fragment, { children: [_jsx("span", { children: tag.name }), removable && (_jsx("button", { onClick: handleRemove, className: "ml-1 hover:bg-white/20 rounded-full p-0.5", "aria-label": `Remove ${tag.name} tag`, children: _jsx("svg", { className: "w-3 h-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) }))] }));
    if (onClick) {
        return (_jsx("button", { onClick: handleClick, className: baseClasses, style: style, children: content }));
    }
    return (_jsx(Link, { to: `/tags/${tag.slug}`, className: baseClasses, style: style, title: tag.description || `View clips tagged with ${tag.name}`, children: content }));
};
