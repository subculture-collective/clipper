package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	Server       ServerConfig
	Database     DatabaseConfig
	Redis        RedisConfig
	JWT          JWTConfig
	Twitch       TwitchConfig
	CORS         CORSConfig
	OpenSearch   OpenSearchConfig
	Stripe       StripeConfig
	Sentry       SentryConfig
	Email        EmailConfig
	Embedding    EmbeddingConfig
	FeatureFlags FeatureFlagsConfig
	Karma        KarmaConfig
	Jobs         JobsConfig
}

// ServerConfig holds server-specific configuration
type ServerConfig struct {
	Port        string
	GinMode     string
	BaseURL     string
	Environment string
	ExportDir   string
	DocsPath    string
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

// OpenSearchConfig holds OpenSearch configuration
type OpenSearchConfig struct {
	URL                string
	Username           string
	Password           string
	InsecureSkipVerify bool
}

// StripeConfig holds Stripe payment configuration
type StripeConfig struct {
	SecretKey            string
	WebhookSecrets       []string
	ProMonthlyPriceID    string
	ProYearlyPriceID     string
	ProMonthlyPriceCents int // Monthly price in cents (e.g., 999 for $9.99)
	ProYearlyPriceCents  int // Full yearly price in cents (e.g., 9999 for $99.99/year) - service layer converts to monthly equivalent
	SuccessURL           string
	CancelURL            string
	TaxEnabled           bool // Enable automatic tax calculation via Stripe Tax
	InvoicePDFEnabled    bool // Enable sending invoice PDFs via email
}

// SentryConfig holds Sentry error tracking configuration
type SentryConfig struct {
	DSN              string
	Environment      string
	Release          string
	TracesSampleRate float64
	Enabled          bool
}

// EmailConfig holds email notification configuration
type EmailConfig struct {
	SendGridAPIKey   string
	FromEmail        string
	FromName         string
	Enabled          bool
	MaxEmailsPerHour int
}

// EmbeddingConfig holds embedding service configuration
type EmbeddingConfig struct {
	OpenAIAPIKey             string
	Model                    string
	RequestsPerMinute        int
	SchedulerIntervalMinutes int
	Enabled                  bool
}

// FeatureFlagsConfig holds feature flag configuration
type FeatureFlagsConfig struct {
	SemanticSearch       bool
	PremiumSubscriptions bool
	EmailNotifications   bool
	PushNotifications    bool
	Analytics            bool
	Moderation           bool
	DiscoveryLists       bool
}

// KarmaConfig holds karma system configuration
type KarmaConfig struct {
	InitialKarmaPoints         int  // Karma points granted to new users on signup
	SubmissionKarmaRequired    int  // Minimum karma required to submit clips
	RequireKarmaForSubmission  bool // Whether to enforce karma requirement for submissions
}

// JobsConfig holds background job interval configuration
type JobsConfig struct {
	HotClipsRefreshIntervalMinutes int
	WebhookRetryIntervalMinutes    int
	WebhookRetryBatchSize          int
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
			Port:        getEnv("PORT", "8080"),
			GinMode:     getEnv("GIN_MODE", "debug"),
			BaseURL:     getEnv("BASE_URL", "http://localhost:5173"),
			Environment: getEnv("ENVIRONMENT", "development"),
			ExportDir:   getEnv("EXPORT_DIR", "./exports"),
			DocsPath:    getEnv("DOCS_PATH", "../docs"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "clipper"),
			Password: getEnv("DB_PASSWORD", "CHANGEME_SECURE_PASSWORD_HERE"),
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
		OpenSearch: OpenSearchConfig{
			URL:                getEnv("OPENSEARCH_URL", "http://localhost:9200"),
			Username:           getEnv("OPENSEARCH_USERNAME", ""),
			Password:           getEnv("OPENSEARCH_PASSWORD", ""),
			InsecureSkipVerify: getEnv("OPENSEARCH_INSECURE_SKIP_VERIFY", "true") == "true",
		},
		Stripe: StripeConfig{
			SecretKey:            getEnv("STRIPE_SECRET_KEY", ""),
			WebhookSecrets:       collectStripeWebhookSecrets(),
			ProMonthlyPriceID:    getEnv("STRIPE_PRO_MONTHLY_PRICE_ID", ""),
			ProYearlyPriceID:     getEnv("STRIPE_PRO_YEARLY_PRICE_ID", ""),
			ProMonthlyPriceCents: getEnvInt("STRIPE_PRO_MONTHLY_PRICE_CENTS", 999), // Default: $9.99/month
			ProYearlyPriceCents:  getEnvInt("STRIPE_PRO_YEARLY_PRICE_CENTS", 9999), // Default: $99.99/year (full yearly price)
			SuccessURL:           getEnv("STRIPE_SUCCESS_URL", "http://localhost:5173/subscription/success"),
			CancelURL:            getEnv("STRIPE_CANCEL_URL", "http://localhost:5173/subscription/cancel"),
			TaxEnabled:           getEnv("STRIPE_TAX_ENABLED", "false") == "true",
			InvoicePDFEnabled:    getEnv("STRIPE_INVOICE_PDF_ENABLED", "false") == "true",
		},
		Sentry: SentryConfig{
			DSN:              getEnv("SENTRY_DSN", ""),
			Environment:      getEnv("SENTRY_ENVIRONMENT", "development"),
			Release:          getEnv("SENTRY_RELEASE", ""),
			TracesSampleRate: getEnvFloat("SENTRY_TRACES_SAMPLE_RATE", 1.0),
			Enabled:          getEnv("SENTRY_ENABLED", "false") == "true",
		},
		Email: EmailConfig{
			SendGridAPIKey:   getEnv("SENDGRID_API_KEY", ""),
			FromEmail:        getEnv("EMAIL_FROM_ADDRESS", "noreply@clipper.gg"),
			FromName:         getEnv("EMAIL_FROM_NAME", "Clipper"),
			Enabled:          getEnv("EMAIL_ENABLED", "false") == "true",
			MaxEmailsPerHour: getEnvInt("EMAIL_MAX_PER_HOUR", 10),
		},
		Embedding: EmbeddingConfig{
			OpenAIAPIKey:             getEnv("OPENAI_API_KEY", ""),
			Model:                    getEnv("EMBEDDING_MODEL", "text-embedding-3-small"),
			RequestsPerMinute:        getEnvInt("EMBEDDING_REQUESTS_PER_MINUTE", 500),
			SchedulerIntervalMinutes: getEnvInt("EMBEDDING_SCHEDULER_INTERVAL_MINUTES", 360),
			Enabled:                  getEnv("EMBEDDING_ENABLED", "false") == "true",
		},
		FeatureFlags: FeatureFlagsConfig{
			SemanticSearch:       getEnv("FEATURE_SEMANTIC_SEARCH", "false") == "true",
			PremiumSubscriptions: getEnv("FEATURE_PREMIUM_SUBSCRIPTIONS", "false") == "true",
			EmailNotifications:   getEnv("FEATURE_EMAIL_NOTIFICATIONS", "false") == "true",
			PushNotifications:    getEnv("FEATURE_PUSH_NOTIFICATIONS", "false") == "true",
			Analytics:            getEnv("FEATURE_ANALYTICS", "true") == "true",
			Moderation:           getEnv("FEATURE_MODERATION", "true") == "true",
			DiscoveryLists:       getEnv("FEATURE_DISCOVERY_LISTS", "false") == "true",
		},
		Karma: KarmaConfig{
			InitialKarmaPoints:        getEnvInt("KARMA_INITIAL_POINTS", 100),
			SubmissionKarmaRequired:   getEnvInt("KARMA_SUBMISSION_REQUIRED", 100),
			RequireKarmaForSubmission: getEnv("KARMA_REQUIRE_FOR_SUBMISSION", "true") == "true",
		},
		Jobs: JobsConfig{
			HotClipsRefreshIntervalMinutes: getEnvInt("HOT_CLIPS_REFRESH_INTERVAL_MINUTES", 5),
			WebhookRetryIntervalMinutes:    getEnvInt("WEBHOOK_RETRY_INTERVAL_MINUTES", 1),
			WebhookRetryBatchSize:          getEnvInt("WEBHOOK_RETRY_BATCH_SIZE", 100),
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

// getEnvFloat gets a float environment variable with a fallback default value
func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
			return floatVal
		}
	}
	return defaultValue
}

// getEnvInt gets an int environment variable with a fallback default value
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// collectStripeWebhookSecrets gathers the configured Stripe webhook secrets, supporting
// one primary secret plus optional alternates without requiring multiple endpoints.
func collectStripeWebhookSecrets() []string {
	secrets := make([]string, 0, 3)
	add := func(raw string) {
		if v := strings.TrimSpace(raw); v != "" {
			secrets = append(secrets, v)
		}
	}
	add(getEnv("STRIPE_WEBHOOK_SECRET", ""))
	add(getEnv("STRIPE_WEBHOOK_SECRET_ALT", ""))
	for _, part := range strings.Split(getEnv("STRIPE_WEBHOOK_SECRETS", ""), ",") {
		add(part)
	}
	return secrets
}
