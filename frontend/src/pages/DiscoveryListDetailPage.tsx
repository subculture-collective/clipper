import { useParams, Navigate } from 'react-router-dom';

// Discovery lists are now playlists - redirect to playlist detail page
export function DiscoveryListDetailPage() {
    const { id } = useParams<{ id: string }>();

    // Redirect to playlist detail page
    return <Navigate to={`/playlists/${id}`} replace />;
}
