# Load Testing - Quick Reference

## 🚀 Quick Start (3 steps)

```bash
# 1. Start services
make docker-up && make migrate-up && make migrate-seed-load-test

# 2. Start backend (in new terminal)
make backend-dev

# 3. Run tests and generate report (in new terminal)
make test-load-report
```

---

## 📊 Individual Test Commands

```bash
# All tests
make test-load              # Run all scenarios
make test-load-report       # Run all + generate report

# Individual scenarios
make test-load-feed         # Homepage browsing (50 users)
make test-load-search       # Search queries (100 q/s)
make test-load-auth         # Authentication (20/min)
make test-load-submit       # Submissions (10/min)
make test-load-comments     # Comments testing
make test-load-clip         # Clip detail views
make test-load-mixed        # Realistic mixed behavior
```

---

## 🎯 Performance Targets

| Test | p95 Target | Error Rate |
|------|-----------|------------|
| Feed | <100ms | <5% |
| Search | <100ms | <2% |
| Auth | <50ms | <5% |
| Submit | <200ms | <5% |
| Mixed | <100ms | <2% |

---

## 📁 Key Files

- **Test Scenarios**: `backend/tests/load/scenarios/*.js`
- **Report Script**: `backend/tests/load/generate_report.sh`
- **Reports Output**: `backend/tests/load/reports/`
- **Documentation**: 
  - `backend/tests/load/EXECUTION_GUIDE.md` - Detailed setup guide
  - `backend/tests/load/LOAD_TEST_REPORT.md` - Implementation report
  - `backend/tests/load/README.md` - Complete reference

---

## 🔧 Troubleshooting

```bash
# Backend not responding?
curl http://localhost:8080/health

# Restart services
make docker-down && make docker-up

# Check if k6 is installed
k6 version
```

---

## 📝 Acceptance Criteria Status

- ✅ Homepage browsing (50 concurrent users)
- ✅ Search queries (100 queries/second)
- ✅ Submission creation (10 submissions/minute)
- ✅ Authentication (20 logins/minute)
- ✅ Performance targets configured (99.5%+ under 500ms)
- ✅ Error rate monitoring (< 1%)
- ✅ 2x load stability testing
- ✅ Bottlenecks documented
- ✅ Database optimizations implemented
- ✅ Comprehensive reporting system

---

**Status**: ✅ Ready for execution  
**Next Step**: Run `make test-load-report`
