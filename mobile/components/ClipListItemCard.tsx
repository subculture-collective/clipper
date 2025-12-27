import { View } from 'react-native';
import { ClipListItem } from '../services/clips';
import VideoClipCard from './VideoClipCard';

export default function ClipListItemCard({
    clip,
    videoUrl,
    thumbnailUrl,
    onPress,
}: {
    clip: ClipListItem;
    videoUrl?: string;
    thumbnailUrl?: string;
    onPress: () => void;
}) {
    return (
        <View>
            <VideoClipCard
                id={clip.id}
                title={clip.title}
                creator={clip.broadcaster_name}
                viewCount={clip.view_count}
                voteScore={clip.vote_score}
                videoUrl={videoUrl}
                thumbnailUrl={thumbnailUrl}
                onPress={onPress}
            />
        </View>
    );
}
