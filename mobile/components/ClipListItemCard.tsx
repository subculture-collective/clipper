import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ClipListItem, getClip } from '../services/clips';
import VideoClipCard from './VideoClipCard';

export default function ClipListItemCard({
    clip,
    onPress,
}: {
    clip: ClipListItem;
    onPress: () => void;
}) {
    const { data: detail } = useQuery({
        queryKey: ['clip', clip.id],
        queryFn: () => getClip(clip.id),
    });

    return (
        <View>
            <VideoClipCard
                id={clip.id}
                title={clip.title}
                creator={clip.broadcaster_name}
                viewCount={clip.view_count}
                voteScore={clip.vote_score}
                videoUrl={detail?.embed_url}
                thumbnailUrl={detail?.thumbnail_url}
                onPress={onPress}
            />
        </View>
    );
}
