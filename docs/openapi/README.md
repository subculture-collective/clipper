---
title: "README"
summary: "This directory contains OpenAPI 3.1 specifications for the Clipper API."
tags: ["openapi"]
area: "openapi"
status: "stable"
owner: "team-core"
version: "2.0"
last_reviewed: 2026-01-29
---

# OpenAPI Specifications

This directory contains OpenAPI 3.1 specifications for the Clipper API.

## Available Specifications

### Complete API Specification (NEW)

- **File**: [`openapi.yaml`](./openapi.yaml)
- **Description**: **Complete OpenAPI 3.1 specification documenting all 474 API endpoints**
- **Version**: 1.0.0
- **Coverage**: 
  - Health & Monitoring (10 endpoints)
  - Authentication & MFA (15 endpoints)
  - Clips & Content (25+ endpoints)
  - Comments & Engagement (10 endpoints)
  - Tags & Search (15 endpoints)
  - Submissions & Reports (10 endpoints)
  - Moderation & Appeals (20+ endpoints)
  - Users & Profiles (40+ endpoints)
  - Creators & Analytics (9 endpoints)
  - Broadcasters & Live (6 endpoints)
  - Categories & Games
  - Streams & Twitch Integration
  - Discovery Lists & Leaderboards
  - Feeds & Recommendations
  - Notifications
  - Verification & Subscriptions
  - Webhooks & Integrations
  - Chat & WebSocket
  - Ads & Campaigns
  - Communities & Forums
  - Playlists & Queue
  - Watch History & Parties
  - Service Status
  - Admin Operations (100+ endpoints)
- **Features**:
  - Complete request/response schemas
  - Authentication patterns
  - Rate limiting documentation
  - Error responses
  - Pagination support
  - WebSocket endpoints
  - Comprehensive component schemas

### Legacy Specifications (DEPRECATED - use openapi.yaml)

### Clip Submission API (DEPRECATED)

- **File**: [`clip-submission-api.yaml`](./clip-submission-api.yaml)
- **Description**: Partial API spec for submitting Twitch clips
- **Status**: Deprecated - Superseded by openapi.yaml
- **Version**: 1.0.0

### Comments API (DEPRECATED)

- **File**: [`comments-api.yaml`](./comments-api.yaml)
- **Description**: Partial API spec for managing comments on clips
- **Status**: Deprecated - Superseded by openapi.yaml
- **Version**: 1.0.0

## Viewing the Specifications

### Online Viewers

You can view and interact with the complete API specification using:

1. **Swagger Editor**: <https://editor.swagger.io/>
   - Copy and paste the YAML content from `openapi.yaml` into the editor

2. **Redoc**: Generate beautiful HTML documentation
   ```bash
   npx @redocly/cli build-docs docs/openapi/openapi.yaml
   ```

3. **Swagger UI**: Run a local Swagger UI server
   ```bash
   docker run -p 8081:8080 -e SWAGGER_JSON=/api/openapi.yaml -v $(pwd)/docs/openapi:/api swaggerapi/swagger-ui
   ```
   Then visit <http://localhost:8081>

### VS Code Extension

Install the [OpenAPI (Swagger) Editor](https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi) extension for VS Code to get:
- Syntax highlighting
- Validation
- Auto-completion
- Live preview

## Generating Client SDKs

You can generate client libraries in various languages using [OpenAPI Generator](https://openapi-generator.tech/):

### TypeScript/JavaScript

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi/openapi.yaml \
  -g typescript-axios \
  -o generated/typescript-client
```

### Python

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi/openapi.yaml \
  -g python \
  -o generated/python-client
```

### Go

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi/openapi.yaml \
  -g go \
  -o generated/go-client
```

### Other Languages

OpenAPI Generator supports 50+ languages and frameworks. See the [full list of generators](https://openapi-generator.tech/docs/generators).

## Validating Specifications

Validate the OpenAPI specification using:

```bash
# Using Redocly CLI (recommended)
npx @redocly/cli lint docs/openapi/openapi.yaml

# Using Python
python3 -c "import yaml; yaml.safe_load(open('docs/openapi/openapi.yaml'))"
```

## Testing the API

### Using the Swagger UI

1. Run Swagger UI (see instructions above)
2. Click "Authorize" and enter your JWT token
3. Try out the endpoints directly from the UI

### Using Postman

1. Import the OpenAPI specification into Postman
2. Postman will automatically create a collection with all endpoints
3. Set up authentication in the collection variables

### Using cURL

See the [Clip Submission API Guide](../CLIP_SUBMISSION_API_GUIDE.md) for comprehensive cURL examples.

## Contributing

When adding or modifying API endpoints:

1. Update the corresponding OpenAPI specification
2. Validate the specification
3. Update the developer guide with examples
4. Test all endpoints
5. Submit a pull request

## Related Documentation

- [Clip Submission API Guide](../CLIP_SUBMISSION_API_GUIDE.md) - Complete developer guide with examples
- [API Reference](../API.md) - Main API documentation
- [User Submission Implementation](../USER_SUBMISSION_IMPLEMENTATION.md) - Technical implementation details
