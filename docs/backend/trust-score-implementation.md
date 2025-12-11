---
title: "Trust Score System Implementation"
summary: "This document describes the trust score system implementation for the Clipper platform. The trust sc"
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Trust Score System Implementation

## Overview

This document describes the trust score system implementation for the Clipper platform. The trust score is a metric (0-100) that reflects user trustworthiness based on various factors.

## Architecture

### Components

1. **Database Layer** (`migrations/000028_add_trust_score_fields.up.sql`)
   - `users.trust_score`: Current trust score (0-100)
   - `users.trust_score_updated_at`: Last update timestamp
   - `trust_score_history`: Audit trail of all score changes
   - `update_user_trust_score()`: Database function for atomic updates

2. **Repository Layer** (`internal/repository/reputation_repository.go`)
   - `CalculateTrustScore()`: Calculates score using database function
   - `CalculateTrustScoreBreakdown()`: Returns detailed component breakdown
   - `UpdateUserTrustScore()`: Updates score with audit logging
   - `GetTrustScoreHistory()`: Retrieves change history
   - `GetTrustScoreLeaderboard()`: Returns top users by trust score

3. **Service Layer** (`internal/services/trust_score_service.go`)
   - `CalculateScore()`: With Redis caching (1-hour TTL)
   - `CalculateScoreWithBreakdown()`: Detailed breakdown for admin view
   - `UpdateScore()`: Recalculates and persists new score
   - `UpdateScoreRealtime()`: Fast updates with 100ms timeout (graceful degradation)
   - `ManuallyAdjustScore()`: Admin manual adjustment
   - `BatchUpdateScores()`: Bulk recalculation
   - `WarmCache()`: Pre-loads scores into cache

4. **Handler Layer** (`internal/handlers/reputation_handler.go`)
   - `GET /admin/users/:id/trust-score/breakdown`: Score breakdown
   - `GET /admin/users/:id/trust-score/history`: Change history
   - `POST /admin/users/:id/trust-score/adjust`: Manual adjustment
   - `GET /leaderboard/trust-score`: Public leaderboard

## Trust Score Calculation

### Formula

```
TotalScore = min(100, AccountAgeScore + KarmaScore + ReportAccuracy + ActivityScore)

if IsBanned:
    TotalScore = TotalScore / 2
```

### Components

1. **Account Age Score** (max 20 points)
   - `min(AccountAgeDays / 18, 20)`
   - Rewards account longevity
   - Max score reached at ~360 days

2. **Karma Score** (max 40 points)
   - `min(KarmaPoints / 250, 40)`
   - Largest weight - reflects community approval
   - Max score reached at 10,000 karma

3. **Report Accuracy** (max 20 points)
   - `(CorrectReports / TotalReports) * 20`
   - Rewards accurate content reporting
   - Only calculated if user has submitted reports

4. **Activity Score** (max 20 points)
   - `min((Comments/10 + Votes/100 + DaysActive/5), 20)`
   - Rewards consistent engagement
   - Balanced across different activity types

5. **Ban Penalty**
   - Halves the total score if user is banned
   - Applied after component calculation

## Caching Strategy

### Cache Keys
- Format: `trust_score:{user_id}`
- TTL: 1 hour
- Invalidation: On score updates

### Cache Hit Rate Target
- Target: >95%
- Monitoring: Track via cache service metrics
- Warm-up: Pre-load active user scores on startup

## Performance Targets

### Calculation Performance
- Target: <100ms per user
- Optimized via:
  - Database function (single query)
  - Indexed columns (account age, karma, stats)
  - Redis caching

### Batch Job Performance
- Target: Complete within 30 minutes for all users
- Parallelization: 20 concurrent workers
- Graceful failure: Continues on individual user errors

## Real-time Updates

### Triggering Events

1. **Submission Approved** → Increase trust score
2. **Submission Rejected** → Small decrease
3. **Report Actioned** → Increase (correct report)
4. **Report Dismissed** → Decrease (incorrect report)
5. **User Banned** → Halve score immediately
6. **User Unbanned** → Recalculate normally

### Implementation Pattern

```go
// In submission service after approval
if trustScoreService != nil {
    _ = trustScoreService.UpdateScoreRealtime(
        ctx, 
        submission.UserID, 
        models.TrustScoreReasonSubmissionApproved,
    )
}
```

### Graceful Degradation
- Real-time updates have 100ms timeout
- Errors are logged but don't block operations
- Score will be corrected on next scheduled run

## Scheduled Recalculation

### Daily Job
- Runs via `ReputationScheduler`
- Updates all user scores
- Runs during low-traffic hours
- Uses 20 concurrent workers
- Logs: badges awarded, stats updated, errors

### Integration
```go
// In reputation service UpdateUserStats
err = reputationRepo.UpdateUserTrustScore(
    ctx, 
    userID, 
    breakdown.TotalScore, 
    models.TrustScoreReasonScheduledRecalc,
    componentScores,
    nil, // No admin for scheduled updates
    nil, // No notes
)
```

## Admin Features

### Score Breakdown View
Shows detailed component scores for debugging:
- Current total score
- Each component score with raw data
- Historical trend
- Recent changes

### Manual Adjustment
Allows admins to override score:
- Validation: 0-100 range
- Requires reason and notes
- Fully audited with admin ID
- Invalidates cache immediately

### Audit Trail
All score changes tracked with:
- Old and new scores
- Change reason
- Component scores (if calculated)
- Admin ID (if manual)
- Notes (if manual)
- Timestamp

## Testing

### Unit Tests
- Service layer: Mock dependencies
- Repository layer: Structure validation
- Coverage: All public methods

### Integration Tests
- Database migration verification
- End-to-end score calculation
- Cache integration
- Real data scenarios

### Performance Tests
- Single calculation: <100ms
- Batch 10,000 users: <30 minutes
- Cache hit rate: >95%

## Monitoring

### Metrics to Track
1. Average calculation time
2. Cache hit rate
3. Batch job completion time
4. Failed calculations count
5. Manual adjustments count

### Alerts
- Calculation time >150ms
- Cache hit rate <90%
- Batch job fails
- High failure rate (>5%)

## Migration Guide

### Database Migration
```bash
# Apply migration
migrate -path backend/migrations \
  -database "postgresql://user:pass@localhost:5432/clipper?sslmode=disable" \
  up

# Verify
psql -c "SELECT trust_score, trust_score_updated_at FROM users LIMIT 5;"
```

### Backwards Compatibility
- New columns are nullable initially
- Migration populates existing users
- Old code continues to work
- Gradual rollout recommended

## Future Enhancements

### Potential Improvements
1. Machine learning-based score adjustment
2. Decay for inactive accounts
3. Bonus for consistency over time
4. Peer review weighting
5. Category-specific trust scores

### API Enhancements
1. User-facing score explanation
2. Score prediction for actions
3. Comparative analytics
4. Gamification features

## Troubleshooting

### Score Not Updating
1. Check cache expiration
2. Verify scheduler is running
3. Check audit log for errors
4. Manually trigger recalculation

### Performance Issues
1. Check database indexes
2. Monitor cache hit rate
3. Review batch job parallelization
4. Optimize calculation queries

### Incorrect Scores
1. Review component calculations
2. Check source data (karma, reports, etc.)
3. Verify database function logic
4. Check for banned user penalty
