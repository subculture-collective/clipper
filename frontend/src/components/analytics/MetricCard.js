import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const MetricCard = ({ title, value, subtitle, icon, trend, className = '', }) => {
    return (_jsxs("div", { className: `bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h3", { className: "text-sm font-medium text-gray-600 dark:text-gray-400", children: title }), icon && (_jsx("div", { className: "text-gray-400 dark:text-gray-500", children: icon }))] }), _jsxs("div", { className: "flex items-baseline justify-between", children: [_jsx("p", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: typeof value === 'number' ? value.toLocaleString() : value }), trend && (_jsxs("span", { className: `text-sm font-medium ${trend.isPositive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'}`, children: [trend.isPositive ? '+' : '', trend.value, "%"] }))] }), subtitle && (_jsx("p", { className: "mt-2 text-sm text-gray-500 dark:text-gray-400", children: subtitle }))] }));
};
export default MetricCard;
