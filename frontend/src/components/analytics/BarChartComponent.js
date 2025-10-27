import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
const BarChartComponent = ({ data, title, valueLabel = 'Value', height = 300, color = '#8b5cf6', }) => {
    return (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: title }), _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(BarChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "name", stroke: "#6b7280", style: { fontSize: '12px' } }), _jsx(YAxis, { stroke: "#6b7280", style: { fontSize: '12px' } }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#1f2937',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                            } }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "value", name: valueLabel, fill: color, radius: [8, 8, 0, 0] })] }) })] }));
};
export default BarChartComponent;
