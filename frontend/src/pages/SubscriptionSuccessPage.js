import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
export default function SubscriptionSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    useEffect(() => {
        // Optional: Verify the session with backend
        if (sessionId) {
            console.log('Checkout session completed:', sessionId);
        }
    }, [sessionId]);
    return (_jsx("div", { className: "min-h-screen bg-gray-900 flex items-center justify-center px-4", children: _jsxs("div", { className: "max-w-md w-full text-center", children: [_jsx("div", { className: "mb-8", children: _jsx("svg", { className: "h-20 w-20 text-green-500 mx-auto", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }), _jsx("h1", { className: "text-3xl font-bold text-white mb-4", children: "Welcome to Clipper Pro!" }), _jsx("p", { className: "text-gray-400 mb-8", children: "Your subscription is now active. You now have access to all Pro features including ad-free browsing, advanced search, and more." }), _jsxs("div", { className: "space-y-4", children: [_jsx("button", { onClick: () => navigate('/'), className: "w-full py-3 px-6 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors", children: "Start Exploring" }), _jsx("button", { onClick: () => navigate('/settings'), className: "w-full py-3 px-6 rounded-md bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors", children: "Manage Subscription" })] }), _jsx("p", { className: "text-sm text-gray-500 mt-8", children: "You'll receive a confirmation email shortly with your receipt and subscription details." })] }) }));
}
