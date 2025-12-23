import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, ScrollToTop, SEO } from '../components';
import { MiniFooter } from '../components/layout';
import { ChatPanel, ReactionOverlay } from '../components/watch-party';
import { useWatchPartyWebSocket } from '../hooks/useWatchPartyWebSocket';
import { getWatchParty, getWatchPartyParticipants, leaveWatchParty, endWatchParty, kickParticipant } from '../lib/watch-party-api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import type { WatchParty, WatchPartyMessage, WatchPartyReaction, ReactionAnimation } from '../types/watchParty';
import { Users, Settings, LogOut, StopCircle, UserMinus } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function WatchPartyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [party, setParty] = useState<WatchParty | null>(null);
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionAnimation[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket connection
  const {
    sendChatMessage,
    sendReaction,
    sendTyping,
    isConnected,
  } = useWatchPartyWebSocket({
    partyId: id || '',
    onSyncEvent: (event) => {
      console.log('Sync event:', event);
      // Update party state based on sync events
      if (event.type === 'play' || event.type === 'pause' || event.type === 'seek') {
        setParty((prev) => prev ? {
          ...prev,
          is_playing: event.is_playing,
          current_position_seconds: event.position,
        } : null);
      }
      
      // Handle participant events
      if (event.type === 'participant-joined' && event.participant) {
        setParticipants((prev) => {
          // Check if participant already exists
          const exists = prev.some(p => p.user?.id === event.participant?.user_id);
          if (exists) return prev;
          
          // Add new participant
          return [...prev, {
            id: event.participant.user_id || '',
            party_id: id || '',
            user_id: event.participant.user_id || '',
            user: {
              id: event.participant.user_id || '',
              username: '',
              display_name: event.participant.display_name || '',
              avatar_url: event.participant.avatar_url,
            },
            role: event.participant.role as 'host' | 'co-host' | 'viewer',
            joined_at: new Date().toISOString(),
            sync_offset_ms: 0,
          }];
        });
      }
      
      if (event.type === 'participant-left' && event.user_id) {
        setParticipants((prev) => prev.filter(p => p.user?.id !== event.user_id));
      }
    },
    onChatMessage: (message) => {
      setMessages((prev) => [...prev, message]);
    },
    onReaction: (reaction) => {
      // Add reaction animation
      const animation: ReactionAnimation = {
        id: reaction.id,
        emoji: reaction.emoji,
        x: Math.random() * 80 + 10, // Random x position (10-90%)
        y: Math.random() * 80 + 10, // Random y position (10-90%)
        timestamp: Date.now(),
      };
      setReactions((prev) => [...prev, animation]);
      
      // Remove animation after 3 seconds
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== animation.id));
      }, 3000);
    },
    enabled: !!id,
  });

  // Load party data
  useEffect(() => {
    if (!id) {
      setError('Party ID is required');
      setLoading(false);
      return;
    }

    const loadParty = async () => {
      try {
        setLoading(true);
        const [partyData, participantsData] = await Promise.all([
          getWatchParty(id),
          getWatchPartyParticipants(id),
        ]);
        setParty(partyData);
        setParticipants(participantsData.participants);
        setError(null);
      } catch (err) {
        console.error('Error loading party:', err);
        setError(err instanceof Error ? err.message : 'Failed to load watch party');
        showToast('Failed to load watch party', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadParty();
  }, [id, showToast]);

  const handleLeaveParty = async () => {
    if (!id) return;
    
    try {
      await leaveWatchParty(id);
      showToast('Left watch party', 'success');
      navigate('/watch-parties/browse');
    } catch (err) {
      console.error('Error leaving party:', err);
      showToast('Failed to leave watch party', 'error');
    }
  };

  const handleEndParty = async () => {
    if (!id || !party || party.host_user_id !== user?.id) return;
    
    if (!confirm('Are you sure you want to end this watch party?')) {
      return;
    }
    
    try {
      await endWatchParty(id);
      showToast('Watch party ended', 'success');
      navigate('/watch-parties/history');
    } catch (err) {
      console.error('Error ending party:', err);
      showToast('Failed to end watch party', 'error');
    }
  };

  const handleKickParticipant = async (userId: string) => {
    if (!id || !party || party.host_user_id !== user?.id) return;
    
    if (!confirm('Are you sure you want to kick this participant?')) {
      return;
    }
    
    try {
      await kickParticipant(id, userId);
      showToast('Participant kicked', 'success');
      // Participant list will update via WebSocket event
    } catch (err) {
      console.error('Error kicking participant:', err);
      showToast('Failed to kick participant', 'error');
    }
  };

  const handleSendMessage = (message: string) => {
    sendChatMessage(message);
  };

  const handleSendReaction = (emoji: string) => {
    sendReaction(emoji, party?.current_position_seconds);
  };

  const handleTyping = (isTyping: boolean) => {
    sendTyping(isTyping);
  };

  if (loading) {
    return (
      <>
        <SEO title="Watch Party" description="Watch together with friends" />
        <Container>
          <div className="py-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-content-secondary">Loading watch party...</p>
            </div>
          </div>
        </Container>
      </>
    );
  }

  if (error || !party) {
    return (
      <>
        <SEO title="Watch Party Not Found" />
        <Container>
          <div className="py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-content-primary mb-4">Watch Party Not Found</h1>
              <p className="text-content-secondary mb-6">{error || 'This watch party does not exist or has ended.'}</p>
              <Button onClick={() => navigate('/watch-parties/browse')}>
                Browse Watch Parties
              </Button>
            </div>
          </div>
          <MiniFooter />
        </Container>
      </>
    );
  }

  const isHost = party.host_user_id === user?.id;

  return (
    <>
      <SEO
        title={`Watch Party: ${party.title}`}
        description="Watch together with friends"
      />
      <Container>
        <div className="py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-content-primary">{party.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-content-secondary">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{participants.length} watching</span>
                </div>
                <div className={`flex items-center gap-1 ${isConnected ? 'text-success-600' : 'text-error-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success-600' : 'bg-error-600'}`}></div>
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isHost && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/watch-parties/${id}/settings`)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleEndParty}
                  >
                    <StopCircle className="w-4 h-4 mr-1" />
                    End Party
                  </Button>
                </>
              )}
              {!isHost && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveParty}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Leave
                </Button>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Video player area (placeholder) */}
            <div className="lg:col-span-2">
              <div className="relative bg-surface-secondary rounded-lg aspect-video flex items-center justify-center">
                <div className="text-center text-content-secondary">
                  <p className="text-lg mb-2">Video Player</p>
                  <p className="text-sm">Synchronized playback will appear here</p>
                  {party.current_clip_id && (
                    <p className="text-xs mt-2">Clip ID: {party.current_clip_id}</p>
                  )}
                </div>
                
                {/* Reaction overlay */}
                <ReactionOverlay reactions={reactions} />
              </div>
              
              {/* Reaction buttons */}
              <div className="mt-4 flex gap-2 flex-wrap">
                {['👍', '😂', '❤️', '🔥', '👏', '😮'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="text-2xl p-2 hover:bg-surface-secondary rounded-lg transition-colors"
                    disabled={!isConnected}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat panel */}
            <div className="lg:col-span-1">
              <ChatPanel
                partyId={id}
                messages={messages}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                isConnected={isConnected}
                className="h-[600px]"
              />
            </div>
          </div>

          {/* Participants list */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-content-primary mb-3">Participants ({participants.length})</h2>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2 px-3 py-2 bg-surface-secondary rounded-lg"
                >
                  {participant.user?.avatar_url ? (
                    <img
                      src={participant.user.avatar_url}
                      alt={participant.user.display_name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                      {participant.user?.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-sm text-content-primary">
                    {participant.user?.display_name || participant.user?.username}
                  </span>
                  {participant.role === 'host' && (
                    <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded">Host</span>
                  )}
                  {isHost && participant.user_id !== user?.id && (
                    <button
                      onClick={() => handleKickParticipant(participant.user_id)}
                      className="ml-1 p-1 hover:bg-error-500/10 text-error-600 rounded transition-colors"
                      title="Kick participant"
                    >
                      <UserMinus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <MiniFooter />
      </Container>
      <ScrollToTop />
    </>
  );
}
