import { useQueue, useRemoveFromQueue, useClearQueue } from '@/hooks/useQueue';
import { formatDuration } from '@/lib/utils';
import { X, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';

export function QueuePanel() {
    const { data: queue, isLoading } = useQueue(100);
    const removeFromQueue = useRemoveFromQueue();
    const clearQueue = useClearQueue();
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const handleRemove = (itemId: string) => {
        removeFromQueue.mutate(itemId);
    };

    const handleClearQueue = () => {
        if (window.confirm('Are you sure you want to clear the entire queue?')) {
            clearQueue.mutate();
        }
    };

    const handleDragStart = (id: string) => {
        setDraggedId(id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (targetId: string) => {
        // TODO: Implement drag-and-drop reordering
        // This requires finding the positions and calling reorderQueue
        setDraggedId(null);
    };

    if (isLoading) {
        return (
            <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-screen">
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-bold text-zinc-100">Queue</h2>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-zinc-500">Loading...</div>
                </div>
            </div>
        );
    }

    const queueItems = queue?.items || [];
    const total = queue?.total || 0;

    return (
        <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-screen">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-100">
                    Queue ({total})
                </h2>
                {total > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearQueue}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Queue Items */}
            <div className="flex-1 overflow-y-auto">
                {queueItems.length === 0 ? (
                    <div className="p-4 text-zinc-500 text-center">
                        Queue is empty
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800">
                        {queueItems.map((item, idx) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={() => handleDragStart(item.id)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(item.id)}
                                className={`p-3 hover:bg-zinc-800/50 cursor-move transition-colors ${
                                    draggedId === item.id ? 'opacity-50 bg-zinc-800' : ''
                                }`}
                            >
                                <div className="flex gap-3">
                                    {/* Position Number */}
                                    <span className="text-zinc-500 text-sm font-mono w-6 flex-shrink-0">
                                        {idx + 1}.
                                    </span>

                                    {/* Thumbnail */}
                                    {item.clip?.thumbnail_url && (
                                        <div className="w-20 h-12 flex-shrink-0 rounded overflow-hidden">
                                            <img
                                                src={item.clip.thumbnail_url}
                                                alt={item.clip.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    {/* Clip Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-100 truncate">
                                            {item.clip?.title || 'Unknown Clip'}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                            <span>{item.clip?.broadcaster_name}</span>
                                            {item.clip?.duration && (
                                                <>
                                                    <span>•</span>
                                                    <span>{formatDuration(item.clip.duration)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => handleRemove(item.id)}
                                        className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                                        aria-label="Remove from queue"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Next Up Preview (if available) */}
            {queue?.next_clip && (
                <div className="p-4 border-t border-zinc-800 bg-zinc-800/50">
                    <div className="text-xs text-zinc-400 mb-2">Up Next</div>
                    <div className="text-sm font-medium text-zinc-100 truncate">
                        {queue.next_clip.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                        {queue.next_clip.broadcaster_name}
                    </div>
                </div>
            )}
        </div>
    );
}
