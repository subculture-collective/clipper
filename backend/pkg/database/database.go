package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/config"
)

// DB holds the database connection pool
type DB struct {
	Pool *pgxpool.Pool
}

// NewDB creates a new database connection pool
func NewDB(cfg *config.DatabaseConfig) (*DB, error) {
	ctx := context.Background()

	// Configure connection pool
	poolConfig, err := pgxpool.ParseConfig(cfg.GetDatabaseURL())
	if err != nil {
		return nil, fmt.Errorf("unable to parse database URL: %w", err)
	}

	// Set pool configuration
	poolConfig.MaxConns = 25                               // Maximum number of connections
	poolConfig.MinConns = 5                                // Minimum number of connections
	poolConfig.MaxConnLifetime = time.Hour                 // Maximum connection lifetime
	poolConfig.MaxConnIdleTime = 30 * time.Minute          // Maximum idle time
	poolConfig.HealthCheckPeriod = time.Minute             // Health check interval
	poolConfig.ConnConfig.ConnectTimeout = 5 * time.Second // Connection timeout

	// Create connection pool
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	log.Println("Database connection pool established successfully")

	return &DB{Pool: pool}, nil
}

// Close closes the database connection pool
func (db *DB) Close() {
	db.Pool.Close()
	log.Println("Database connection pool closed")
}

// HealthCheck checks if the database is accessible
func (db *DB) HealthCheck(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := db.Pool.Ping(ctx); err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}

	return nil
}

// GetStats returns connection pool statistics
func (db *DB) GetStats() *pgxpool.Stat {
	return db.Pool.Stat()
}
