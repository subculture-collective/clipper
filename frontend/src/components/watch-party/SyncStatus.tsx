import { Activity, Loader, Wifi, WifiOff } from 'lucide-react';

export interface SyncStatusProps {
  isConnected: boolean;
  syncState?: 'in-sync' | 'catching-up' | 'buffering';
  className?: string;
}

/**
 * Displays the current sync status for the watch party.
 * Shows connection state and sync quality.
 */
export function SyncStatus({
  isConnected,
  syncState,
  className = '',
}: SyncStatusProps) {
  const getStatusColor = () => {
    if (!isConnected) return 'text-error-600';
    
    switch (syncState) {
      case 'in-sync':
        return 'text-success-600';
      case 'catching-up':
        return 'text-warning-600';
      case 'buffering':
        return 'text-warning-600';
      default:
        return 'text-content-secondary';
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) {
      return <WifiOff className="w-4 h-4" />;
    }
    
    switch (syncState) {
      case 'in-sync':
        return <Wifi className="w-4 h-4" />;
      case 'catching-up':
        return <Activity className="w-4 h-4 animate-pulse" />;
      case 'buffering':
        return <Loader className="w-4 h-4 animate-spin" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    
    switch (syncState) {
      case 'in-sync':
        return 'In Sync';
      case 'catching-up':
        return 'Catching Up';
      case 'buffering':
        return 'Buffering';
      default:
        return 'Connected';
    }
  };

  const statusColor = getStatusColor();

  return (
    <div className={`flex items-center gap-2 ${statusColor} ${className}`}>
      {getStatusIcon()}
      <span className="text-sm font-medium">{getStatusText()}</span>
    </div>
  );
}
