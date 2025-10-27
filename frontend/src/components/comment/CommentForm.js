import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { useCreateComment, useUpdateComment } from '@/hooks';
export const CommentForm = ({ clipId, parentId, editCommentId, initialContent = '', onCancel, onSuccess, placeholder = 'Write a comment...', className, }) => {
    const [content, setContent] = React.useState(initialContent);
    const [showPreview, setShowPreview] = React.useState(false);
    const textareaRef = React.useRef(null);
    const { mutate: createComment, isPending: isCreating } = useCreateComment();
    const { mutate: updateComment, isPending: isUpdating } = useUpdateComment();
    const isPending = isCreating || isUpdating;
    const maxLength = 10000;
    const isEmpty = content.trim().length === 0;
    React.useEffect(() => {
        // Focus textarea on mount
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEmpty || isPending)
            return;
        if (editCommentId) {
            updateComment({
                commentId: editCommentId,
                payload: { content },
            }, {
                onSuccess: () => {
                    setContent('');
                    onSuccess?.();
                },
            });
        }
        else {
            createComment({
                clip_id: clipId,
                content,
                parent_id: parentId,
            }, {
                onSuccess: () => {
                    setContent('');
                    onSuccess?.();
                },
            });
        }
    };
    const handleCancel = () => {
        setContent(initialContent);
        onCancel?.();
    };
    const handleKeyDown = (e) => {
        // Submit on Ctrl+Enter
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit(e);
        }
        // Cancel on Escape
        if (e.key === 'Escape') {
            handleCancel();
        }
    };
    const insertMarkdown = (before, after = '') => {
        if (!textareaRef.current)
            return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
        setContent(newText);
        // Restore cursor position
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + before.length + selectedText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: cn('space-y-3', className), children: [_jsxs("div", { className: "border border-border rounded-lg overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-1 p-2 bg-muted border-b border-border", children: [_jsx("button", { type: "button", onClick: () => insertMarkdown('**', '**'), className: "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors", title: "Bold (Ctrl+B)", children: _jsx("strong", { className: "text-sm", children: "B" }) }), _jsx("button", { type: "button", onClick: () => insertMarkdown('*', '*'), className: "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors", title: "Italic (Ctrl+I)", children: _jsx("em", { className: "text-sm", children: "I" }) }), _jsx("button", { type: "button", onClick: () => insertMarkdown('~~', '~~'), className: "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors", title: "Strikethrough", children: _jsx("s", { className: "text-sm", children: "S" }) }), _jsx("div", { className: "w-px h-5 bg-border mx-1" }), _jsx("button", { type: "button", onClick: () => insertMarkdown('[', '](url)'), className: "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm", title: "Link", children: "\uD83D\uDD17" }), _jsx("button", { type: "button", onClick: () => insertMarkdown('> ', ''), className: "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm", title: "Quote", children: "\u275D" }), _jsx("button", { type: "button", onClick: () => insertMarkdown('`', '`'), className: "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm", title: "Code", children: '</>' }), _jsx("div", { className: "flex-1" }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { type: "button", onClick: () => setShowPreview(false), className: cn('px-3 py-1 text-sm rounded transition-colors', !showPreview
                                            ? 'bg-background text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'), children: "Write" }), _jsx("button", { type: "button", onClick: () => setShowPreview(true), className: cn('px-3 py-1 text-sm rounded transition-colors', showPreview
                                            ? 'bg-background text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'), children: "Preview" })] })] }), showPreview ? (_jsx("div", { className: "p-3 min-h-[120px] prose prose-sm dark:prose-invert max-w-none", children: content ? (_jsx(ReactMarkdown, { components: {
                                // Open external links in new tab
                                a: ({ ...props }) => (_jsx("a", { ...props, target: "_blank", rel: "noopener noreferrer", className: "text-primary-500 hover:text-primary-600 underline" })),
                                // Code blocks
                                code: ({ className, children, ...props }) => {
                                    const isInline = !className;
                                    return isInline ? (_jsx("code", { className: "px-1 py-0.5 rounded bg-muted text-sm font-mono", ...props, children: children })) : (_jsx("code", { className: cn('block p-3 rounded bg-muted text-sm font-mono overflow-x-auto', className), ...props, children: children }));
                                },
                            }, children: content })) : (_jsx("p", { className: "text-muted-foreground", children: "Nothing to preview" })) })) : (_jsx("textarea", { ref: textareaRef, value: content, onChange: (e) => setContent(e.target.value), onKeyDown: handleKeyDown, placeholder: placeholder, maxLength: maxLength, className: "w-full px-3 py-2 min-h-[120px] resize-y bg-background text-foreground placeholder:text-muted-foreground focus:outline-none", "aria-label": "Comment content" })), _jsxs("div", { className: "flex items-center justify-between px-3 py-2 bg-muted border-t border-border text-sm", children: [_jsxs("span", { className: "text-muted-foreground", children: ["Markdown supported. ", maxLength - content.length, " characters remaining."] }), _jsxs("span", { className: "text-muted-foreground", children: [content.length, "/", maxLength] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { type: "submit", disabled: isEmpty || isPending, loading: isPending, size: "sm", children: editCommentId ? 'Update' : parentId ? 'Reply' : 'Comment' }), (onCancel || editCommentId) && (_jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: handleCancel, children: "Cancel" })), _jsx("span", { className: "text-xs text-muted-foreground ml-2", children: "Tip: Press Ctrl+Enter to submit" })] })] }));
};
