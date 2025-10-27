import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
const DEFAULT_COLORS = [
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#6366f1',
];
const PieChartComponent = ({ data, title, height = 300, colors = DEFAULT_COLORS, }) => {
    return (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: title }), _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data, cx: "50%", cy: "50%", labelLine: false, label: ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`, outerRadius: 80, fill: "#8884d8", dataKey: "value", children: data.map((_, index) => (_jsx(Cell, { fill: colors[index % colors.length] }, `cell-${index}`))) }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#1f2937',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                            } }), _jsx(Legend, {})] }) })] }));
};
export default PieChartComponent;
