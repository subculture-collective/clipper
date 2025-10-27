import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession } from '../lib/subscription-api';
const PRICE_IDS = {
    monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    yearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID || '',
};
const features = [
    'Ad-free browsing experience',
    'Advanced search and filtering',
    'Favorite clips sync across devices',
    'Priority support',
    'Early access to new features',
    'Custom collections and playlists',
];
export default function PricingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(null);
    const [billingPeriod, setBillingPeriod] = useState('monthly');
    const handleSubscribe = async (period) => {
        if (!user) {
            // Redirect to login
            navigate('/login?redirect=/pricing');
            return;
        }
        setIsLoading(period);
        try {
            const priceId = PRICE_IDS[period];
            if (!priceId) {
                alert('Subscription not configured. Please contact support.');
                return;
            }
            const response = await createCheckoutSession(priceId);
            // Redirect to Stripe Checkout
            window.location.href = response.session_url;
        }
        catch (error) {
            console.error('Failed to create checkout session:', error);
            alert('Failed to start checkout. Please try again.');
        }
        finally {
            setIsLoading(null);
        }
    };
    const monthlyPrice = 9.99;
    const yearlyPrice = 99.99;
    const yearlyMonthlyPrice = (yearlyPrice / 12).toFixed(2);
    const savingsPercent = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);
    return (_jsx("div", { className: "min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "text-center mb-12", children: [_jsx("h1", { className: "text-4xl font-bold text-white mb-4", children: "Upgrade to Clipper Pro" }), _jsx("p", { className: "text-xl text-gray-400", children: "Get the most out of Clipper with exclusive Pro features" })] }), _jsx("div", { className: "flex justify-center mb-12", children: _jsxs("div", { className: "bg-gray-800 rounded-lg p-1 inline-flex", children: [_jsx("button", { onClick: () => setBillingPeriod('monthly'), className: `px-6 py-2 rounded-md text-sm font-medium transition-colors ${billingPeriod === 'monthly'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'}`, children: "Monthly" }), _jsxs("button", { onClick: () => setBillingPeriod('yearly'), className: `px-6 py-2 rounded-md text-sm font-medium transition-colors ${billingPeriod === 'yearly'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'}`, children: ["Yearly", _jsxs("span", { className: "ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded", children: ["Save ", savingsPercent, "%"] })] })] }) }), _jsxs("div", { className: "grid md:grid-cols-2 gap-8 max-w-4xl mx-auto", children: [_jsxs("div", { className: "bg-gray-800 rounded-lg p-8 border border-gray-700", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "Free" }), _jsx("p", { className: "text-gray-400", children: "Perfect for casual users" })] }), _jsxs("div", { className: "mb-6", children: [_jsx("span", { className: "text-4xl font-bold text-white", children: "$0" }), _jsx("span", { className: "text-gray-400", children: "/month" })] }), _jsxs("ul", { className: "space-y-3 mb-8", children: [_jsxs("li", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }), _jsx("span", { className: "text-gray-300", children: "Browse all clips" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }), _jsx("span", { className: "text-gray-300", children: "Basic search" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }), _jsx("span", { className: "text-gray-300", children: "Vote and comment" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }), _jsx("span", { className: "text-gray-300", children: "Create favorites" })] })] }), _jsx("button", { disabled: true, className: "w-full py-3 px-6 rounded-md bg-gray-700 text-gray-400 font-medium cursor-not-allowed", children: "Current Plan" })] }), _jsxs("div", { className: "bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg p-8 border-2 border-purple-400 shadow-xl relative", children: [_jsx("div", { className: "absolute top-0 right-0 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg", children: "POPULAR" }), _jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "Pro" }), _jsx("p", { className: "text-purple-100", children: "For power users and enthusiasts" })] }), _jsx("div", { className: "mb-6", children: billingPeriod === 'monthly' ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "text-4xl font-bold text-white", children: ["$", monthlyPrice] }), _jsx("span", { className: "text-purple-100", children: "/month" })] })) : (_jsxs(_Fragment, { children: [_jsxs("span", { className: "text-4xl font-bold text-white", children: ["$", yearlyMonthlyPrice] }), _jsx("span", { className: "text-purple-100", children: "/month" }), _jsxs("div", { className: "text-sm text-purple-100 mt-1", children: ["Billed $", yearlyPrice, "/year"] })] })) }), _jsx("ul", { className: "space-y-3 mb-8", children: features.map((feature, index) => (_jsxs("li", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }), _jsx("span", { className: "text-white", children: feature })] }, index))) }), _jsx("button", { onClick: () => handleSubscribe(billingPeriod), disabled: isLoading !== null, className: "w-full py-3 px-6 rounded-md bg-white text-purple-600 font-bold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: isLoading === billingPeriod ? 'Processing...' : 'Subscribe Now' })] })] }), _jsxs("div", { className: "mt-16 text-center", children: [_jsx("p", { className: "text-gray-400 mb-4", children: "Cancel anytime. No hidden fees. Secure payment with Stripe." }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Have questions? ", _jsx("a", { href: "/support", className: "text-purple-400 hover:text-purple-300", children: "Contact support" })] })] })] }) }));
}
