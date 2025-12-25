# OpenAPI Specifications

This directory contains OpenAPI 3.0 specifications for the Clipper API.

## Available Specifications

### Clip Submission API

- **File**: [`clip-submission-api.yaml`](./clip-submission-api.yaml)
- **Description**: API for submitting Twitch clips to the platform
- **Version**: 1.0.0
- **Endpoints**:
  - `GET /api/v1/submissions/metadata` - Fetch clip metadata from Twitch
  - `POST /api/v1/submissions` - Submit a clip for review
  - `GET /api/v1/submissions` - List user's submissions
  - `GET /api/v1/submissions/stats` - Get submission statistics

### Comments API

- **File**: [`comments-api.yaml`](./comments-api.yaml)
- **Description**: API for managing comments on clips with nested threading support
- **Version**: 1.0.0
- **Endpoints**:
  - `GET /api/v1/clips/{clipId}/comments` - List comments for a clip (with optional nested replies)
  - `POST /api/v1/clips/{clipId}/comments` - Create a comment on a clip
  - `GET /api/v1/comments/{commentId}/replies` - Get direct replies to a comment
- **Features**:
  - Flat list or nested tree structure (up to 10 levels deep)
  - Vote scores and user vote status
  - Reply counts
  - Markdown rendering
  - Author information
  - Moderation fields (is_removed, removed_reason)

## Viewing the Specifications

### Online Viewers

You can view and interact with these specifications using:

1. **Swagger Editor**: <https://editor.swagger.io/>
   - Copy and paste the YAML content into the editor

2. **Redoc**: Generate a beautiful HTML documentation
   ```bash
   npx @redocly/cli build-docs docs/openapi/clip-submission-api.yaml
   ```

3. **Swagger UI**: Run a local Swagger UI server
   ```bash
   docker run -p 8081:8080 -e SWAGGER_JSON=/api/clip-submission-api.yaml -v $(pwd)/docs/openapi:/api swaggerapi/swagger-ui
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
  -i docs/openapi/clip-submission-api.yaml \
  -g typescript-axios \
  -o generated/typescript-client
```

### Python

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi/clip-submission-api.yaml \
  -g python \
  -o generated/python-client
```

### Go

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi/clip-submission-api.yaml \
  -g go \
  -o generated/go-client
```

### Other Languages

OpenAPI Generator supports 50+ languages and frameworks. See the [full list of generators](https://openapi-generator.tech/docs/generators).

## Validating Specifications

Validate the OpenAPI specifications using:

```bash
# Using Redocly CLI
npx @redocly/cli lint docs/openapi/clip-submission-api.yaml

# Using Swagger CLI
npx swagger-cli validate docs/openapi/clip-submission-api.yaml
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
