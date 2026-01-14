import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, ScrollToTop, SEO } from '../components';
import { MiniFooter } from '../components/layout';
import { Button } from '../components/ui/Button';
import { createWatchParty } from '../lib/watch-party-api';
import { useToast } from '../context/ToastContext';
import { Users, Lock, Globe, UserPlus } from 'lucide-react';

type WatchPartyVisibility = 'public' | 'friends' | 'invite';

type WatchPartyFormData = {
  title: string;
  visibility: WatchPartyVisibility;
  password: string;
  max_participants: number;
};

export function WatchPartyCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<WatchPartyFormData>({
    title: '',
    visibility: 'public',
    password: '',
    max_participants: 100,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast('Please enter a party title', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const party = await createWatchParty({
        title: formData.title.trim(),
        visibility: formData.visibility,
        password: formData.password || undefined,
        max_participants: formData.max_participants,
      });

      showToast('Watch party created!', 'success');
      navigate(`/watch-parties/${party.id}`);
    } catch (err) {
      console.error('Error creating party:', err);
      showToast(err instanceof Error ? err.message : 'Failed to create watch party', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Create Watch Party"
        description="Create a new watch party to watch clips with friends"
      />
      <Container>
        <div className="py-8 max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-content-primary mb-2">Create Watch Party</h1>
            <p className="text-content-secondary">Set up a new watch party to watch clips with friends</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-surface-secondary rounded-lg p-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-content-primary mb-2">
                Party Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Friday Night Watch Party"
                className="w-full px-4 py-2 bg-surface-primary border border-divider rounded-lg text-content-primary placeholder-content-tertiary focus:outline-none focus:border-primary-500"
                maxLength={200}
                required
              />
              <p className="mt-1 text-xs text-content-secondary">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-content-primary mb-3">
                Visibility
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-divider hover:bg-surface-tertiary cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.visibility === 'public'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as WatchPartyVisibility })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-content-primary font-medium mb-1">
                      <Globe className="w-4 h-4" />
                      <span>Public</span>
                    </div>
                    <p className="text-sm text-content-secondary">Anyone can discover and join your party</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-divider hover:bg-surface-tertiary cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="friends"
                    checked={formData.visibility === 'friends'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as WatchPartyVisibility })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-content-primary font-medium mb-1">
                      <UserPlus className="w-4 h-4" />
                      <span>Friends Only</span>
                    </div>
                    <p className="text-sm text-content-secondary">Only your friends can see and join</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-divider hover:bg-surface-tertiary cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="invite"
                    checked={formData.visibility === 'invite'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as WatchPartyVisibility })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-content-primary font-medium mb-1">
                      <Lock className="w-4 h-4" />
                      <span>Invite Only</span>
                    </div>
                    <p className="text-sm text-content-secondary">Only people with the invite code can join</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Password (optional for invite-only) */}
            {formData.visibility === 'invite' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-content-primary mb-2">
                  Password (Optional)
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Add extra security with a password"
                  className="w-full px-4 py-2 bg-surface-primary border border-divider rounded-lg text-content-primary placeholder-content-tertiary focus:outline-none focus:border-primary-500"
                />
                <p className="mt-1 text-xs text-content-secondary">
                  Participants will need this password to join
                </p>
              </div>
            )}

            {/* Max participants */}
            <div>
              <label htmlFor="max_participants" className="block text-sm font-medium text-content-primary mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Maximum Participants
              </label>
              <input
                type="number"
                id="max_participants"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 100 })}
                min={2}
                max={1000}
                className="w-full px-4 py-2 bg-surface-primary border border-divider rounded-lg text-content-primary placeholder-content-tertiary focus:outline-none focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-content-secondary">
                Recommended: 100 (2-1000 participants)
              </p>
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/watch-parties/browse')}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting || !formData.title.trim()}
                className="flex-1"
              >
                Create Party
              </Button>
            </div>
          </form>

          {/* Info box */}
          <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
            <h3 className="text-sm font-semibold text-primary-600 mb-2">What happens next?</h3>
            <ul className="text-sm text-content-secondary space-y-1">
              <li>• You'll be taken to your watch party room</li>
              <li>• Share the invite code or link with friends</li>
              <li>• Start watching clips together with synchronized playback</li>
              <li>• Chat and react in real-time during the party</li>
            </ul>
          </div>
        </div>
        <MiniFooter />
      </Container>
      <ScrollToTop />
    </>
  );
}
