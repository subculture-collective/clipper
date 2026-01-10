import { useState } from 'react';
import { SyncBansModal } from '@/components/moderation/SyncBansModal';
import { Button } from '@/components/ui/Button';

/**
 * Demo page for SyncBansModal component
 * This demonstrates the different states and features of the modal
 */
export function SyncBansModalDemo() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    console.log('Sync completed successfully!');
    alert('Sync completed successfully! Check the console for details.');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Sync Bans Modal Demo</h1>
        
        <div className="bg-card rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Component Demo</h2>
          
          <p className="text-muted-foreground mb-6">
            This modal allows synchronizing bans from a Twitch channel to your local ban list.
            Click the button below to open the modal.
          </p>

          <Button onClick={() => setIsOpen(true)}>
            Sync Bans from Twitch
          </Button>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Features</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Enter Twitch channel name to sync from</li>
              <li>Confirmation dialog before starting sync</li>
              <li>Real-time progress tracking with polling</li>
              <li>Result summary showing bans added and existing</li>
              <li>Comprehensive error handling</li>
              <li>Async job support with status updates</li>
            </ul>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Test Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "Sync Bans from Twitch" button</li>
              <li>Enter a Twitch channel name (e.g., "twitchdev")</li>
              <li>Click "Start Sync" to see the confirmation dialog</li>
              <li>Click "Confirm Sync" to initiate the process</li>
              <li>Observe the progress indicator (polls every 2 seconds)</li>
              <li>View the result summary when complete</li>
            </ol>
          </div>
        </div>
      </div>

      <SyncBansModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        channelId="demo-channel-123"
        onSuccess={handleSuccess}
      />
    </div>
  );
}
