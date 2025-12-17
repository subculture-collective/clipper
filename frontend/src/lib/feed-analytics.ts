// Feed Analytics & Performance Monitoring
// Tracks user interactions with the feed for analytics and algorithm optimization

interface Event {
  event_type: string;
  properties?: Record<string, any>;
}

interface QueuedEvent extends Event {
  user_id?: string;
  session_id: string;
  timestamp: string;
}

export class FeedAnalytics {
  private sessionId: string;
  private eventQueue: Event[] = [];
  private readonly maxQueueSize = 10; // Smaller queue for faster delivery, backend batches up to 100
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimer: number | null = null;
  private filterDebounceTimer: number | null = null;
  private filterDebounceMs = 500;
  private beforeUnloadHandler: (() => void) | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
    this.setupBeforeUnload();
  }

  /**
   * Generate a unique session ID for tracking
   */
  private generateSessionId(): string {
    // Check if session ID exists in sessionStorage
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Setup beforeunload handler to flush events on page exit
   */
  private setupBeforeUnload(): void {
    this.beforeUnloadHandler = () => {
      this.flush(true);
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Track feed viewed event
   */
  trackFeedViewed(params: {
    filters_applied: string[];
    sort_type: string;
    time_window?: string;
    clips_count: number;
  }): void {
    this.queueEvent({
      event_type: 'feed_viewed',
      properties: params,
    });
  }

  /**
   * Track filter applied with trailing debounce
   */
  trackFilterApplied(params: {
    filter_key: string;
    filter_value: string;
    previous_filters: string[];
    clips_returned: number;
  }): void {
    // Clear existing timer
    if (this.filterDebounceTimer !== null) {
      clearTimeout(this.filterDebounceTimer);
    }
    
    // Set new timer - trailing debounce captures final selection after 500ms of inactivity
    this.filterDebounceTimer = window.setTimeout(() => {
      this.queueEvent({
        event_type: 'filter_applied',
        properties: params,
      });
      this.filterDebounceTimer = null;
    }, this.filterDebounceMs);
  }

  /**
   * Track sort preference change
   */
  trackSortChanged(params: {
    from_sort: string;
    to_sort: string;
    time_window?: string;
  }): void {
    this.queueEvent({
      event_type: 'sort_changed',
      properties: params,
    });
  }

  /**
   * Track recommendation click with source tracking
   */
  trackRecommendationClicked(params: {
    clip_id: string;
    algorithm: string;
    position: number;
    reason?: string;
  }): void {
    this.queueEvent({
      event_type: 'recommendation_clicked',
      properties: params,
    });
  }

  /**
   * Track engagement metrics (dwell time, scroll depth)
   */
  trackFeedEngaged(params: {
    dwell_time_seconds: number;
    clips_viewed: number;
    likes_count: number;
    shares_count: number;
    scroll_depth_percent: number;
  }): void {
    this.queueEvent({
      event_type: 'feed_engaged',
      properties: params,
    });
  }

  /**
   * Queue an event for batch sending
   */
  private queueEvent(event: Event): void {
    this.eventQueue.push(event);
    
    // Auto-flush if queue reaches max size
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Flush events to the server
   */
  flush(useBeacon = false): void {
    if (this.eventQueue.length === 0) {
      return;
    }

    // Get current user ID from localStorage or context
    const userId = this.getCurrentUserId();

    // Prepare events with metadata (include session_id in payload for sendBeacon compatibility)
    const events: QueuedEvent[] = this.eventQueue.map(e => ({
      ...e,
      user_id: userId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    }));

    // Clear queue immediately to avoid sending duplicates
    this.eventQueue = [];

    // Send events
    const payload = JSON.stringify({ events });

    if (useBeacon && navigator.sendBeacon) {
      // Use sendBeacon for reliable delivery on page unload
      // Wrap payload in Blob with correct content type since sendBeacon doesn't support custom headers
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/events', blob);
    } else {
      // Use fetch for normal tracking
      fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
        },
        body: payload,
        keepalive: true, // Ensure request completes even if page is closed
      }).catch(error => {
        console.error('Failed to send analytics events:', error);
      });
    }
  }

  /**
   * Get current user ID from storage or auth context
   */
  private getCurrentUserId(): string | undefined {
    try {
      // Try to get user ID from localStorage (adjust key as needed)
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (error) {
      console.error('Failed to get user ID:', error);
    }
    return undefined;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.filterDebounceTimer !== null) {
      clearTimeout(this.filterDebounceTimer);
      this.filterDebounceTimer = null;
    }
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    this.flush(true);
  }
}

// Export singleton instance
export const feedAnalytics = new FeedAnalytics();

// Export event type constants
export const FeedEventTypes = {
  FEED_VIEWED: 'feed_viewed',
  FILTER_APPLIED: 'filter_applied',
  SORT_CHANGED: 'sort_changed',
  RECOMMENDATION_CLICKED: 'recommendation_clicked',
  FEED_ENGAGED: 'feed_engaged',
} as const;
