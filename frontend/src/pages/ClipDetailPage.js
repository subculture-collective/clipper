import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { Container, Spinner, CommentSection } from '../components';
import { useClipById, useUser, useClipVote, useClipFavorite, useIsAuthenticated, useToast } from '../hooks';
import { cn } from '@/lib/utils';
export function ClipDetailPage() {
    const { id } = useParams();
    const { data: clip, isLoading, error } = useClipById(id || '');
    const user = useUser();
    const isAuthenticated = useIsAuthenticated();
    const voteMutation = useClipVote();
    const favoriteMutation = useClipFavorite();
    const toast = useToast();
    const handleVote = (voteType) => {
        if (!isAuthenticated) {
            toast.info('Please log in to vote on clips');
            return;
        }
        if (!clip)
            return;
        voteMutation.mutate({ clip_id: clip.id, vote_type: voteType });
    };
    const handleFavorite = () => {
        if (!isAuthenticated) {
            toast.info('Please log in to favorite clips');
            return;
        }
        if (!clip)
            return;
        favoriteMutation.mutate({ clip_id: clip.id });
    };
    if (isLoading) {
        return (_jsx(Container, { className: "py-8", children: _jsx("div", { className: "flex justify-center items-center min-h-[400px]", children: _jsx(Spinner, { size: "lg" }) }) }));
    }
    if (error) {
        return (_jsx(Container, { className: "py-8", children: _jsxs("div", { className: "text-center py-12", children: [_jsx("h2", { className: "text-2xl font-bold text-error-600 mb-4", children: "Error Loading Clip" }), _jsx("p", { className: "text-muted-foreground", children: error.message })] }) }));
    }
    if (!clip) {
        return (_jsx(Container, { className: "py-8", children: _jsxs("div", { className: "text-center py-12", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Clip Not Found" }), _jsx("p", { className: "text-muted-foreground", children: "The clip you're looking for doesn't exist." })] }) }));
    }
    return (_jsx(Container, { className: "py-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: clip.title }), _jsxs("div", { className: "flex gap-4 text-sm text-muted-foreground", children: [_jsxs("span", { children: ["By ", clip.creator_name] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: [clip.view_count.toLocaleString(), " views"] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: [clip.vote_score, " votes"] })] })] }), _jsx("div", { className: "aspect-video bg-black rounded-lg mb-6", children: _jsx("iframe", { src: clip.embed_url, title: clip.title, className: "w-full h-full rounded-lg", allowFullScreen: true, sandbox: "allow-scripts" }) }), _jsxs("div", { className: "grid grid-cols-3 gap-4 mb-6", children: [_jsxs("button", { onClick: () => handleVote(1), disabled: !isAuthenticated, className: cn("px-4 py-2 rounded-md transition-colors", clip.user_vote === 1
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-primary-500 text-white hover:bg-primary-600", !isAuthenticated && "opacity-50 cursor-not-allowed hover:bg-primary-500"), "aria-label": isAuthenticated ? `Upvote, ${clip.vote_score} votes` : 'Log in to upvote', "aria-disabled": !isAuthenticated, title: isAuthenticated ? undefined : 'Log in to vote', children: ["Upvote (", clip.vote_score, ")"] }), _jsxs("button", { className: "px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors", "aria-label": `Comment, ${clip.comment_count} comments`, onClick: () => {
                                document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
                            }, children: ["Comment (", clip.comment_count, ")"] }), _jsxs("button", { onClick: handleFavorite, disabled: !isAuthenticated, className: cn("px-4 py-2 rounded-md transition-colors", clip.is_favorited
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "border border-border hover:bg-muted", !isAuthenticated && "opacity-50 cursor-not-allowed hover:bg-muted"), "aria-label": !isAuthenticated
                                ? 'Log in to favorite'
                                : clip.is_favorited
                                    ? `Remove from favorites, ${clip.favorite_count} favorites`
                                    : `Add to favorites, ${clip.favorite_count} favorites`, "aria-disabled": !isAuthenticated, title: isAuthenticated ? undefined : 'Log in to favorite', children: [clip.is_favorited ? '❤️ ' : '', "Favorite (", clip.favorite_count, ")"] })] }), clip.game_name && (_jsxs("div", { className: "mb-4", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Game: " }), _jsx("span", { className: "font-semibold", children: clip.game_name })] })), _jsxs("div", { className: "text-sm text-muted-foreground space-y-1", children: [_jsxs("p", { children: ["Broadcaster: ", clip.broadcaster_name] }), _jsxs("p", { children: ["Created:", ' ', new Date(clip.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })] })] }), _jsx("div", { className: "mt-8 border-t border-border pt-8", id: "comments", children: _jsx(CommentSection, { clipId: clip.id, currentUserId: user?.id, isAdmin: user?.role === 'admin' }) })] }) }));
}
