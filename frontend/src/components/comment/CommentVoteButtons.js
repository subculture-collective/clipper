import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
import { useCommentVote } from '@/hooks';
import { useIsAuthenticated, useToast } from '@/hooks';
export const CommentVoteButtons = ({ commentId, score, userVote, className, }) => {
    const isAuthenticated = useIsAuthenticated();
    const { mutate: vote, isPending } = useCommentVote();
    const [isVoting, setIsVoting] = React.useState(false);
    const toast = useToast();
    const handleVote = (voteType) => {
        if (!isAuthenticated) {
            toast.info('Please log in to vote');
            return;
        }
        if (isVoting)
            return;
        setIsVoting(true);
        vote({ comment_id: commentId, vote_type: voteType }, {
            onSettled: () => {
                setTimeout(() => setIsVoting(false), 200);
            },
        });
    };
    const isUpvoted = userVote === 1;
    const isDownvoted = userVote === -1;
    return (_jsxs("div", { className: cn('flex flex-col items-center gap-1', className), children: [_jsx("button", { onClick: () => handleVote(1), disabled: isPending || isVoting, className: cn('p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors', 'disabled:opacity-50 disabled:cursor-not-allowed', isUpvoted && 'text-orange-500'), "aria-label": "Upvote", title: "Upvote", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: isUpvoted ? 'currentColor' : 'none', stroke: "currentColor", strokeWidth: "2", className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.5 15.75l7.5-7.5 7.5 7.5" }) }) }), _jsx("span", { className: cn('text-sm font-medium min-w-[2rem] text-center', isUpvoted && 'text-orange-500', isDownvoted && 'text-blue-500', !userVote && 'text-muted-foreground'), children: score }), _jsx("button", { onClick: () => handleVote(-1), disabled: isPending || isVoting, className: cn('p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors', 'disabled:opacity-50 disabled:cursor-not-allowed', isDownvoted && 'text-blue-500'), "aria-label": "Downvote", title: "Downvote", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: isDownvoted ? 'currentColor' : 'none', stroke: "currentColor", strokeWidth: "2", className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" }) }) })] }));
};
