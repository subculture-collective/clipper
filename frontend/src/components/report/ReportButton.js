import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '../ui/Button';
import { ReportModal } from './ReportModal';
export function ReportButton({ reportableType, reportableId, className }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => setIsModalOpen(true), className: className, "aria-label": `Report this ${reportableType}`, children: [_jsx("svg", { className: "h-4 w-4 mr-1", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" }) }), "Report"] }), _jsx(ReportModal, { open: isModalOpen, onClose: () => setIsModalOpen(false), reportableType: reportableType, reportableId: reportableId })] }));
}
