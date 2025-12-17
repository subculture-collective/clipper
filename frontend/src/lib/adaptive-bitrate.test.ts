import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveBitrateSelector, QUALITY_LEVELS } from './adaptive-bitrate';

describe('AdaptiveBitrateSelector', () => {
  let selector: AdaptiveBitrateSelector;

  beforeEach(() => {
    selector = new AdaptiveBitrateSelector();
  });

  describe('Quality Selection', () => {
    it('should select 4K for high bandwidth and good buffer', () => {
      const quality = selector.selectQuality(30, 90);
      expect(quality).toBe('4K');
    });

    it('should select 2K for medium-high bandwidth and good buffer', () => {
      const quality = selector.selectQuality(17, 80);
      expect(quality).toBe('2K');
    });

    it('should select 1080p for medium bandwidth and good buffer', () => {
      const quality = selector.selectQuality(12, 75);
      expect(quality).toBe('1080p');
    });

    it('should select 720p for medium-low bandwidth', () => {
      const quality = selector.selectQuality(7, 65);
      expect(quality).toBe('720p');
    });

    it('should select 480p for low bandwidth', () => {
      const quality = selector.selectQuality(3, 50);
      expect(quality).toBe('480p');
    });

    it('should select 480p for very low bandwidth', () => {
      const quality = selector.selectQuality(1, 30);
      expect(quality).toBe('480p');
    });

    it('should downgrade quality when buffer health is low', () => {
      // Even with high bandwidth, low buffer should prevent highest quality
      const quality = selector.selectQuality(30, 50);
      expect(quality).not.toBe('4K');
      expect(quality).not.toBe('2K');
    });

    it('should prevent 4K when buffer health is below threshold', () => {
      const quality = selector.selectQuality(30, 75);
      expect(quality).not.toBe('4K');
    });

    it('should prevent 2K when buffer health is below threshold', () => {
      const quality = selector.selectQuality(18, 70);
      expect(quality).not.toBe('2K');
    });

    it('should prevent 1080p when buffer health is below threshold', () => {
      const quality = selector.selectQuality(12, 65);
      expect(quality).not.toBe('1080p');
    });
  });

  describe('Bandwidth History', () => {
    it('should maintain bandwidth history', () => {
      selector.selectQuality(5, 80);
      selector.selectQuality(6, 80);
      selector.selectQuality(7, 80);

      const history = selector.getBandwidthHistory();
      expect(history).toHaveLength(3);
      expect(history).toEqual([5, 6, 7]);
    });

    it('should limit history length to 10 measurements', () => {
      for (let i = 0; i < 15; i++) {
        selector.selectQuality(5 + i, 80);
      }

      const history = selector.getBandwidthHistory();
      expect(history).toHaveLength(10);
      expect(history[0]).toBe(10); // First value should be 5+5
      expect(history[9]).toBe(19); // Last value should be 5+14
    });

    it('should smooth bandwidth variations with averaging', () => {
      // Add varying bandwidth measurements
      selector.selectQuality(5, 80);
      selector.selectQuality(15, 80);
      selector.selectQuality(10, 80);

      const avgBandwidth = selector.getAverageBandwidth();
      expect(avgBandwidth).toBe(10); // (5 + 15 + 10) / 3
    });

    it('should provide stable quality with fluctuating bandwidth', () => {
      // Simulate fluctuating network
      selector.selectQuality(8, 80);
      selector.selectQuality(12, 80);
      selector.selectQuality(7, 80);
      selector.selectQuality(11, 80);
      const quality = selector.selectQuality(9, 80);

      // Average is around 9.4, should select 1080p
      expect(quality).toBe('1080p');
    });
  });

  describe('Reset', () => {
    it('should reset bandwidth history', () => {
      selector.selectQuality(10, 80);
      selector.selectQuality(15, 80);
      
      selector.reset();
      
      const history = selector.getBandwidthHistory();
      expect(history).toHaveLength(0);
    });

    it('should return to initial state after reset', () => {
      selector.selectQuality(20, 90);
      selector.reset();
      
      const avgBandwidth = selector.getAverageBandwidth();
      expect(avgBandwidth).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero bandwidth', () => {
      const quality = selector.selectQuality(0, 80);
      expect(quality).toBe('480p');
    });

    it('should handle negative bandwidth', () => {
      const quality = selector.selectQuality(-5, 80);
      expect(quality).toBe('480p');
    });

    it('should handle extremely high bandwidth', () => {
      const quality = selector.selectQuality(1000, 100);
      expect(quality).toBe('4K'); // Should still max out at 4K
    });

    it('should handle zero buffer health', () => {
      const quality = selector.selectQuality(30, 0);
      expect(quality).toBe('480p'); // Should fallback to lowest quality
    });

    it('should handle 100% buffer health', () => {
      const quality = selector.selectQuality(30, 100);
      expect(quality).toBe('4K');
    });
  });

  describe('Quality Levels Configuration', () => {
    it('should have correct quality levels defined', () => {
      expect(QUALITY_LEVELS).toHaveLength(5);
      
      const qualities = QUALITY_LEVELS.map(level => level.quality);
      expect(qualities).toEqual(['480p', '720p', '1080p', '2K', '4K']);
    });

    it('should have bandwidth requirements in ascending order', () => {
      const bandwidths = QUALITY_LEVELS.map(level => level.bandwidth);
      expect(bandwidths).toEqual([2, 5, 10, 15, 25]);
    });

    it('should have resolution dimensions matching quality names', () => {
      const qualityMap = {
        '480p': { width: 854, height: 480 },
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '2K': { width: 2560, height: 1440 },
        '4K': { width: 3840, height: 2160 },
      };

      QUALITY_LEVELS.forEach(level => {
        const expected = qualityMap[level.quality];
        expect(level.width).toBe(expected.width);
        expect(level.height).toBe(expected.height);
      });
    });
  });
});
