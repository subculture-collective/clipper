import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, Container, Stack, Button, Skeleton } from '../components';
import { ClipCard } from '../components/clip/ClipCard';
import { ClipCardSkeleton } from '../components/clip/ClipCardSkeleton';
import { BadgeGrid, KarmaBreakdownChart, ReputationDisplay, } from '../components/reputation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchUserComments, fetchUserUpvotedClips, fetchUserDownvotedClips, reauthorizeTwitch, } from '../lib/user-api';
export function ProfilePage() {
    const { user, isAdmin } = useAuth();
    const toast = useToast();
    const [reputation, setReputation] = useState(null);
    const [karmaBreakdown, setKarmaBreakdown] = useState(null);
    const [loadingReputation, setLoadingReputation] = useState(true);
    const [reputationError, setReputationError] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    // Tab-specific data states
    const [comments, setComments] = useState([]);
    const [upvotedClips, setUpvotedClips] = useState([]);
    const [downvotedClips, setDownvotedClips] = useState([]);
    const [loadingTabData, setLoadingTabData] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [reauthorizing, setReauthorizing] = useState(false);
    const fetchReputation = useCallback(async () => {
        if (!user)
            return;
        try {
            setLoadingReputation(true);
            setReputationError(false);
            const response = await fetch(`/api/v1/users/${user.id}/reputation`);
            if (response.ok) {
                const data = await response.json();
                setReputation(data);
            }
            else {
                setReputationError(true);
            }
        }
        catch (error) {
            console.error('Failed to fetch reputation:', error);
            setReputationError(true);
        }
        finally {
            setLoadingReputation(false);
        }
    }, [user]);
    const fetchKarmaBreakdown = useCallback(async () => {
        if (!user)
            return;
        try {
            const response = await fetch(`/api/v1/users/${user.id}/karma?limit=10`);
            if (response.ok) {
                const data = await response.json();
                setKarmaBreakdown(data.breakdown);
            }
        }
        catch (error) {
            console.error('Failed to fetch karma breakdown:', error);
        }
    }, [user]);
    const fetchTabData = useCallback(async (tab, page = 1, append = false) => {
        if (!user)
            return;
        setLoadingTabData(true);
        try {
            switch (tab) {
                case 'comments': {
                    const data = await fetchUserComments(user.id, page);
                    setComments(prev => append ? [...prev, ...data.comments] : data.comments);
                    setHasMore(data.has_more);
                    break;
                }
                case 'upvoted': {
                    const data = await fetchUserUpvotedClips(user.id, page);
                    setUpvotedClips(prev => append ? [...prev, ...data.clips] : data.clips);
                    setHasMore(data.has_more);
                    break;
                }
                case 'downvoted': {
                    const data = await fetchUserDownvotedClips(user.id, page);
                    setDownvotedClips(prev => append ? [...prev, ...data.clips] : data.clips);
                    setHasMore(data.has_more);
                    break;
                }
            }
            setCurrentPage(page);
        }
        catch (error) {
            console.error(`Failed to fetch ${tab} data:`, error);
            toast.error(`Failed to load ${tab}`);
        }
        finally {
            setLoadingTabData(false);
        }
    }, [user, toast]);
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'comments' || tab === 'upvoted' || tab === 'downvoted') {
            // Reset only the relevant tab data when switching
            if (tab === 'comments') {
                setComments([]);
            }
            else if (tab === 'upvoted') {
                setUpvotedClips([]);
            }
            else if (tab === 'downvoted') {
                setDownvotedClips([]);
            }
            setCurrentPage(1);
            setHasMore(false);
            fetchTabData(tab, 1, false);
        }
    };
    const handleReauthorize = async () => {
        try {
            setReauthorizing(true);
            const data = await reauthorizeTwitch();
            // Redirect to the auth URL
            window.location.href = data.auth_url;
        }
        catch (error) {
            console.error('Failed to reauthorize:', error);
            toast.error('Failed to initiate reauthorization');
            setReauthorizing(false);
        }
    };
    useEffect(() => {
        if (user) {
            fetchReputation();
            fetchKarmaBreakdown();
        }
    }, [user, fetchReputation, fetchKarmaBreakdown]);
    if (!user) {
        return null;
    }
    return (_jsx(Container, { className: 'py-8', children: _jsxs("div", { className: 'max-w-4xl mx-auto', children: [user?.is_banned && (_jsx(Card, { className: 'mb-6 border-red-500 bg-red-50 dark:bg-red-950', children: _jsx(CardBody, { children: _jsxs("div", { className: 'flex items-start gap-4', children: [_jsx("div", { className: 'flex-shrink-0', children: _jsx("svg", { className: 'w-6 h-6 text-red-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', children: _jsx("path", { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }) }) }), _jsxs("div", { children: [_jsx("h3", { className: 'text-lg font-semibold text-red-900 dark:text-red-100', children: "Account Restricted" }), _jsx("p", { className: 'mt-1 text-red-800 dark:text-red-200', children: "Your account has been restricted from interacting with certain content. Please contact support if you believe this is an error." })] })] }) }) })), _jsx(Card, { className: 'mb-6', children: _jsx(CardBody, { children: _jsxs("div", { className: 'flex items-start gap-6', children: [_jsx("div", { className: 'shrink-0', children: user.avatar_url ? (_jsx("img", { src: user.avatar_url, alt: user.username, className: 'border-border w-24 h-24 border-2 rounded-full' })) : (_jsx("div", { className: 'bg-primary-100 dark:bg-primary-900 text-primary-600 flex items-center justify-center w-24 h-24 text-3xl font-bold rounded-full', children: user.username.charAt(0).toUpperCase() })) }), _jsxs("div", { className: 'flex-1', children: [_jsxs("div", { className: 'flex items-start justify-between', children: [_jsxs("div", { children: [_jsx("h1", { className: 'mb-1 text-3xl font-bold', children: user.display_name }), _jsxs("p", { className: 'text-muted-foreground mb-2', children: ["@", user.username] })] }), _jsx(Button, { onClick: handleReauthorize, disabled: reauthorizing, variant: 'outline', size: 'sm', children: reauthorizing ? 'Redirecting...' : 'Reauthorize with Twitch' })] }), user.bio && (_jsx("p", { className: 'text-foreground mb-4', children: user.bio })), _jsxs("div", { className: 'flex flex-wrap gap-4 text-sm', children: [_jsxs("div", { className: 'flex items-center gap-2', children: [_jsx("span", { className: 'text-muted-foreground', children: "Karma:" }), _jsx("span", { className: 'text-primary-600 font-semibold', children: user.karma_points })] }), _jsxs("div", { className: 'flex items-center gap-2', children: [_jsx("span", { className: 'text-muted-foreground', children: "Role:" }), _jsx("span", { className: 'font-semibold capitalize', children: user.role })] }), user.created_at && (_jsxs("div", { className: 'flex items-center gap-2', children: [_jsx("span", { className: 'text-muted-foreground', children: "Joined:" }), _jsx("span", { className: 'font-semibold', children: formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) })] }))] }), isAdmin && (_jsxs("div", { className: 'mt-4 pt-4 border-t border-border', children: [_jsx("p", { className: 'text-sm text-muted-foreground mb-2', children: "Admin Tools:" }), _jsxs("div", { className: 'flex gap-3', children: [_jsx(Link, { to: '/admin', className: 'text-sm text-primary-600 hover:text-primary-700 font-medium', children: "Dashboard" }), _jsx(Link, { to: '/admin/reports', className: 'text-sm text-primary-600 hover:text-primary-700 font-medium', children: "Reports" }), _jsx(Link, { to: '/admin/submissions', className: 'text-sm text-primary-600 hover:text-primary-700 font-medium', children: "Submissions" })] })] }))] })] }) }) }), _jsx(Card, { children: _jsx(CardBody, { children: _jsxs(Stack, { direction: 'vertical', gap: 4, children: [_jsx("div", { className: 'border-border border-b', children: _jsxs("nav", { className: 'flex gap-4 overflow-x-auto', role: 'tablist', children: [_jsx("button", { onClick: () => handleTabChange('overview'), className: `px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${activeTab === 'overview'
                                                    ? 'border-primary-500 text-primary-600'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'}`, role: 'tab', "aria-selected": activeTab === 'overview', children: "Overview" }), _jsx("button", { onClick: () => handleTabChange('badges'), className: `px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${activeTab === 'badges'
                                                    ? 'border-primary-500 text-primary-600'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'}`, role: 'tab', "aria-selected": activeTab === 'badges', children: "Badges" }), _jsx("button", { onClick: () => handleTabChange('karma'), className: `px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${activeTab === 'karma'
                                                    ? 'border-primary-500 text-primary-600'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'}`, role: 'tab', "aria-selected": activeTab === 'karma', children: "Karma" }), _jsx("button", { onClick: () => handleTabChange('comments'), className: `px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${activeTab === 'comments'
                                                    ? 'border-primary-500 text-primary-600'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'}`, role: 'tab', "aria-selected": activeTab === 'comments', children: "Comments" }), _jsx("button", { onClick: () => handleTabChange('upvoted'), className: `px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${activeTab === 'upvoted'
                                                    ? 'border-primary-500 text-primary-600'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'}`, role: 'tab', "aria-selected": activeTab === 'upvoted', children: "Upvoted" }), _jsx("button", { onClick: () => handleTabChange('downvoted'), className: `px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${activeTab === 'downvoted'
                                                    ? 'border-primary-500 text-primary-600'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'}`, role: 'tab', "aria-selected": activeTab === 'downvoted', children: "Downvoted" })] }) }), activeTab === 'overview' && (_jsx("div", { children: loadingReputation ? (_jsxs("div", { className: 'space-y-4', children: [_jsx(Skeleton, { variant: 'rectangular', height: 100 }), _jsx(Skeleton, { variant: 'rectangular', height: 200 })] })) : reputationError ? (_jsx("div", { className: 'py-12 text-center', children: _jsx("p", { className: 'text-red-600 dark:text-red-400', children: "Failed to load reputation data" }) })) : reputation ? (_jsx(ReputationDisplay, { reputation: reputation })) : (_jsx("div", { className: 'py-12 text-center', children: _jsx("p", { className: 'text-muted-foreground', children: "Unable to load reputation data" }) })) })), activeTab === 'badges' && (_jsx("div", { children: loadingReputation ? (_jsx("div", { className: 'grid grid-cols-3 gap-4', children: [...Array(6)].map((_, i) => (_jsx(Skeleton, { variant: 'rectangular', height: 120 }, i))) })) : reputation &&
                                        reputation.badges.length > 0 ? (_jsx(BadgeGrid, { badges: reputation.badges, columns: 3 })) : (_jsx("div", { className: 'py-12 text-center', children: _jsx("p", { className: 'text-muted-foreground', children: "No badges earned yet. Keep contributing to earn badges!" }) })) })), activeTab === 'karma' && (_jsx("div", { children: karmaBreakdown ? (_jsx(KarmaBreakdownChart, { breakdown: karmaBreakdown })) : (_jsx("div", { className: 'py-12 text-center', children: _jsx("p", { className: 'text-muted-foreground', children: "Loading karma data..." }) })) })), activeTab === 'comments' && (_jsx("div", { children: loadingTabData ? (_jsx("div", { className: 'space-y-4', children: [...Array(5)].map((_, i) => (_jsx(Skeleton, { variant: 'rectangular', height: 120 }, i))) })) : comments.length > 0 ? (_jsxs("div", { className: 'space-y-4', children: [comments.map((comment) => (_jsx(Card, { children: _jsxs(CardBody, { children: [_jsx(Link, { to: `/clips/${comment.clip_id}`, className: 'text-sm text-primary-600 hover:underline mb-2 block', children: "View on clip" }), _jsx("p", { className: 'text-foreground', children: comment.content }), _jsxs("div", { className: 'mt-2 text-sm text-muted-foreground', children: [comment.vote_score, " points \u2022", ' ', formatDistanceToNow(new Date(comment.created_at), {
                                                                    addSuffix: true,
                                                                })] })] }) }, comment.id))), hasMore && (_jsx("div", { className: 'text-center pt-4', children: _jsx(Button, { onClick: () => fetchTabData('comments', currentPage + 1, true), variant: 'outline', children: "Load More" }) }))] })) : (_jsx("div", { className: 'py-12 text-center', children: _jsx("p", { className: 'text-muted-foreground', children: "No comments yet" }) })) })), activeTab === 'upvoted' && (_jsx("div", { children: loadingTabData ? (_jsx("div", { className: 'space-y-4', children: [...Array(5)].map((_, i) => (_jsx(ClipCardSkeleton, {}, i))) })) : upvotedClips.length > 0 ? (_jsxs("div", { className: 'space-y-4', children: [upvotedClips.map((clip) => (_jsx(ClipCard, { clip: clip }, clip.id))), hasMore && (_jsx("div", { className: 'text-center pt-4', children: _jsx(Button, { onClick: () => fetchTabData('upvoted', currentPage + 1, true), variant: 'outline', children: "Load More" }) }))] })) : (_jsx("div", { className: 'py-12 text-center', children: _jsx("p", { className: 'text-muted-foreground', children: "No upvoted clips yet" }) })) })), activeTab === 'downvoted' && (_jsx("div", { children: loadingTabData ? (_jsx("div", { className: 'space-y-4', children: [...Array(5)].map((_, i) => (_jsx(ClipCardSkeleton, {}, i))) })) : downvotedClips.length > 0 ? (_jsxs("div", { className: 'space-y-4', children: [downvotedClips.map((clip) => (_jsx(ClipCard, { clip: clip }, clip.id))), hasMore && (_jsx("div", { className: 'text-center pt-4', children: _jsx(Button, { onClick: () => fetchTabData('downvoted', currentPage + 1, true), variant: 'outline', children: "Load More" }) }))] })) : (_jsx("div", { className: 'py-12 text-center', children: _jsx("p", { className: 'text-muted-foreground', children: "No downvoted clips yet" }) })) }))] }) }) })] }) }));
}
