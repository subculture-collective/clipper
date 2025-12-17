/**
 * Adaptive bitrate selection for HLS video streaming
 * Automatically selects optimal video quality based on network conditions
 */

export type VideoQuality = '480p' | '720p' | '1080p' | '2K' | '4K' | 'auto';

export interface QualityLevel {
  quality: VideoQuality;
  bandwidth: number; // Mbps
  width: number;
  height: number;
}

export const QUALITY_LEVELS: QualityLevel[] = [
  { quality: '480p', bandwidth: 2, width: 854, height: 480 },
  { quality: '720p', bandwidth: 5, width: 1280, height: 720 },
  { quality: '1080p', bandwidth: 10, width: 1920, height: 1080 },
  { quality: '2K', bandwidth: 15, width: 2560, height: 1440 },
  { quality: '4K', bandwidth: 25, width: 3840, height: 2160 },
];

/**
 * Adaptive bitrate selector for HLS video streaming
 * Maintains network bandwidth history and buffer health to select optimal quality
 */
export class AdaptiveBitrateSelector {
  private bandwidthHistory: number[] = [];
  private bufferHealth: number = 100;
  private readonly maxHistoryLength = 10;

  /**
   * Select optimal quality based on network conditions
   * @param networkBandwidth Current network bandwidth in Mbps
   * @param bufferHealth Current buffer health (0-100)
   * @returns Selected quality level
   */
  selectQuality(networkBandwidth: number, bufferHealth: number): VideoQuality {
    // Add to bandwidth history
    this.bandwidthHistory.push(networkBandwidth);
    this.bufferHealth = bufferHealth;

    // Keep last N measurements for smoothing
    if (this.bandwidthHistory.length > this.maxHistoryLength) {
      this.bandwidthHistory.shift();
    }

    // Calculate average bandwidth with smoothing
    const avgBandwidth = this.calculateAverageBandwidth();

    // Select quality based on bandwidth and buffer health
    return this.selectQualityLevel(avgBandwidth, bufferHealth);
  }

  /**
   * Calculate average bandwidth with exponential smoothing
   * More weight to recent measurements
   */
  private calculateAverageBandwidth(): number {
    if (this.bandwidthHistory.length === 0) return 0;

    // Simple moving average
    const sum = this.bandwidthHistory.reduce((a, b) => a + b, 0);
    return sum / this.bandwidthHistory.length;
  }

  /**
   * Select quality level based on bandwidth and buffer health
   * Uses conservative approach to prevent buffering
   */
  private selectQualityLevel(avgBandwidth: number, bufferHealth: number): VideoQuality {
    // Quality thresholds with buffer health consideration
    // Higher quality requires both good bandwidth and good buffer health
    if (avgBandwidth > 25 && bufferHealth > 80) return '4K';
    if (avgBandwidth > 15 && bufferHealth > 75) return '2K';
    if (avgBandwidth > 10 && bufferHealth > 70) return '1080p';
    if (avgBandwidth > 5 && bufferHealth > 60) return '720p';
    if (avgBandwidth > 2) return '480p';
    
    return '480p'; // Safe fallback
  }

  /**
   * Reset bandwidth history and buffer health
   */
  reset(): void {
    this.bandwidthHistory = [];
    this.bufferHealth = 100;
  }

  /**
   * Get current average bandwidth
   */
  getAverageBandwidth(): number {
    return this.calculateAverageBandwidth();
  }

  /**
   * Get bandwidth history
   */
  getBandwidthHistory(): number[] {
    return [...this.bandwidthHistory];
  }
}
