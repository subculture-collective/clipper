# 🎯 VPS Deployment Ready - Metadata Endpoint

**Agent deploying to VPS: START HERE** 👇

---

## 📦 What You're Deploying

A new backend API endpoint that fetches Twitch clip metadata in real-time:

- **Endpoint**: `GET /api/v1/submissions/metadata?url={clipUrl}`
- **Purpose**: Replace mock data in mobile/frontend submit flows
- **Status**: ✅ Fully tested, production-ready

---

## ⚡ Quick Start (3 Minutes)

### Step 1: Set Twitch Credentials (REQUIRED)

```bash
# Add to /opt/clipper/.env (or your environment file)
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
```

**Get these at**: <https://dev.twitch.tv/console/apps>

⚠️ **The endpoint WILL NOT WORK without these credentials!**

### Step 2: Verify Prerequisites

```bash
# Redis should be running (for caching)
redis-cli ping  # Should return: PONG

# PostgreSQL should be running
psql -U clipper -d clipper_db -c "SELECT 1"  # Should return: 1
```

### Step 3: Deploy

```bash
# Pull latest code
cd /opt/clipper
git pull origin main

# Rebuild backend
cd backend
go build -o bin/api ./cmd/api

# Restart service
systemctl restart clipper-backend
# OR with Docker:
docker-compose restart backend
```

### Step 4: Verify Deployment

```bash
# Health check
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# Test metadata endpoint (need valid JWT token)
curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  "http://localhost:8080/api/v1/submissions/metadata?url=https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"

# Expected: JSON with clip metadata
# {
#   "success": true,
#   "data": {
#     "clip_id": "AwkwardHelplessSalamanderSwiftRage",
#     "title": "...",
#     "streamer_name": "...",
#     ...
#   }
# }
```

---

## 📚 Documentation Available

| Document                                     | When to Use                                |
| -------------------------------------------- | ------------------------------------------ |
| **This file**                                | Quick deployment (you are here)            |
| `QUICK_DEPLOY_METADATA.md`                   | Fast reference card                        |
| `PRODUCTION_DEPLOYMENT_METADATA_ENDPOINT.md` | Full deployment guide with troubleshooting |
| `PRODUCTION_READINESS_METADATA.md`           | Complete readiness summary                 |

All in `/docs` directory.

---

## 🔍 Troubleshooting

### Problem: 502 Bad Gateway

**Cause**: Twitch credentials missing/invalid
**Fix**:

```bash
# Check credentials
docker-compose exec backend env | grep TWITCH
# Update .env and restart
vim /opt/clipper/.env
docker-compose restart backend
```

### Problem: Slow responses (>1s)

**Cause**: Redis not running
**Fix**:

```bash
redis-cli ping
docker-compose restart redis
```

### Problem: 401 Unauthorized

**This is normal!** Endpoint requires authentication.
Use a valid JWT token in the Authorization header.

---

## ✅ Success Criteria

After deployment, verify these all pass:

- [ ] Health check returns 200 OK
- [ ] Metadata endpoint returns 200 for valid clip (with auth)
- [ ] Endpoint returns 401 without auth token
- [ ] Endpoint returns 400 for invalid URLs
- [ ] Response time < 500ms
- [ ] Redis shows cached clips: `redis-cli KEYS twitch:clip:metadata:*`
- [ ] No errors in logs: `docker-compose logs backend --tail=100`

---

## 🚨 If Something Goes Wrong

### Quick Rollback (1 minute)

```bash
cd /opt/clipper
git checkout HEAD~1
cd backend && go build -o bin/api ./cmd/api
systemctl restart clipper-backend
```

**Impact**: Endpoint will 404, frontend/mobile can handle gracefully

---

## 📊 What to Monitor

For the first hour after deployment:

```bash
# Watch logs for errors
docker-compose logs -f backend | grep -i "error\|metadata"

# Check endpoint performance
curl -w "\nTime: %{time_total}s\n" \
  -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8080/api/v1/submissions/metadata?url=https://clips.twitch.tv/TestID"

# Verify caching is working
redis-cli
> KEYS twitch:clip:metadata:*
> TTL twitch:clip:metadata:SomeClipID
# Should show ~3600 seconds for cached clips
```

---

## 🎓 Technical Details (If Interested)

### What This Endpoint Does:

1. Accepts Twitch clip URL or ID
2. Normalizes URL to extract clip ID
3. Checks Redis cache first (1-hour TTL)
4. If cache miss, calls Twitch API
5. Resolves game name from game ID
6. Caches result in Redis
7. Returns metadata JSON

### Performance:

- **Cache hit**: <10ms
- **Cache miss**: 200-500ms (Twitch API call)
- **Rate limit**: 100 requests/hour per user

### Security:

- JWT authentication required
- Rate limiting enforced
- Input validation
- Sanitized error messages

---

## 📝 Implementation Details

**Code Locations**:

- Route: `backend/cmd/api/main.go:535`
- Handler: `backend/internal/handlers/submission_handler.go:155`
- Service: `backend/internal/services/submission_service.go:371`

**Tests**:

- Unit: `backend/internal/services/submission_metadata_test.go` (7 suites ✅)
- Integration: `backend/tests/integration/submission_metadata_integration_test.go` (6 scenarios ✅)

**Issue**: #427 (closed with full summary)

---

## 🎯 Next Steps After Deployment

1. **Notify Frontend/Mobile Teams**: Endpoint is live, they can integrate
2. **Monitor for 24 hours**: Track error rates and performance
3. **Check cache effectiveness**: Should see >80% hit rate after warmup
4. **Review Twitch API usage**: Ensure we're within quota

---

## ❓ Questions?

- **Detailed guide**: See `PRODUCTION_DEPLOYMENT_METADATA_ENDPOINT.md`
- **API docs**: See `docs/API.md` (search for "metadata")
- **Issue reference**: GitHub #427
- **Logs**: `docker-compose logs -f backend`

---

**Deploy Confidence**: 🟢 HIGH
**Risk Level**: 🟢 LOW
**Rollback Difficulty**: 🟢 EASY
**Ready**: ✅ YES

---

_Prepared for VPS deployment on 2025-11-26_
_All tests passing, documentation complete, ready to ship! 🚀_
