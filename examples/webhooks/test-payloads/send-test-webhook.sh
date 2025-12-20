#!/bin/bash

# Test webhook sender script
# Sends webhook requests with properly computed signatures to test your webhook implementation

set -euo pipefail

# Configuration
DEFAULT_SECRET="${WEBHOOK_SECRET:-test-secret-key-12345}"
DEFAULT_URL="http://localhost:3000/webhook"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to generate UUID
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    elif command -v python3 &> /dev/null; then
        python3 -c "import uuid; print(uuid.uuid4())"
    else
        # Fallback to random hex (not a true UUID but works for testing)
        cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 32 | head -n 1 | sed -e 's/\(........\)\(....\)\(....\)\(....\)/\1-\2-\3-\4-/'
    fi
}

# Function to compute HMAC-SHA256 signature
compute_signature() {
    local payload="$1"
    local secret="$2"
    echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" | awk '{print $2}'
}

# Function to send webhook
send_webhook() {
    local event_type="$1"
    local url="$2"
    local secret="$3"
    local delivery_id="$4"
    
    # Map event type to payload file
    local payload_file=""
    case "$event_type" in
        clip.submitted)
            payload_file="clip-submitted.json"
            ;;
        clip.approved)
            payload_file="clip-approved.json"
            ;;
        clip.rejected)
            payload_file="clip-rejected.json"
            ;;
        *)
            print_error "Unknown event type: $event_type"
            echo "Supported events: clip.submitted, clip.approved, clip.rejected"
            exit 1
            ;;
    esac
    
    # Check if payload file exists
    if [ ! -f "$payload_file" ]; then
        print_error "Payload file not found: $payload_file"
        exit 1
    fi
    
    # Read payload
    local payload
    payload=$(<"$payload_file")
    
    # Compute signature
    print_info "Computing signature..."
    local signature
    signature=$(compute_signature "$payload" "$secret")
    
    print_info "Sending webhook request..."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Event Type:   $event_type"
    echo "URL:          $url"
    echo "Delivery ID:  $delivery_id"
    echo "Signature:    $signature"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Send request
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "X-Webhook-Signature: $signature" \
        -H "X-Webhook-Event: $event_type" \
        -H "X-Webhook-Delivery-ID: $delivery_id" \
        -H "User-Agent: Clipper-Webhook-Test/1.0" \
        -d "$payload")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n-1)
    
    echo "HTTP Status:  $http_code"
    echo "Response:     $response_body"
    echo ""
    
    # Check status code
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_success "Webhook delivered successfully!"
    elif [ "$http_code" -eq 401 ]; then
        print_error "Unauthorized - Signature verification failed"
        print_warning "Check that you're using the correct secret: $secret"
    elif [ "$http_code" -eq 400 ]; then
        print_error "Bad Request - Invalid payload or missing headers"
    elif [ "$http_code" -eq 000 ]; then
        print_error "Connection failed - Is your server running at $url?"
    else
        print_warning "Unexpected status code: $http_code"
    fi
}

# Main script
main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  Clipper Webhook Test Sender"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    # Parse arguments
    local event_type="${1:-}"
    local url="${2:-$DEFAULT_URL}"
    local secret="${3:-$DEFAULT_SECRET}"
    local delivery_id="${4:-$(generate_uuid)}"
    
    # Validate arguments
    if [ -z "$event_type" ]; then
        print_error "Usage: $0 <event_type> [url] [secret] [delivery_id]"
        echo ""
        echo "Examples:"
        echo "  $0 clip.submitted"
        echo "  $0 clip.approved http://localhost:3000/webhook"
        echo "  $0 clip.rejected http://localhost:3000/webhook my-secret"
        echo ""
        echo "Supported events:"
        echo "  - clip.submitted"
        echo "  - clip.approved"
        echo "  - clip.rejected"
        echo ""
        echo "Environment variables:"
        echo "  WEBHOOK_SECRET  Secret to use for signing (default: test-secret-key-12345)"
        echo ""
        exit 1
    fi
    
    # Send webhook
    send_webhook "$event_type" "$url" "$secret" "$delivery_id"
    
    echo ""
}

# Run main function
main "$@"
