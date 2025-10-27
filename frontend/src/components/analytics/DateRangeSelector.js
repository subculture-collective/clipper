import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
const DEFAULT_OPTIONS = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: '1 Year', value: 365 },
];
const DateRangeSelector = ({ value, onChange, options = DEFAULT_OPTIONS, }) => {
    return (_jsx("div", { className: "inline-flex rounded-md shadow-sm", role: "group", children: options.map((option, index) => (_jsx("button", { type: "button", onClick: () => onChange(option.value), className: `
            px-4 py-2 text-sm font-medium
            ${index === 0 ? 'rounded-l-lg' : ''}
            ${index === options.length - 1 ? 'rounded-r-lg' : ''}
            ${value === option.value
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}
            border border-gray-200 dark:border-gray-600
            transition-colors duration-150
          `, children: option.label }, option.value))) }));
};
export default DateRangeSelector;
