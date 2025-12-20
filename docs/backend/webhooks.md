<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Webhook Integration Guide](#webhook-integration-guide)
  - [Overview](#overview)
  - [Supported Events](#supported-events)
  - [Getting Started](#getting-started)
    - [1. Create a Webhook Subscription](#1-create-a-webhook-subscription)
    - [2. Webhook URL Requirements](#2-webhook-url-requirements)
    - [3. Verify Webhook Signatures](#3-verify-webhook-signatures)
  - [Webhook Payload Structure](#webhook-payload-structure)
    - [Event-Specific Fields](#event-specific-fields)
  - [Retry Behavior](#retry-behavior)
  - [Managing Webhook Subscriptions](#managing-webhook-subscriptions)
    - [List Your Subscriptions](#list-your-subscriptions)
    - [Get Subscription Details](#get-subscription-details)
    - [Update Subscription](#update-subscription)
    - [Delete Subscription](#delete-subscription)
    - [Regenerate Secret](#regenerate-secret)
    - [View Delivery History](#view-delivery-history)
  - [Best Practices](#best-practices)
    - [1. Use HTTPS](#1-use-https)
    - [2. Validate Signatures](#2-validate-signatures)
    - [3. Return Quickly](#3-return-quickly)
    - [4. Handle Duplicates](#4-handle-duplicates)
    - [5. Monitor Your Endpoints](#5-monitor-your-endpoints)
    - [6. Test Webhooks](#6-test-webhooks)
  - [Rate Limits](#rate-limits)
  - [Troubleshooting](#troubleshooting)
    - [Webhooks Not Received](#webhooks-not-received)
    - [Signature Verification Fails](#signature-verification-fails)
    - [High Failure Rate](#high-failure-rate)
  - [Security Considerations](#security-considerations)
  - [Support](#support)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Webhook Integration Guide"
summary: "This guide explains how to integrate with Clipper's outbound webhooks to receive real-time notificat"
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Webhook Integration Guide

This guide explains how to integrate with Clipper's outbound webhooks to receive real-time notifications when clips are submitted, approved, or rejected.

## Overview

Clipper webhooks allow third-party systems to receive HTTP POST notifications when specific events occur. All webhook payloads are signed using HMAC-SHA256 to verify authenticity.

## Supported Events

- `clip.submitted` - Fired when a clip is submitted for review
- `clip.approved` - Fired when a clip submission is approved
- `clip.rejected` - Fired when a clip submission is rejected

## Getting Started

### 1. Create a Webhook Subscription

**Endpoint:** `POST /api/v1/webhooks`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "url": "https://your-domain.com/webhook-endpoint",
  "events": ["clip.submitted", "clip.approved", "clip.rejected"],
  "description": "Production webhook for clip notifications"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "url": "https://your-domain.com/webhook-endpoint",
    "events": ["clip.submitted", "clip.approved", "clip.rejected"],
    "is_active": true,
    "description": "Production webhook for clip notifications",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "secret": "a1b2c3d4e5f6...64-character-hex-string",
  "message": "Webhook subscription created. Save the secret safely - it won't be shown again."
}
```

**Important:** The `secret` is only returned once during creation. Store it securely - you'll need it to verify webhook signatures.

### 2. Webhook URL Requirements

Your webhook endpoint must:
- Be publicly accessible via HTTP or HTTPS
- **Not** point to private/internal IP addresses (localhost, 192.168.x.x, 10.x.x.x, etc.)
- Respond within 10 seconds
- Return a 2xx HTTP status code to acknowledge receipt

### 3. Verify Webhook Signatures

All webhook requests include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature of the request body.

**Request Headers:**
```
POST /your-endpoint HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: a3f2b1c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1
X-Webhook-Event: clip.submitted
X-Webhook-Delivery-ID: 550e8400-e29b-41d4-a716-446655440001
User-Agent: Clipper-Webhooks/1.0
```

#### Verification Steps

**1. Extract the signature from headers:**
```javascript
const signature = req.headers['x-webhook-signature'];
```

**2. Compute HMAC-SHA256 of the raw request body:**
```javascript
const crypto = require('crypto');

const computedSignature = crypto
  .createHmac('sha256', YOUR_WEBHOOK_SECRET)
  .update(rawRequestBody)  // Important: use raw body, not parsed JSON
  .digest('hex');
```

**3. Compare signatures (use constant-time comparison):**
```javascript
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature, 'hex'),
  Buffer.from(computedSignature, 'hex')
);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}
```

#### Example Implementation (Node.js/Express)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// Important: You need raw body for signature verification
app.post('/webhook', 
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const eventType = req.headers['x-webhook-event'];
    const deliveryId = req.headers['x-webhook-delivery-id'];
    
    // Verify signature
    const computedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');
    
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    )) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }
    
    // Parse the verified payload
    const payload = JSON.parse(req.body.toString());
    
    console.log(`Received ${eventType} event:`, payload);
    
    // Process the webhook event
    switch (eventType) {
      case 'clip.submitted':
        handleClipSubmitted(payload.data);
        break;
      case 'clip.approved':
        handleClipApproved(payload.data);
        break;
      case 'clip.rejected':
        handleClipRejected(payload.data);
        break;
      default:
        console.warn('Unknown event type:', eventType);
    }
    
    // Acknowledge receipt
    res.status(200).send('OK');
  }
);
```

#### Example Implementation (Python/Flask)

```python
import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    event_type = request.headers.get('X-Webhook-Event')
    delivery_id = request.headers.get('X-Webhook-Delivery-ID')
    
    # Get raw request body
    raw_body = request.get_data()
    
    # Compute signature
    computed_signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    
    # Verify signature (constant-time comparison)
    if not hmac.compare_digest(signature, computed_signature):
        return 'Invalid signature', 401
    
    # Parse verified payload
    payload = request.get_json()
    
    print(f'Received {event_type} event:', payload)
    
    # Process the event
    if event_type == 'clip.submitted':
        handle_clip_submitted(payload['data'])
    elif event_type == 'clip.approved':
        handle_clip_approved(payload['data'])
    elif event_type == 'clip.rejected':
        handle_clip_rejected(payload['data'])
    
    return 'OK', 200
```

#### Example Implementation (Go)

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log"
	"net/http"
	"os"
)

// Load webhook secret from environment variable for security
// Fallback to placeholder only for example purposes
func getWebhookSecret() string {
	if secret := os.Getenv("WEBHOOK_SECRET"); secret != "" {
		return secret
	}
	return "your-webhook-secret-here"
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	// Only accept POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get signature from header
	signature := r.Header.Get("X-Webhook-Signature")
	eventType := r.Header.Get("X-Webhook-Event")
	deliveryID := r.Header.Get("X-Webhook-Delivery-ID")

	if signature == "" {
		http.Error(w, "Missing signature", http.StatusUnauthorized)
		return
	}

	// Read the raw request body
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Compute HMAC-SHA256 signature
	webhookSecret := getWebhookSecret()
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write(rawBody)
	computedSignature := hex.EncodeToString(mac.Sum(nil))

	// Compare signatures (constant-time comparison)
	if !hmac.Equal([]byte(signature), []byte(computedSignature)) {
		log.Printf("Invalid webhook signature for delivery %s", deliveryID)
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Signature is valid - parse and process the webhook
	log.Printf("Received %s event: %s", eventType, deliveryID)

	// Process webhook event here...
	// payload := parseJSON(rawBody)

	// Acknowledge receipt
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func main() {
	http.HandleFunc("/webhook", webhookHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

#### Example Implementation (Ruby/Rails)

```ruby
require 'openssl'

class WebhooksController < ApplicationController
  # Disable CSRF for webhooks
  skip_before_action :verify_authenticity_token

  def receive
    signature = request.headers['X-Webhook-Signature']
    event_type = request.headers['X-Webhook-Event']
    delivery_id = request.headers['X-Webhook-Delivery-ID']

    # Get raw request body
    raw_body = request.raw_post

    # Compute signature
    computed_signature = OpenSSL::HMAC.hexdigest(
      OpenSSL::Digest.new('sha256'),
      ENV['WEBHOOK_SECRET'],
      raw_body
    )

    # Verify signature (constant-time comparison)
    unless ActiveSupport::SecurityUtils.secure_compare(signature, computed_signature)
      Rails.logger.error("Invalid webhook signature for delivery #{delivery_id}")
      return head :unauthorized
    end

    # Parse verified payload
    payload = JSON.parse(raw_body)
    
    Rails.logger.info("Received #{event_type} event: #{delivery_id}")

    # Process the webhook event
    case event_type
    when 'clip.submitted'
      handle_clip_submitted(payload['data'])
    when 'clip.approved'
      handle_clip_approved(payload['data'])
    when 'clip.rejected'
      handle_clip_rejected(payload['data'])
    else
      Rails.logger.warn("Unknown event type: #{event_type}")
    end

    head :ok
  end

  private

  def handle_clip_submitted(data)
    # Process clip submission
  end

  def handle_clip_approved(data)
    # Process clip approval
  end

  def handle_clip_rejected(data)
    # Process clip rejection
  end
end
```

#### Example Implementation (Java/Spring Boot)

```java
package com.example.webhooks;

import org.springframework.web.bind.annotation.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

@RestController
@RequestMapping("/webhook")
public class WebhookController {

    // Load webhook secret from environment variable for security
    // Fallback to placeholder only for example purposes
    private static final String WEBHOOK_SECRET = 
        System.getenv("WEBHOOK_SECRET") != null 
            ? System.getenv("WEBHOOK_SECRET")
            : "your-webhook-secret-here";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping
    public ResponseEntity<String> handleWebhook(
            @RequestHeader("X-Webhook-Signature") String signature,
            @RequestHeader("X-Webhook-Event") String eventType,
            @RequestHeader("X-Webhook-Delivery-ID") String deliveryId,
            @RequestBody String rawBody) {
        
        try {
            // Compute signature
            String computedSignature = computeHmacSha256(rawBody, WEBHOOK_SECRET);
            
            // Verify signature (constant-time comparison)
            if (!MessageDigest.isEqual(
                signature.getBytes(StandardCharsets.UTF_8),
                computedSignature.getBytes(StandardCharsets.UTF_8))) {
                System.err.println("Invalid webhook signature for delivery " + deliveryId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
            }
            
            // Parse verified payload
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(rawBody, Map.class);
            
            System.out.println("Received " + eventType + " event: " + deliveryId);
            
            // Process webhook event
            switch (eventType) {
                case "clip.submitted":
                    handleClipSubmitted(payload);
                    break;
                case "clip.approved":
                    handleClipApproved(payload);
                    break;
                case "clip.rejected":
                    handleClipRejected(payload);
                    break;
                default:
                    System.err.println("Unknown event type: " + eventType);
            }
            
            return ResponseEntity.ok("OK");
            
        } catch (Exception e) {
            System.err.println("Failed to process webhook: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Processing failed");
        }
    }

    private String computeHmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(
            secret.getBytes(StandardCharsets.UTF_8), 
            "HmacSHA256"
        );
        mac.init(secretKey);
        
        byte[] hmacData = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        
        // Convert to hex string
        StringBuilder sb = new StringBuilder();
        for (byte b : hmacData) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private void handleClipSubmitted(Map<String, Object> payload) {
        // Process clip submission
    }

    private void handleClipApproved(Map<String, Object> payload) {
        // Process clip approval
    }

    private void handleClipRejected(Map<String, Object> payload) {
        // Process clip rejection
    }
}
```

#### Example Implementation (PHP)

```php
<?php
// webhook.php

$webhookSecret = getenv('WEBHOOK_SECRET');

// Get headers
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$eventType = $_SERVER['HTTP_X_WEBHOOK_EVENT'] ?? '';
$deliveryId = $_SERVER['HTTP_X_WEBHOOK_DELIVERY_ID'] ?? '';

// Get raw request body
$rawBody = file_get_contents('php://input');

// Compute signature
$computedSignature = hash_hmac('sha256', $rawBody, $webhookSecret);

// Verify signature (constant-time comparison)
if (!hash_equals($signature, $computedSignature)) {
    error_log("Invalid webhook signature for delivery $deliveryId");
    http_response_code(401);
    echo 'Invalid signature';
    exit;
}

// Parse verified payload
$payload = json_decode($rawBody, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("Failed to parse webhook payload: " . json_last_error_msg());
    http_response_code(400);
    echo 'Invalid JSON';
    exit;
}

error_log("Received $eventType event: $deliveryId");

// Process webhook event
switch ($eventType) {
    case 'clip.submitted':
        handleClipSubmitted($payload['data']);
        break;
    case 'clip.approved':
        handleClipApproved($payload['data']);
        break;
    case 'clip.rejected':
        handleClipRejected($payload['data']);
        break;
    default:
        error_log("Unknown event type: $eventType");
}

// Acknowledge receipt
http_response_code(200);
echo 'OK';

function handleClipSubmitted($data) {
    // Process clip submission
}

function handleClipApproved($data) {
    // Process clip approval
}

function handleClipRejected($data) {
    // Process clip rejection
}
?>
```

## Webhook Payload Structure

All webhook events follow this structure:

```json
{
  "event": "clip.submitted",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "submission_id": "550e8400-e29b-41d4-a716-446655440002",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "twitch_clip_id": "AwkwardHelpfulSalamanderSwiftRage",
    "twitch_clip_url": "https://clips.twitch.tv/AwkwardHelpfulSalamanderSwiftRage",
    "status": "pending",
    "is_nsfw": false,
    "created_at": "2024-01-15T10:30:00Z",
    "custom_title": "Amazing play!",
    "tags": ["highlight", "epic"]
  }
}
```

### Event-Specific Fields

#### clip.submitted
- Standard payload (shown above)
- If auto-approved, also includes `"auto_approved": true` in the `clip.approved` event that follows

#### clip.approved
```json
{
  "event": "clip.approved",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    // ... standard fields ...
    "reviewer_id": "789e0123-e45f-67g8-h901-234567890abc",
    "approved_at": "2024-01-15T10:35:00Z",
    "auto_approved": false  // true if automatically approved
  }
}
```

#### clip.rejected
```json
{
  "event": "clip.rejected",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    // ... standard fields ...
    "reviewer_id": "789e0123-e45f-67g8-h901-234567890abc",
    "rejection_reason": "Low quality clip",
    "rejected_at": "2024-01-15T10:35:00Z"
  }
}
```

## Retry Behavior

If your endpoint fails to respond with a 2xx status code, Clipper will automatically retry the delivery:

- **Max Attempts:** 5
- **Backoff Strategy:** Exponential backoff
  - Attempt 1: Immediate
  - Attempt 2: 60 seconds later
  - Attempt 3: 2 minutes later
  - Attempt 4: 4 minutes later
  - Attempt 5: 8 minutes later (capped at 1 hour max)

After 5 failed attempts, the delivery is marked as failed and moved to a dead-letter queue for manual review.

## Managing Webhook Subscriptions

### List Your Subscriptions

**Endpoint:** `GET /api/v1/webhooks`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://your-domain.com/webhook-endpoint",
      "events": ["clip.submitted", "clip.approved"],
      "is_active": true,
      "description": "Production webhook",
      "created_at": "2024-01-15T10:30:00Z",
      "last_delivery_at": "2024-01-15T12:45:00Z"
    }
  ]
}
```

### Get Subscription Details

**Endpoint:** `GET /api/v1/webhooks/{id}`

### Update Subscription

**Endpoint:** `PATCH /api/v1/webhooks/{id}`

**Request Body:**
```json
{
  "url": "https://new-domain.com/webhook",
  "events": ["clip.approved", "clip.rejected"],
  "is_active": true,
  "description": "Updated webhook"
}
```

### Delete Subscription

**Endpoint:** `DELETE /api/v1/webhooks/{id}`

### Regenerate Secret

If your webhook secret is compromised, regenerate it:

**Endpoint:** `POST /api/v1/webhooks/{id}/regenerate-secret`

**Response:**
```json
{
  "success": true,
  "secret": "new-64-character-hex-secret",
  "message": "Secret regenerated. Save it safely - it won't be shown again."
}
```

**Important:** Update your webhook endpoint with the new secret immediately to avoid failed deliveries.

### View Delivery History

**Endpoint:** `GET /api/v1/webhooks/{id}/deliveries?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "event_type": "clip.submitted",
      "status": "delivered",
      "http_status_code": 200,
      "attempt_count": 1,
      "delivered_at": "2024-01-15T10:30:05Z",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "event_type": "clip.approved",
      "status": "failed",
      "http_status_code": 500,
      "error_message": "HTTP 500: Internal Server Error",
      "attempt_count": 5,
      "created_at": "2024-01-15T11:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

## Best Practices

### 1. Use HTTPS
Always use HTTPS for your webhook endpoints to ensure data is encrypted in transit.

### 2. Validate Signatures
Always verify the `X-Webhook-Signature` header before processing webhook events to ensure they're from Clipper.

### 3. Return Quickly
Process webhooks asynchronously. Acknowledge receipt immediately (return 200) and process the event in the background.

```javascript
app.post('/webhook', async (req, res) => {
  // Verify signature
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Acknowledge immediately
  res.status(200).send('OK');
  
  // Process asynchronously
  processWebhookAsync(req.body).catch(err => {
    console.error('Failed to process webhook:', err);
  });
});
```

### 4. Handle Duplicates
The same event may be delivered multiple times (e.g., during retries). Use the `X-Webhook-Delivery-ID` header or `submission_id` to implement idempotency.

```javascript
const processedDeliveries = new Set();

function processWebhook(deliveryId, payload) {
  if (processedDeliveries.has(deliveryId)) {
    console.log('Duplicate delivery, skipping:', deliveryId);
    return;
  }
  
  processedDeliveries.add(deliveryId);
  // Process the webhook...
}
```

### 5. Monitor Your Endpoints
- Log all webhook deliveries
- Set up alerts for high failure rates
- Monitor response times

### 6. Test Webhooks
Use tools like [webhook.site](https://webhook.site) or [ngrok](https://ngrok.com) to test your webhook integration during development.

## Rate Limits

- **Create subscription:** 10 per hour
- **Regenerate secret:** 5 per hour
- **Get events (public):** 60 per minute
- Other endpoints: No specific limits (general API rate limits apply)

## Troubleshooting

### Webhooks Not Received

1. **Check subscription is active:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://clpr.tv/api/v1/webhooks
   ```

2. **Verify URL is accessible:**
   - Ensure your endpoint is publicly accessible
   - Not behind a firewall
   - HTTPS certificate is valid

3. **Check delivery history:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://clpr.tv/api/v1/webhooks/{id}/deliveries
   ```

### Signature Verification Fails

Common issues and solutions:

1. **Use raw request body** - Don't parse JSON before verification
   ```javascript
   // ❌ Wrong - JSON is already parsed
   const signature = computeHMAC(JSON.stringify(req.body));
   
   // ✅ Correct - Use raw body
   const signature = computeHMAC(rawRequestBody);
   ```

2. **Check encoding** - Secret is hex-encoded, result should be hex
   ```javascript
   // ✅ Correct hex encoding
   const signature = crypto.createHmac('sha256', secret)
     .update(rawBody)
     .digest('hex');  // Must be 'hex', not 'base64' or other
   ```

3. **Use constant-time comparison** - Prevents timing attacks
   ```javascript
   // ❌ Wrong - Vulnerable to timing attacks
   if (signature === computedSignature) { ... }
   
   // ✅ Correct - Constant-time comparison
   if (crypto.timingSafeEqual(
     Buffer.from(signature, 'hex'),
     Buffer.from(computedSignature, 'hex')
   )) { ... }
   ```

4. **Verify secret** - Ensure you're using the correct secret
   - Check that you saved the secret from the initial subscription creation
   - The secret is only shown once and cannot be retrieved later
   - If lost, regenerate the secret via `POST /api/v1/webhooks/{id}/regenerate-secret`

5. **Character encoding issues**
   - Ensure your webhook secret and body are both UTF-8 encoded
   - Some frameworks automatically decode request bodies - get raw bytes instead

6. **Header case sensitivity**
   - Header names are case-insensitive in HTTP
   - Check if your framework normalizes headers (e.g., `x-webhook-signature` vs `X-Webhook-Signature`)

**Debugging signature verification:**

```javascript
// Log all the values used in signature computation
console.log('Secret (first 8 chars):', secret.substring(0, 8) + '...');
console.log('Raw body length:', rawBody.length);
console.log('Raw body (first 100 chars):', rawBody.substring(0, 100));
console.log('Received signature:', signature);
console.log('Computed signature:', computedSignature);
console.log('Signatures match:', signature === computedSignature);
```

### High Failure Rate

Common causes and solutions:

1. **Check response times** - Endpoint must respond within 10 seconds
   - Use async processing to avoid blocking
   - Return 200 immediately, process in background
   - Monitor your endpoint's response times

2. **Return 2xx status** - Even if processing fails, acknowledge receipt
   ```javascript
   app.post('/webhook', async (req, res) => {
     try {
       if (!verifySignature(req)) {
         return res.status(401).send('Invalid signature');
       }
       
       // Acknowledge immediately
       res.status(200).send('OK');
       
       // Process asynchronously (errors won't affect webhook delivery)
       processWebhookAsync(req.body).catch(err => {
         console.error('Background processing failed:', err);
       });
     } catch (err) {
       // Still return 200 if signature was valid
       res.status(200).send('OK');
       console.error('Webhook processing error:', err);
     }
   });
   ```

3. **Process asynchronously** - Don't do heavy processing in request handler
   - Queue webhook for background processing
   - Use message queues (Redis, RabbitMQ, etc.)
   - Implement idempotency to handle duplicate deliveries

4. **Check logs** - Look for errors in your webhook handler
   - Enable detailed logging for webhook requests
   - Monitor for common errors (database timeouts, API failures, etc.)
   - Set up alerts for high failure rates

5. **Monitor your infrastructure**
   - Check server resources (CPU, memory, disk)
   - Verify database connection pool isn't exhausted
   - Ensure dependent services are healthy

6. **Test webhook resilience**
   - Simulate failures and verify recovery
   - Test with high volume of webhook deliveries
   - Verify retry logic handles transient failures

### Duplicate Webhook Deliveries

Webhooks may be delivered more than once due to retries. Implement idempotency:

```javascript
// Use delivery ID or event ID to track processed webhooks
const processedDeliveries = new Set(); // Or use database/cache

function processWebhook(deliveryId, payload) {
  // Check if already processed
  if (processedDeliveries.has(deliveryId)) {
    console.log('Duplicate delivery detected, skipping:', deliveryId);
    return;
  }
  
  // Mark as processed
  processedDeliveries.add(deliveryId);
  
  // Process the webhook...
  handleWebhookEvent(payload);
  
  // Clean up old entries periodically to prevent memory leak
  if (processedDeliveries.size > 10000) {
    // Remove oldest entries or use TTL-based cache
  }
}
```

Better approach using database:

```sql
-- Create idempotency table
CREATE TABLE webhook_deliveries_processed (
  delivery_id UUID PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(100),
  INDEX idx_processed_at (processed_at)
);

-- Check and mark as processed atomically
INSERT INTO webhook_deliveries_processed (delivery_id, event_type)
VALUES ($1, $2)
ON CONFLICT (delivery_id) DO NOTHING
RETURNING delivery_id;
```

### Testing Webhooks Locally

Use ngrok or similar tools to expose local endpoints:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Start your local server
npm start  # Starts on localhost:3000

# Expose with ngrok
ngrok http 3000

# Use the ngrok URL for your webhook subscription
# Example: https://abc123.ngrok.io/webhook
```

Alternatively, use webhook testing services:
- [webhook.site](https://webhook.site) - Inspect webhook payloads
- [RequestBin](https://requestbin.com) - Collect and inspect webhooks
- [Pipedream](https://pipedream.com) - Build workflows with webhooks

## Security Considerations

### 1. Always Verify Signatures

**Never skip signature verification**, even in development:

```javascript
// ❌ DANGEROUS - Never do this
if (process.env.NODE_ENV === 'development') {
  // Skip signature verification
  processWebhook(req.body);
  return;
}

// ✅ CORRECT - Always verify
if (!verifySignature(req)) {
  return res.status(401).send('Invalid signature');
}
processWebhook(req.body);
```

### 2. Protect Your Webhook Secret

- **Never commit secrets to version control**
  ```bash
  # .env
  WEBHOOK_SECRET=your-secret-here
  
  # .gitignore
  .env
  .env.local
  ```

- **Use environment variables or secret management**
  ```javascript
  // ✅ From environment
  const secret = process.env.WEBHOOK_SECRET;
  
  // ✅ From secret manager (AWS Secrets Manager, Vault, etc.)
  const secret = await secretsManager.getSecret('webhook-secret');
  
  // ❌ Hardcoded
  const secret = 'abc123...'; // NEVER DO THIS
  ```

- **Rotate secrets regularly**
  - Use the regenerate secret endpoint periodically
  - Implement zero-downtime secret rotation
  - Monitor for failed deliveries after rotation

### 3. Implement Rate Limiting

Protect your webhook endpoint from abuse:

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many webhook requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/webhook', webhookLimiter, handleWebhook);
```

### 4. Validate All Input Data

Even after signature verification, validate the payload:

```javascript
function validateWebhookPayload(payload) {
  // Validate event type
  const validEvents = ['clip.submitted', 'clip.approved', 'clip.rejected'];
  if (!validEvents.includes(payload.event)) {
    throw new Error('Invalid event type');
  }
  
  // Validate timestamp is recent (prevent replay attacks)
  const eventTime = new Date(payload.timestamp);
  const now = new Date();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  if (now - eventTime > maxAge) {
    throw new Error('Event timestamp too old');
  }
  
  // Validate required fields
  if (!payload.data || !payload.data.submission_id) {
    throw new Error('Missing required fields');
  }
  
  return true;
}
```

### 5. Use HTTPS Only

Always use HTTPS endpoints for webhooks:

```javascript
function validateWebhookURL(url) {
  const parsed = new URL(url);
  
  if (parsed.protocol !== 'https:') {
    throw new Error('Webhook URL must use HTTPS');
  }
  
  return true;
}
```

### 6. Implement Logging and Monitoring

Log all webhook activity for security auditing:

```javascript
function logWebhookEvent(deliveryId, eventType, status, error = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    delivery_id: deliveryId,
    event_type: eventType,
    status: status, // 'success', 'failed', 'invalid_signature'
    error: error,
    ip_address: req.ip,
  };
  
  logger.info('webhook_event', logEntry);
  
  // Send to monitoring system
  if (status === 'invalid_signature') {
    alerting.sendAlert('webhook_security_issue', logEntry);
  }
}
```

### 7. Implement Webhook Endpoint Monitoring

Monitor your webhook endpoint health:

```javascript
// Health check endpoint
app.get('/webhook/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Metrics endpoint
app.get('/webhook/metrics', (req, res) => {
  res.json({
    total_received: metrics.totalReceived,
    successful: metrics.successful,
    failed: metrics.failed,
    invalid_signatures: metrics.invalidSignatures,
    avg_processing_time_ms: metrics.avgProcessingTime,
  });
});
```

### 8. Prevent Replay Attacks

Use delivery ID and timestamp to prevent replay attacks:

```javascript
const recentDeliveries = new Map(); // Or use Redis for distributed systems

function isReplayAttempt(deliveryId, timestamp) {
  // Check if we've seen this delivery ID
  if (recentDeliveries.has(deliveryId)) {
    return true;
  }
  
  // Check if timestamp is too old (> 5 minutes)
  const eventTime = new Date(timestamp);
  const age = Date.now() - eventTime.getTime();
  if (age > 5 * 60 * 1000) {
    return true;
  }
  
  // Record this delivery
  recentDeliveries.set(deliveryId, Date.now());
  
  // Clean up old entries
  cleanupOldDeliveries();
  
  return false;
}
```

### 9. Handle Secrets Securely in Production

Use a proper secret management solution:

```javascript
// Example with AWS Secrets Manager
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getWebhookSecret() {
  const secret = await secretsManager.getSecretValue({
    SecretId: 'clipper/webhook-secret'
  }).promise();
  
  return JSON.parse(secret.SecretString).secret;
}

// Cache the secret with TTL
let cachedSecret = null;
let secretExpiry = 0;

async function getSecret() {
  if (cachedSecret && Date.now() < secretExpiry) {
    return cachedSecret;
  }
  
  cachedSecret = await getWebhookSecret();
  secretExpiry = Date.now() + (60 * 60 * 1000); // 1 hour cache
  
  return cachedSecret;
}
```

### 10. Security Checklist

Before going to production, verify:

- [ ] HTTPS is enforced for webhook URLs
- [ ] Signature verification is implemented correctly
- [ ] Constant-time comparison is used for signatures
- [ ] Webhook secrets are stored securely (not in code)
- [ ] Rate limiting is configured on webhook endpoint
- [ ] Input validation is performed on all webhook data
- [ ] Idempotency is implemented to handle duplicate deliveries
- [ ] Logging is enabled for all webhook events
- [ ] Alerts are configured for security events
- [ ] Monitoring is in place for webhook endpoint health
- [ ] Replay attack prevention is implemented
- [ ] Error handling doesn't leak sensitive information
- [ ] Webhook processing timeout is set appropriately
- [ ] Dead-letter queue or error handling for failed processing
- [ ] Documentation is provided for webhook consumers

## Support

For issues or questions:
- Check the [API documentation](https://docs.clpr.tv)
- Contact support at support@clpr.tv
- GitHub issues: https://github.com/subculture-collective/clipper/issues
