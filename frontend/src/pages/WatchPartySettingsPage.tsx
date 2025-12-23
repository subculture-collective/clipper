import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, ScrollToTop, SEO } from '../components';
import { MiniFooter } from '../components/layout';
import { Button } from '../components/ui/Button';
import { WatchPartySettings } from '../components/watch-party';
import { getWatchParty } from '../lib/watch-party-api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import type { WatchParty } from '../types/watchParty';
import { ArrowLeft } from 'lucide-react';

export function WatchPartySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [party, setParty] = useState<WatchParty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadParty = async () => {
      try {
        setLoading(true);
        const partyData = await getWatchParty(id);
        setParty(partyData);
        
        // Check if user is host
        if (partyData.host_user_id !== user?.id) {
          showToast('Only the host can access settings', 'error');
          navigate(`/watch-parties/${id}`);
        }
      } catch (err) {
        console.error('Error loading party:', err);
        showToast('Failed to load watch party', 'error');
        navigate('/watch-parties/browse');
      } finally {
        setLoading(false);
      }
    };

    loadParty();
  }, [id, user, navigate, showToast]);

  if (loading) {
    return (
      <>
        <SEO title="Watch Party Settings" />
        <Container>
          <div className="py-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-content-secondary">Loading settings...</p>
            </div>
          </div>
        </Container>
      </>
    );
  }

  if (!party) {
    return null;
  }

  return (
    <>
      <SEO
        title={`Settings: ${party.title}`}
        description="Manage watch party settings"
      />
      <Container>
        <div className="py-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/watch-parties/${id}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Party
            </Button>
            <h1 className="text-3xl font-bold text-content-primary mb-2">Watch Party Settings</h1>
            <p className="text-content-secondary">{party.title}</p>
          </div>

          {/* Settings component */}
          <WatchPartySettings partyId={id!} />
        </div>
        <MiniFooter />
      </Container>
      <ScrollToTop />
    </>
  );
}
