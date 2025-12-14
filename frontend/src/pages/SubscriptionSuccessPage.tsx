import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { trackConversion } from '../lib/paywall-analytics';
import { useAuth } from '../hooks/useAuth';

const PRO_FEATURES = [
    {
        icon: '🚫',
        title: 'Ad-Free Experience',
        description: 'Enjoy clpr without any advertisements',
    },
    {
        icon: '⭐',
        title: 'Unlimited Favorites',
        description: 'Save as many clips as you want without limits',
    },
    {
        icon: '📁',
        title: 'Custom Collections',
        description: 'Organize your clips into custom playlists',
    },
    {
        icon: '🔍',
        title: 'Advanced Search',
        description: 'Use powerful filters to find exactly what you need',
    },
    {
        icon: '🔄',
        title: 'Cross-Device Sync',
        description: 'Access your favorites and collections anywhere',
    },
    {
        icon: '✉️',
        title: 'Priority Support',
        description: 'Get help faster with our priority support queue',
    },
];

export default function SubscriptionSuccessPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const hasTrackedConversion = useRef(false);

    useEffect(() => {
        // Track successful conversion only once
        if (sessionId && !hasTrackedConversion.current) {
            console.log('Checkout session completed:', sessionId);
            trackConversion({
                userId: user?.id,
                metadata: { sessionId },
            });
            hasTrackedConversion.current = true;
        }
    }, [sessionId, user?.id]);

    return (
        <div className='min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12'>
            <div className='max-w-3xl w-full'>
                {/* Success header */}
                <div className='text-center mb-8'>
                    <div className='mb-6'>
                        <svg
                            className='h-20 w-20 text-green-500 mx-auto'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                        </svg>
                    </div>

                    <h1 className='text-4xl font-bold text-white mb-4'>
                        🎉 Welcome to clpr Pro!
                    </h1>

                    <p className='text-xl text-gray-400 mb-2'>
                        Your subscription is now active
                    </p>

                    <p className='text-gray-500 text-sm'>
                        You'll receive a confirmation email shortly with your
                        receipt
                    </p>
                </div>

                {/* Features unlocked */}
                <div className='bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700'>
                    <h2 className='text-xl font-semibold text-white mb-4 text-center'>
                        ✨ Features Now Unlocked
                    </h2>

                    <div className='grid md:grid-cols-2 gap-4'>
                        {PRO_FEATURES.map((feature, index) => (
                            <div
                                key={index}
                                className='flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700'
                            >
                                <span className='text-2xl flex-shrink-0'>
                                    {feature.icon}
                                </span>
                                <div>
                                    <h3 className='text-white font-medium mb-1'>
                                        {feature.title}
                                    </h3>
                                    <p className='text-sm text-gray-400'>
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Next steps */}
                <div className='bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-6 mb-8 border border-purple-800'>
                    <h2 className='text-lg font-semibold text-white mb-4'>
                        🚀 Getting Started
                    </h2>

                    <ul className='space-y-3 text-gray-300'>
                        <li className='flex items-start gap-2'>
                            <span className='text-purple-400 mt-1'>→</span>
                            <span>
                                <strong className='text-white'>
                                    Explore without ads:
                                </strong>{' '}
                                Browse clips with a clean, uninterrupted
                                experience
                            </span>
                        </li>
                        <li className='flex items-start gap-2'>
                            <span className='text-purple-400 mt-1'>→</span>
                            <span>
                                <strong className='text-white'>
                                    Try advanced search:
                                </strong>{' '}
                                Use date ranges, view counts, and custom sorting
                            </span>
                        </li>
                        <li className='flex items-start gap-2'>
                            <span className='text-purple-400 mt-1'>→</span>
                            <span>
                                <strong className='text-white'>
                                    Create collections:
                                </strong>{' '}
                                Organize your favorite clips into themed
                                playlists
                            </span>
                        </li>
                        <li className='flex items-start gap-2'>
                            <span className='text-purple-400 mt-1'>→</span>
                            <span>
                                <strong className='text-white'>
                                    Sync across devices:
                                </strong>{' '}
                                Your favorites are now synced in real-time
                            </span>
                        </li>
                    </ul>
                </div>

                {/* Action buttons */}
                <div className='space-y-3'>
                    <button
                        onClick={() => navigate('/')}
                        className='w-full py-4 px-6 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors text-lg'
                    >
                        Start Exploring clpr Pro
                    </button>

                    <div className='grid grid-cols-2 gap-3'>
                        <button
                            onClick={() => navigate('/settings')}
                            className='py-3 px-6 rounded-lg bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors'
                        >
                            Manage Subscription
                        </button>

                        <button
                            onClick={() => navigate('/search')}
                            className='py-3 px-6 rounded-lg bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors'
                        >
                            Try Advanced Search
                        </button>
                    </div>
                </div>

                {/* Support */}
                <div className='text-center mt-8'>
                    <p className='text-sm text-gray-500'>
                        Need help?{' '}
                        <Link
                            to='/support'
                            className='text-purple-400 hover:text-purple-300'
                        >
                            Contact our priority support team
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
