package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Twitch   TwitchConfig
	CORS     CORSConfig
}

// ServerConfig holds server-specific configuration
type ServerConfig struct {
	Port    string
	GinMode string
}

// DatabaseConfig holds database connection configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

// RedisConfig holds Redis connection configuration
type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

// JWTConfig holds JWT authentication configuration
type JWTConfig struct {
	PrivateKey string
	PublicKey  string
}

// TwitchConfig holds Twitch API configuration
type TwitchConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	redisDB, err := strconv.Atoi(getEnv("REDIS_DB", "0"))
	if err != nil {
		redisDB = 0
	}

	config := &Config{
		Server: ServerConfig{
			Port:    getEnv("PORT", "8080"),
			GinMode: getEnv("GIN_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "clipper"),
			Password: getEnv("DB_PASSWORD", "clipper_password"),
			Name:     getEnv("DB_NAME", "clipper_db"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       redisDB,
		},
		JWT: JWTConfig{
			PrivateKey: getEnv("JWT_PRIVATE_KEY", ""),
			PublicKey:  getEnv("JWT_PUBLIC_KEY", ""),
		},
		Twitch: TwitchConfig{
			ClientID:     getEnv("TWITCH_CLIENT_ID", ""),
			ClientSecret: getEnv("TWITCH_CLIENT_SECRET", ""),
			RedirectURI:  getEnv("TWITCH_REDIRECT_URI", "http://localhost:8080/api/v1/auth/twitch/callback"),
		},
		CORS: CORSConfig{
			AllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"),
		},
	}

	return config, nil
}

// GetDatabaseURL returns a PostgreSQL connection string
func (c *DatabaseConfig) GetDatabaseURL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.User,
		c.Password,
		c.Host,
		c.Port,
		c.Name,
		c.SSLMode,
	)
}

// getEnv gets an environment variable with a fallback default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
