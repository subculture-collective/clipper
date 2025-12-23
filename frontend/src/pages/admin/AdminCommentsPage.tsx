import { ModerationQueueView } from '../../components/moderation';

export function AdminCommentsPage() {
    return (
        <ModerationQueueView
            contentType='comment'
            title='Comment Moderation Queue'
            description='Review and moderate flagged comments with bulk actions'
        />
    );
}
