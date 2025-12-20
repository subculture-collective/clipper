# Webhook Integration Examples

This directory contains example implementations of webhook endpoints that verify signatures and handle Clipper webhook events.

## Examples

### Test Servers

- **[nodejs-express/](./nodejs-express/)** - Express.js server with signature verification
- **[python-flask/](./python-flask/)** - Flask server with signature verification
- **[go-stdlib/](./go-stdlib/)** - Go HTTP server with signature verification

### Test Data

- **[test-payloads/](./test-payloads/)** - Sample webhook payloads with pre-computed signatures

## Quick Start

Each example directory contains:
- Complete, runnable server implementation
- Installation/setup instructions
- Example `.env` file
- Instructions for testing

## Using the Examples

1. Choose your preferred language/framework
2. Navigate to that directory
3. Follow the README instructions to install and run
4. Configure your webhook subscription to point to your local server (use ngrok or similar for testing)
5. Test with real webhook deliveries or use the test payloads

## Documentation

For complete documentation on webhook signature verification, see:
- [Webhook Signature Verification Guide](../../docs/WEBHOOK_SIGNATURE_VERIFICATION.md)
- [Webhook Subscription Management](../../docs/WEBHOOK_SUBSCRIPTION_MANAGEMENT.md)

## Security Note

These examples are for testing and development purposes. For production use:
- Use HTTPS endpoints
- Store secrets securely (environment variables, secret managers)
- Implement proper error handling and logging
- Add rate limiting and request validation
- Use a process manager (PM2, systemd, etc.)
- Monitor and alert on failures
