import { Badge } from '../ui';
import type { DocFrontmatter } from '../../lib/markdown-utils';

interface DocHeaderProps {
    frontmatter: DocFrontmatter;
}

/**
 * DocHeader component displays parsed frontmatter metadata
 * Shows title, summary, tags, status, and other metadata
 */
export function DocHeader({ frontmatter }: DocHeaderProps) {
    const {
        title,
        summary,
        tags = [],
        status,
        area,
        owner,
        last_reviewed,
    } = frontmatter;

    // Don't render if no metadata
    if (!title && !summary && tags.length === 0) {
        return null;
    }

    return (
        <div className='mb-8 pb-6 border-b border-border'>
            {title && (
                <h1 className='text-4xl font-bold mb-3'>{title}</h1>
            )}

            {summary && (
                <p className='text-lg text-muted-foreground mb-4'>
                    {summary}
                </p>
            )}

            <div className='flex flex-wrap gap-4 items-center text-sm'>
                {/* Tags */}
                {tags.length > 0 && (
                    <div className='flex flex-wrap gap-2 items-center'>
                        <span className='text-muted-foreground font-medium'>
                            Tags:
                        </span>
                        {tags.map((tag) => (
                            <Badge key={tag} variant='secondary'>
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Status */}
                {status && (
                    <div className='flex items-center gap-2'>
                        <span className='text-muted-foreground font-medium'>
                            Status:
                        </span>
                        <Badge
                            variant={
                                status === 'stable'
                                    ? 'success'
                                    : status === 'draft'
                                      ? 'warning'
                                      : 'secondary'
                            }
                        >
                            {status}
                        </Badge>
                    </div>
                )}

                {/* Area */}
                {area && (
                    <div className='flex items-center gap-2'>
                        <span className='text-muted-foreground font-medium'>
                            Area:
                        </span>
                        <span className='text-foreground'>{area}</span>
                    </div>
                )}

                {/* Owner */}
                {owner && (
                    <div className='flex items-center gap-2'>
                        <span className='text-muted-foreground font-medium'>
                            Owner:
                        </span>
                        <span className='text-foreground'>{owner}</span>
                    </div>
                )}

                {/* Last Reviewed */}
                {last_reviewed && (
                    <div className='flex items-center gap-2'>
                        <span className='text-muted-foreground font-medium'>
                            Last Reviewed:
                        </span>
                        <span className='text-foreground'>
                            {last_reviewed}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
