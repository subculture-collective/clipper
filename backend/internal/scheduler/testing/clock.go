package testing

import (
	"sync"
	"time"
)

// Clock is an interface for time operations that can be mocked in tests
type Clock interface {
	Now() time.Time
	After(d time.Duration) <-chan time.Time
	NewTicker(d time.Duration) Ticker
	Sleep(d time.Duration)
}

// Ticker is an interface for time.Ticker that can be mocked
type Ticker interface {
	C() <-chan time.Time
	Stop()
	Reset(d time.Duration)
}

// RealClock implements Clock using real time operations
type RealClock struct{}

// Now returns the current time
func (RealClock) Now() time.Time {
	return time.Now()
}

// After waits for the duration to elapse and then sends the current time on the returned channel
func (RealClock) After(d time.Duration) <-chan time.Time {
	return time.After(d)
}

// NewTicker returns a new Ticker containing a channel that will send the time on the channel after each tick
func (RealClock) NewTicker(d time.Duration) Ticker {
	return &realTicker{Ticker: time.NewTicker(d)}
}

// Sleep pauses the current goroutine for at least the duration d
func (RealClock) Sleep(d time.Duration) {
	time.Sleep(d)
}

// realTicker wraps time.Ticker to implement our Ticker interface
type realTicker struct {
	*time.Ticker
}

func (t *realTicker) C() <-chan time.Time {
	return t.Ticker.C
}

func (t *realTicker) Reset(d time.Duration) {
	t.Ticker.Reset(d)
}

// MockClock provides a controllable clock for testing
type MockClock struct {
	mu         sync.RWMutex
	now        time.Time
	tickers    []*mockTicker
	afterChans []chan time.Time
}

// NewMockClock creates a new mock clock starting at the given time
func NewMockClock(startTime time.Time) *MockClock {
	return &MockClock{
		now: startTime,
	}
}

// Now returns the current mocked time
func (m *MockClock) Now() time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.now
}

// After creates a channel that will receive the time after the duration
func (m *MockClock) After(d time.Duration) <-chan time.Time {
	ch := make(chan time.Time, 1)
	m.mu.Lock()
	m.afterChans = append(m.afterChans, ch)
	m.mu.Unlock()
	
	go func() {
		// In a real scenario, this would be triggered by Advance()
		// For now, we'll send immediately for backwards compatibility
		ch <- m.Now().Add(d)
	}()
	
	return ch
}

// NewTicker creates a new mock ticker
func (m *MockClock) NewTicker(d time.Duration) Ticker {
	ticker := &mockTicker{
		duration: d,
		c:        make(chan time.Time, 1),
		clock:    m,
		stopped:  false,
	}
	
	m.mu.Lock()
	m.tickers = append(m.tickers, ticker)
	m.mu.Unlock()
	
	return ticker
}

// Sleep does nothing in mock clock (immediate return)
func (m *MockClock) Sleep(d time.Duration) {
	// No-op in mock clock - use Advance() to control time
}

// Advance moves the mock clock forward by the given duration and triggers any pending tickers
func (m *MockClock) Advance(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.now = m.now.Add(d)
	
	// Trigger all active tickers
	for _, ticker := range m.tickers {
		if !ticker.IsStopped() {
			select {
			case ticker.c <- m.now:
			default:
				// Channel full, skip this tick
			}
		}
	}
}

// Set sets the clock to a specific time
func (m *MockClock) Set(t time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.now = t
}

// mockTicker implements the Ticker interface for testing
type mockTicker struct {
	duration time.Duration
	c        chan time.Time
	clock    *MockClock
	stopped  bool
	mu       sync.RWMutex
}

func (t *mockTicker) C() <-chan time.Time {
	return t.c
}

func (t *mockTicker) Stop() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.stopped = true
}

func (t *mockTicker) Reset(d time.Duration) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.duration = d
	t.stopped = false
}

// IsStopped returns whether the ticker has been stopped (for testing)
func (t *mockTicker) IsStopped() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.stopped
}
