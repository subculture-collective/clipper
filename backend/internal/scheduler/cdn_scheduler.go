package scheduler

import (
	"context"
	"log"
	"sync"
	"time"
)

// CDNServiceInterface defines the interface required by the CDN scheduler
type CDNServiceInterface interface {
	CollectMetrics(ctx context.Context) error
	CheckCostThreshold(ctx context.Context) (bool, float64, error)
}

// CDNScheduler manages periodic CDN metrics collection
type CDNScheduler struct {
	cdnService       CDNServiceInterface
	metricsInterval  time.Duration
	stopChan         chan struct{}
	stopOnce         sync.Once
}

// NewCDNScheduler creates a new CDN scheduler
func NewCDNScheduler(
	cdnService CDNServiceInterface,
	metricsIntervalMinutes int,
) *CDNScheduler {
	return &CDNScheduler{
		cdnService:      cdnService,
		metricsInterval: time.Duration(metricsIntervalMinutes) * time.Minute,
		stopChan:        make(chan struct{}),
	}
}

// Start begins the periodic CDN metrics collection
func (s *CDNScheduler) Start(ctx context.Context) {
	log.Printf("Starting CDN scheduler (metrics: %v)", s.metricsInterval)

	metricsTicker := time.NewTicker(s.metricsInterval)
	defer metricsTicker.Stop()

	// Run initial metrics collection
	s.collectMetrics(ctx)

	for {
		select {
		case <-metricsTicker.C:
			s.collectMetrics(ctx)
			s.checkCostThreshold(ctx)
		case <-s.stopChan:
			log.Println("CDN scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("CDN scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the CDN scheduler
func (s *CDNScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// collectMetrics performs CDN metrics collection
func (s *CDNScheduler) collectMetrics(ctx context.Context) {
	log.Println("Collecting CDN metrics...")
	start := time.Now()

	if err := s.cdnService.CollectMetrics(ctx); err != nil {
		log.Printf("ERROR: CDN metrics collection failed: %v", err)
		return
	}

	duration := time.Since(start)
	log.Printf("CDN metrics collection completed in %v", duration)
}

// checkCostThreshold checks if CDN costs exceed the configured threshold
func (s *CDNScheduler) checkCostThreshold(ctx context.Context) {
	exceeded, costPerGB, err := s.cdnService.CheckCostThreshold(ctx)
	if err != nil {
		log.Printf("ERROR: CDN cost threshold check failed: %v", err)
		return
	}

	if exceeded {
		log.Printf("ALERT: CDN cost per GB ($%.4f) exceeds configured threshold", costPerGB)
		// In a real implementation, this would trigger an alert via email/Slack/PagerDuty
	}
}
