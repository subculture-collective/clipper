package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/repository"
)

// SEOHandler handles SEO-related endpoints (sitemap, robots.txt)
type SEOHandler struct {
	clipRepo *repository.ClipRepository
}

// NewSEOHandler creates a new SEO handler
func NewSEOHandler(clipRepo *repository.ClipRepository) *SEOHandler {
	return &SEOHandler{
		clipRepo: clipRepo,
	}
}

// GetSitemap generates and returns an XML sitemap
func (h *SEOHandler) GetSitemap(c *gin.Context) {
	// Get all clips with basic info for sitemap
	ctx := c.Request.Context()
	clips, err := h.clipRepo.ListForSitemap(ctx)
	if err != nil {
		c.String(http.StatusInternalServerError, "Error generating sitemap")
		return
	}

	// Build sitemap XML
	xml := `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

	// Base URL from config or environment
	baseURL := c.GetString("base_url")
	if baseURL == "" {
		baseURL = "https://clipper.app" // Default, should be configured
	}

	// Static pages
	staticPages := []struct {
		path     string
		priority string
		changefreq string
	}{
		{"/", "1.0", "daily"},
		{"/discover", "0.9", "daily"},
		{"/new", "0.9", "daily"},
		{"/top", "0.9", "daily"},
		{"/rising", "0.9", "daily"},
		{"/search", "0.8", "weekly"},
		{"/leaderboards", "0.7", "weekly"},
		{"/about", "0.5", "monthly"},
		{"/community-rules", "0.5", "monthly"},
		{"/terms", "0.4", "monthly"},
		{"/privacy", "0.4", "monthly"},
		{"/pricing", "0.6", "weekly"},
	}

	for _, page := range staticPages {
		xml += fmt.Sprintf(`  <url>
    <loc>%s%s</loc>
    <changefreq>%s</changefreq>
    <priority>%s</priority>
  </url>
`, baseURL, page.path, page.changefreq, page.priority)
	}

	// Dynamic clip pages
	for _, clip := range clips {
		xml += fmt.Sprintf(`  <url>
    <loc>%s/clip/%s</loc>
    <lastmod>%s</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`, baseURL, clip.ID, clip.CreatedAt.Format(time.RFC3339))
	}

	xml += `</urlset>`

	c.Header("Content-Type", "application/xml")
	c.String(http.StatusOK, xml)
}

// GetRobotsTxt returns the robots.txt file
func (h *SEOHandler) GetRobotsTxt(c *gin.Context) {
	// Get environment from context
	env := c.GetString("environment")
	
	var robotsTxt string
	if env == "production" {
		// Production: Allow all crawlers
		robotsTxt = `User-agent: *
Allow: /

# Sitemap location
Sitemap: https://clipper.app/sitemap.xml

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/
Disallow: /auth/
Disallow: /settings
Disallow: /profile
Disallow: /favorites
Disallow: /notifications
Disallow: /submit
Disallow: /submissions

# Crawl-delay for polite crawling
Crawl-delay: 1
`
	} else {
		// Non-production: Disallow all
		robotsTxt = `User-agent: *
Disallow: /

# This is a staging/development environment
`
	}

	c.Header("Content-Type", "text/plain")
	c.String(http.StatusOK, robotsTxt)
}
