# 🚀 Quick Deploy: Metadata Endpoint

**For the agent deploying to VPS via SSH**

---

## ⚠️ CRITICAL: Before You Deploy

### Required Environment Variables (Must Have!)

```bash
# Add these to /opt/clipper/.env or your environment
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
```

**Without these, the endpoint WILL NOT WORK.**

Get them at: https://dev.twitch.tv/console/apps

---

## 📋 Deployment Checklist (30 seconds)

```bash
# 1. Verify Twitch credentials are set
echo $TWITCH_CLIENT_ID
echo $TWITCH_CLIENT_SECRET

# 2. Verify Redis is running (for caching)
redis-cli ping  # Should return: PONG

# 3. Pull latest code
cd /opt/clipper
git pull origin main

# 4. Rebuild backend
cd backend
go build -o bin/api ./cmd/api

# 5. Restart service
systemctl restart clipper-backend
# OR with Docker:
docker-compose restart backend

# 6. Health check
curl http://localhost:8080/health
```

---

## ✅ Smoke Test (Must Pass!)

```bash
# Get a JWT token for a test user first, then:

curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:8080/api/v1/submissions/metadata?url=https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"

# Expected: JSON response with clip metadata
# {
#   "success": true,
#   "data": {
#     "clip_id": "AwkwardHelplessSalamanderSwiftRage",
#     "title": "...",
#     ...
#   }
# }
```

If you get **502 Bad Gateway** → Twitch credentials missing/invalid
If you get **401 Unauthorized** → Good! Auth is working (need valid JWT)
If you get **200 OK** → ✅ SUCCESS!

---

## 🔍 Quick Troubleshooting

### Problem: 502 errors on all requests

**Fix**: Check Twitch credentials

```bash
docker-compose exec backend env | grep TWITCH
# Update .env if missing, then restart
docker-compose restart backend
```

### Problem: Slow responses (> 1 second)

**Fix**: Check Redis

```bash
redis-cli ping
docker-compose ps redis
# If down, restart it
docker-compose restart redis
```

### Problem: Works but no caching

**Check Redis cache**:

```bash
redis-cli
> KEYS twitch:clip:metadata:*
> TTL twitch:clip:metadata:SomeClipID
# Should show ~3600 seconds
```

---

## 📊 What This Endpoint Does

- **Route**: `GET /api/v1/submissions/metadata?url={clipUrl}`
- **Auth**: Required (JWT token)
- **Rate Limit**: 100 requests/hour per user
- **Caching**: 1 hour in Redis
- **Purpose**: Fetch Twitch clip metadata for submission flow

---

## 📖 Full Documentation

**Detailed deployment guide**: `/docs/PRODUCTION_DEPLOYMENT_METADATA_ENDPOINT.md`
**API documentation**: `/docs/API.md` (search for "metadata")
**Implementation issue**: #427 (closed)

---

## ✨ Success Criteria

- [ ] Endpoint returns 200 for valid clips
- [ ] Endpoint returns 401 without auth
- [ ] Endpoint returns 400 for invalid URLs
- [ ] Response time < 500ms (p95)
- [ ] Redis shows cached clips
- [ ] No errors in logs

---

## 🆘 Rollback (If Needed)

```bash
cd /opt/clipper
git checkout <previous_commit>
cd backend
go build -o bin/api ./cmd/api
systemctl restart clipper-backend
```

**Impact**: Endpoint will 404, frontend/mobile can handle gracefully

---

**Deploy Status**: ✅ READY
**Risk**: Low (additive only, no schema changes)
**Estimated Time**: 2 minutes
**Downtime**: 0 minutes (rolling restart)

---

_For detailed instructions, see: `/docs/PRODUCTION_DEPLOYMENT_METADATA_ENDPOINT.md`_
