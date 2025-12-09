# Trust Score Algorithm

## Executive Summary

The Trust Score is a 0-100 metric that measures user trustworthiness and positive community contribution in Clipper. It combines multiple factors to create a comprehensive assessment of user reliability, helping moderators and the community identify trusted contributors while deterring abuse.

**Key Components:**
- Account Age & Verification (20%)
- Content Quality via Karma (40%)
- Community Participation (20%)
- Report Accuracy (20%)
- Negative Signals (Ban penalty: -50%)

**Purpose:**
- Content filtering (hide low-trust spam)
- Moderation prioritization (trust high-quality reports)
- Feature access gating
- Community reputation visibility

## Trust Score Formula

The trust score is calculated using the following weighted formula:

```
Trust Score = MIN(100, MAX(0, 
  Account_Age_Score (max 20) +
  Karma_Score (max 40) +
  Activity_Score (max 20) +
  Report_Accuracy_Score (max 20)
)) × Ban_Penalty_Multiplier
```

Where:
- All components add up to a maximum of 100 points
- Banned users have their score halved (0.5 multiplier)
- Final score is clamped between 0 and 100

## Score Components

### 1. Account Age & Verification (20% - Max 20 Points)

**Weight:** 20% of total score  
**Rationale:** Older accounts are less likely to be spam/abuse accounts

**Calculation:**
```
Account_Age_Score = MIN(account_age_in_days / 18, 20)
```

**Breakdown:**
- 1 day old = 0.06 points
- 30 days (1 month) = 1.67 points
- 90 days (3 months) = 5 points
- 180 days (6 months) = 10 points
- 360 days (1 year) = 20 points (maximum)

**Email Verification:**
Currently, email verification is tracked but not directly weighted in the trust score. All accounts require Twitch OAuth, providing baseline verification.

**Thresholds:**
- New Account (0-30 days): 0-2 points
- Established (31-180 days): 2-10 points
- Mature (181+ days): 10-20 points

### 2. Content Quality via Karma (40% - Max 40 Points)

**Weight:** 40% of total score  
**Rationale:** Karma reflects community approval of user contributions

**Calculation:**
```
Karma_Score = MIN(karma_points / 250, 40)
```

**Breakdown:**
- 0 karma = 0 points
- 250 karma = 1 point
- 2,500 karma = 10 points
- 5,000 karma = 20 points
- 10,000 karma = 40 points (maximum)

**How Users Earn Karma:**
- +1: Clip submission receives an upvote
- +1: Comment receives an upvote
- -1: Clip submission receives a downvote
- -1: Comment receives a downvote

**Karma Impact on Trust:**
Karma is the largest component because it represents direct community validation of user contributions. High karma indicates consistent positive participation.

**Note:** Karma can go negative, which results in 0 points for this component.

### 3. Community Participation (20% - Max 20 Points)

**Weight:** 20% of total score  
**Rationale:** Active, engaged users are more invested in the community

**Calculation:**
```
Activity_Score = MIN(
  (total_comments / 10) +
  (total_votes_cast / 100) +
  (days_active / 5),
  20
)
```

**Activity Metrics:**
- **Comments:** 0.1 points per comment (100 comments = 10 points)
- **Votes:** 0.01 points per vote (1,000 votes = 10 points)
- **Days Active:** 0.2 points per day (100 days active = 20 points)

**Days Active:** Counts unique calendar days with any activity (commenting, voting, or submitting)

**Example:**
- User posts 50 comments = 5 points
- User casts 500 votes = 5 points
- User active 45 days = 9 points
- **Total Activity Score:** 19 points (below cap)

### 4. Report Accuracy (20% - Max 20 Points)

**Weight:** 20% of total score  
**Rationale:** Users who make accurate reports help maintain community quality

**Calculation:**
```
IF (correct_reports + incorrect_reports) > 0 THEN
  Report_Accuracy_Score = 20 × (correct_reports / (correct_reports + incorrect_reports))
ELSE
  Report_Accuracy_Score = 0
END IF
```

**Breakdown:**
- No reports filed = 0 points
- 100% accurate reports = 20 points
- 75% accurate reports = 15 points
- 50% accurate reports = 10 points
- 25% accurate reports = 5 points
- 0% accurate reports = 0 points

**Report Categorization:**
- **Correct Report:** Moderator takes action on reported content
- **Incorrect Report:** Moderator dismisses report as invalid

**Example:**
- User files 10 reports, 8 are actioned by moderators, 2 are dismissed
- Accuracy = 8 / 10 = 80%
- Score = 20 × 0.80 = 16 points

**Note:** Users need at least 1 report filed to earn points in this category.

### 5. Negative Signals - Ban Penalty (50% Reduction)

**Impact:** Halves the entire trust score  
**Rationale:** Banned users have violated community guidelines

**Calculation:**
```
IF user.is_banned = true THEN
  Final_Trust_Score = Trust_Score × 0.5
END IF
```

**Ban Types and Recovery:**

#### Temporary Ban
- **Duration:** 24 hours to 30 days
- **Trust Impact:** Score halved during ban period
- **Recovery:** Full score restored immediately upon ban expiration
- **Example:** User with 80 trust score → 40 during ban → 80 after ban ends

#### Permanent Ban
- **Duration:** Indefinite
- **Trust Impact:** Score permanently halved
- **Recovery:** Only through successful appeal and ban reversal
- **Example:** User with 60 trust score → 30 permanently

#### Shadow Ban (Under Development)
- **Duration:** Variable
- **Trust Impact:** Score may be affected without user notification
- **Recovery:** Based on improved behavior patterns

**Other Negative Signals (Future):**
These are tracked but not yet implemented in the score:
- Suspended status (temporary restriction)
- Content removal count
- Warning count
- Policy violation history

## Trust Score Ranges & Meaning

| Score Range | Trust Level | Description | Typical User Profile |
|-------------|-------------|-------------|----------------------|
| 90-100 | Exceptional | Highly trusted community leader | 1+ year account, 10,000+ karma, active participation, accurate reports |
| 75-89 | High | Very trusted contributor | 6+ months, 5,000+ karma, regular activity, good report history |
| 60-74 | Good | Trusted community member | 3+ months, 1,000+ karma, moderate activity |
| 40-59 | Medium | Average user, building trust | 1-3 months, 100-1,000 karma, some activity |
| 20-39 | Low | New or inactive user | <1 month, <100 karma, minimal activity |
| 0-19 | Very Low | New account or flagged user | Brand new account or user with guideline violations |

## Score Calculation Examples

### Example 1: New User (Score: 12)

**Profile:**
- Account age: 15 days
- Karma: 50 points
- Activity: 10 comments, 20 votes, 5 days active
- Reports: None filed
- Status: Not banned

**Calculation:**
```
Account Age: MIN(15 / 18, 20) = 0.83 points
Karma: MIN(50 / 250, 40) = 0.20 points
Activity: MIN((10/10) + (20/100) + (5/5), 20) = MIN(2.2, 20) = 2.2 points
Report Accuracy: 0 points (no reports)
Ban Penalty: ×1 (not banned)

Trust Score = (0.83 + 0.20 + 2.2 + 0) × 1 = 3.23 ≈ 3 points
```

**Trust Score: 3 points** (Very Low - New User)

### Example 2: Active Community Member (Score: 68)

**Profile:**
- Account age: 180 days (6 months)
- Karma: 2,500 points
- Activity: 150 comments, 800 votes, 90 days active
- Reports: 15 filed, 12 correct, 3 incorrect
- Status: Not banned

**Calculation:**
```
Account Age: MIN(180 / 18, 20) = 10 points
Karma: MIN(2500 / 250, 40) = 10 points
Activity: MIN((150/10) + (800/100) + (90/5), 20) = MIN(33, 20) = 20 points (capped)
Report Accuracy: 20 × (12 / 15) = 20 × 0.80 = 16 points
Ban Penalty: ×1 (not banned)

Trust Score = (10 + 10 + 20 + 16) × 1 = 56 points
```

**Trust Score: 56 points** (Medium - Trusted Member)

### Example 3: Veteran Contributor (Score: 95)

**Profile:**
- Account age: 450 days (15 months)
- Karma: 12,000 points
- Activity: 500 comments, 3,000 votes, 200 days active
- Reports: 50 filed, 48 correct, 2 incorrect
- Status: Not banned

**Calculation:**
```
Account Age: MIN(450 / 18, 20) = 20 points (capped)
Karma: MIN(12000 / 250, 40) = 40 points (capped)
Activity: MIN((500/10) + (3000/100) + (200/5), 20) = MIN(120, 20) = 20 points (capped)
Report Accuracy: 20 × (48 / 50) = 20 × 0.96 = 19.2 points
Ban Penalty: ×1 (not banned)

Trust Score = (20 + 40 + 20 + 19.2) × 1 = 99.2 ≈ 99 points
```

**Trust Score: 99 points** (Exceptional - Community Leader)

### Example 4: Previously Banned User (Score: 30)

**Profile:**
- Account age: 200 days
- Karma: 3,000 points
- Activity: 200 comments, 1,000 votes, 100 days active
- Reports: 20 filed, 16 correct, 4 incorrect
- Status: **Currently banned** (temporary)

**Calculation Before Ban Penalty:**
```
Account Age: MIN(200 / 18, 20) = 11.1 points
Karma: MIN(3000 / 250, 40) = 12 points
Activity: MIN((200/10) + (1000/100) + (100/5), 20) = MIN(50, 20) = 20 points (capped)
Report Accuracy: 20 × (16 / 20) = 20 × 0.80 = 16 points
Subtotal: 11.1 + 12 + 20 + 16 = 59.1 points

Ban Penalty: ×0.5 (banned)
Trust Score = 59.1 × 0.5 = 29.55 ≈ 30 points
```

**Trust Score: 30 points** (Low - Recovering from Ban)

**After Ban Expires:** Score returns to ~59 points

### Example 5: Inactive Lurker (Score: 15)

**Profile:**
- Account age: 365 days (1 year)
- Karma: 5 points
- Activity: 5 comments, 200 votes, 30 days active
- Reports: None filed
- Status: Not banned

**Calculation:**
```
Account Age: MIN(365 / 18, 20) = 20 points (capped)
Karma: MIN(5 / 250, 40) = 0.02 points
Activity: MIN((5/10) + (200/100) + (30/5), 20) = MIN(8.5, 20) = 8.5 points
Report Accuracy: 0 points (no reports)
Ban Penalty: ×1 (not banned)

Trust Score = (20 + 0.02 + 8.5 + 0) × 1 = 28.52 ≈ 29 points
```

**Trust Score: 29 points** (Low - Lurker with Old Account)

## Use Cases for Trust Scores

### Content Filtering
- **High Trust (75+):** Content auto-approved, minimal review
- **Medium Trust (40-74):** Standard moderation queue
- **Low Trust (0-39):** Enhanced review, may require manual approval

### Moderation Weight
- **High Trust (75+):** Reports prioritized, user may receive early mod tools
- **Medium Trust (40-74):** Standard report handling
- **Low Trust (0-39):** Reports require additional verification

### Feature Access
Some features may require minimum trust scores:
- **Trust 20+:** Submit clips without approval
- **Trust 40+:** Create custom tags
- **Trust 60+:** Nominate featured clips
- **Trust 75+:** Access to beta features

### Spam Detection
- Trust scores below 20 combined with rapid posting trigger spam filters
- New accounts (<30 days) with trust <10 have rate limits

## Recovery from Low Trust

### Temporary Ban Recovery
1. **During Ban:** Trust score is halved
2. **Ban Expires:** Score immediately restored to pre-ban level
3. **Long-term:** Continue positive contributions to improve underlying metrics

### Building Trust After Violations
1. **Post Quality Content:** Focus on submitting clips that get upvotes
2. **Engage Positively:** Write helpful comments that receive upvotes
3. **Be Active:** Regular participation increases activity score
4. **Report Accurately:** File valid reports to build report accuracy
5. **Time:** Account age increases automatically

### Recovery Timeline Examples

**Scenario: User banned for spam (30 day ban)**
- Pre-ban score: 45
- During ban: 22 (halved)
- After ban: 45 (restored)
- 3 months later (with positive activity): 60+

**Scenario: New user with bad start**
- Week 1: Trust score 5 (few downvotes)
- Week 4: Trust score 12 (improved content)
- Month 3: Trust score 35 (consistent participation)
- Month 6: Trust score 55 (established member)

## Transparency and User Visibility

### What Users See
- **Overall Trust Score:** Displayed as 0-100 number
- **Trust Level Badge:** Visual indicator (Very Low → Exceptional)
- **Score Breakdown:** Component scores visible on profile
- **Score History:** Graph showing trust score over time (future)

### What Users Don't See
- Exact calculation formulas (to prevent gaming)
- Other users' detailed breakdowns (privacy)
- Real-time updates (scores update every 24 hours)

### Admin Tools
Admins and moderators can view:
- Complete score breakdown for any user
- History of trust score changes
- Factors contributing to score changes
- Comparison to community averages

## Frequently Asked Questions (FAQ)

### General Questions

**Q: What is a trust score?**  
A: A 0-100 metric that measures your trustworthiness and positive contributions to the Clipper community. It combines account age, karma, activity, and report accuracy.

**Q: Why do I have a low trust score?**  
A: New accounts naturally have low scores. Your score will improve as you:
- Earn karma from upvoted content
- Participate regularly (comments, votes)
- Build account age over time
- File accurate reports

**Q: How often is my trust score updated?**  
A: Trust scores are recalculated once per day. However, karma changes (from votes) update in real-time.

**Q: Can I see other users' trust scores?**  
A: Yes, basic trust scores and levels are visible on user profiles. However, detailed breakdowns are private.

### Improving Your Score

**Q: What's the fastest way to improve my trust score?**  
A: Focus on earning karma by:
1. Submitting quality clips that get upvoted
2. Writing helpful, engaging comments
3. Being active regularly (not just once a month)

Time (account age) also improves your score automatically.

**Q: Do downvotes hurt my trust score?**  
A: Yes, indirectly. Downvotes reduce your karma, which affects 40% of your trust score. Focus on quality over quantity.

**Q: I have high karma but low trust score. Why?**  
A: Trust score considers multiple factors:
- Account age (you may have a new account)
- Activity beyond just submissions
- Report accuracy if you file reports

Check your profile to see the breakdown.

### Bans and Penalties

**Q: How does a ban affect my trust score?**  
A: Bans **halve** your trust score during the ban period. For example:
- Pre-ban: 80 trust → During ban: 40 trust
- Temporary ban: Score restored after ban expires
- Permanent ban: Score remains halved

**Q: Can I recover from a ban?**  
A: Yes! For temporary bans:
- Your score is automatically restored when the ban ends
- Continue positive contributions to improve the underlying metrics
- Within 3-6 months of good behavior, you can exceed your pre-ban score

**Q: Will my score ever fully recover after a permanent ban?**  
A: Permanent bans keep your score halved indefinitely. The only way to restore it is through a successful ban appeal.

### Negative Scores

**Q: Can my trust score go negative?**  
A: No. The minimum score is 0. However, negative karma will result in a 0-point karma component.

**Q: What happens if my trust score is 0?**  
A: You can still use Clipper, but:
- Your content may require manual moderation approval
- You may have reduced feature access
- Rate limits may be stricter

Focus on positive contributions to rebuild your score.

### Reports and Accuracy

**Q: How are "correct" vs "incorrect" reports determined?**  
A: Moderators review each report:
- **Correct:** Moderator takes action (removes content, warns user, etc.)
- **Incorrect:** Moderator dismisses the report as invalid

**Q: Do I need to file reports to have a good trust score?**  
A: No. The report accuracy component is 0 points if you haven't filed any reports. You can still achieve 80/100 points without ever filing a report.

**Q: What if I file a report that gets dismissed?**  
A: One incorrect report won't significantly impact your score. Report accuracy is a percentage:
- 9 correct, 1 incorrect = 90% accuracy = 18/20 points
- Focus on filing legitimate reports, not maximizing quantity

### Technical Questions

**Q: When do I see my new trust score after activity?**  
A: Scores are recalculated once per day (typically at midnight UTC). Karma updates in real-time, but the trust score itself refreshes daily.

**Q: Why did my trust score go down even though I didn't do anything wrong?**  
A: Possible reasons:
- Someone removed their upvote on your content (karma decreased)
- Your report was reviewed and marked incorrect
- Natural score fluctuation as others' scores increase

Small decreases (1-3 points) are normal.

**Q: Can moderators manually adjust trust scores?**  
A: No. Trust scores are calculated automatically by the algorithm. Moderators cannot manually change scores, but their actions (bans, report reviews) indirectly affect scores.

### Privacy and Visibility

**Q: Who can see my trust score?**  
A: Your overall trust score (0-100) and trust level (e.g., "Medium") are publicly visible on your profile. The detailed breakdown (component scores) is only visible to you and administrators.

**Q: Can I hide my trust score?**  
A: Not currently. Trust scores are an important part of community transparency. However, only the overall score is public, not the detailed breakdown.

**Q: Does my trust score affect how my content is ranked?**  
A: Not directly. Content ranking is based on votes, recency, and engagement. However, very low trust scores (<20) may result in content being flagged for review before appearing publicly.

## Visual Score Breakdown

### Trust Score Components Pie Chart

```
 Trust Score (100 points max)
┌─────────────────────────────┐
│  Account Age: 20%      ████ │
│  Karma: 40%        ████████ │
│  Activity: 20%         ████ │
│  Report Accuracy: 20%  ████ │
└─────────────────────────────┘
```

### Example User Trust Score Dashboard

```
User: ActiveGamer2024
Overall Trust Score: 68/100 (Good)

Component Breakdown:
┌──────────────────────┬────────┬──────────┐
│ Component            │ Points │ Max      │
├──────────────────────┼────────┼──────────┤
│ Account Age          │ 10     │ 20       │
│ Karma (2,500)        │ 10     │ 40       │
│ Activity             │ 20     │ 20  ★    │
│ Report Accuracy (80%)│ 16     │ 20       │
├──────────────────────┼────────┼──────────┤
│ Subtotal             │ 56     │ 100      │
│ Ban Penalty          │ ×1.0   │          │
├──────────────────────┼────────┼──────────┤
│ FINAL SCORE          │ 56     │ 100      │
└──────────────────────┴────────┴──────────┘

★ = Maxed out component
```

### Trust Level Progression Path

```
Score    Level              Typical Timeline
───────────────────────────────────────────────
0-19     Very Low          New account (0-30 days)
20-39    Low               Early user (1-3 months)
40-59    Medium            Active member (3-6 months)
60-74    Good              Trusted member (6-12 months)
75-89    High              Veteran (1+ years)
90-100   Exceptional       Community leader (1+ years, very active)
```

## Admin Dashboard

Administrators have access to additional tools for understanding and explaining trust scores:

### Score Explanation Tool
When viewing a user's profile, admins can click "Explain Trust Score" to see:

1. **Current Score Breakdown**
   - Each component's contribution
   - Historical changes to each component
   - Comparison to community averages

2. **Score History Timeline**
   - Graph showing score changes over past 90 days
   - Annotations for significant events (bans, major karma changes)

3. **Contributing Factors**
   - Recent karma changes and sources
   - Activity summary (last 30 days)
   - Report accuracy details
   - Any penalties applied

4. **Recommendations**
   - Suggestions for user to improve score
   - Flags for unusual patterns (sudden drops, gaming attempts)

### Example Admin View

```
User: ProblematicUser123
Trust Score: 22/100 (Low)

Recent Changes:
- Dec 1: Score 45 → 22 (Ban applied)
- Nov 28: Score 43 → 45 (Karma +500)
- Nov 15: Score 40 → 43 (Activity increased)

Component Analysis:
┌─────────────────┬────────┬────────────────┐
│ Component       │ Points │ Notes          │
├─────────────────┼────────┼────────────────┤
│ Account Age     │ 11     │ 200 days       │
│ Karma           │ 12     │ 3,000 points   │
│ Activity        │ 20     │ Very active    │
│ Report Accuracy │ 0      │ No reports     │
├─────────────────┼────────┼────────────────┤
│ Subtotal        │ 43     │                │
│ Ban Penalty     │ ×0.5   │ ⚠️ Active ban  │
├─────────────────┼────────┼────────────────┤
│ FINAL           │ 22     │                │
└─────────────────┴────────┴────────────────┘

⚠️ Alerts:
- User currently under temporary ban (expires Dec 8)
- Ban reason: Spam (multiple low-quality submissions)
- Pre-ban score: 43

Recovery Projection:
- Ban expires: Dec 8 (score → 43)
- Estimated 30-day score (good behavior): 48-52
- Estimated 90-day score (good behavior): 55-60
```

## Internal Documentation (Support Team)

### Common Support Scenarios

#### Scenario 1: "Why is my trust score so low?"
**Response Template:**
```
Hi [User],

Your trust score is calculated based on several factors:

1. Account Age (20%): Your account is [X] days old
2. Karma (40%): You currently have [X] karma points
3. Activity (20%): [Summary of activity]
4. Report Accuracy (20%): [Report stats or "No reports filed"]

Your current score is [X]/100, which is in the "[Level]" range.

To improve your score:
- [Specific recommendations based on breakdown]

Trust scores update daily. Keep contributing positively!

Best,
Clipper Support
```

#### Scenario 2: "My score dropped after a ban"
**Response Template:**
```
Hi [User],

Active bans reduce trust scores by 50% as a penalty for guideline violations. 

Your situation:
- Pre-ban score: [X]
- Current score: [X] (halved)
- Ban expires: [Date]

Once your ban expires, your score will return to [X] immediately. You can then continue building your score through positive contributions.

If you believe the ban was issued in error, please submit an appeal.

Best,
Clipper Support
```

#### Scenario 3: "Someone else has a higher score with less karma"
**Response Template:**
```
Hi [User],

Trust scores combine multiple factors beyond just karma:

Karma is 40% of the score. Other factors include:
- Account age (20%)
- Overall activity - comments, votes, submissions (20%)
- Report accuracy (20%)

The user you're comparing yourself to may have:
- An older account
- More consistent activity
- Better report accuracy

Focus on your own positive contributions rather than comparisons.

Best,
Clipper Support
```

### Support Team Tools

1. **Trust Score Lookup**
   - Quick search by username or user ID
   - View full breakdown without navigating to profile

2. **Score History**
   - See 90-day score history
   - Identify sudden changes and causes

3. **Comparison Tool**
   - Compare user's score to community percentiles
   - Show which components are below/above average

4. **Canned Responses**
   - Pre-written templates for common questions
   - Auto-fill with user's specific data

## Algorithm Maintenance

### Monitoring
- Weekly reports on score distribution
- Alerts for unusual patterns (mass score drops)
- Track component averages over time

### Adjustments
Any changes to the algorithm weights or formulas require:
1. Data analysis and simulation
2. Team review and approval
3. Communication to community
4. Gradual rollout (A/B testing when possible)

### Version History
- **v1.0 (Current):** Initial implementation with 4 components + ban penalty
- **v1.1 (Planned):** Add email verification weight
- **v2.0 (Planned):** Time decay for karma, weighted recent activity

## Related Documentation

- **[REPUTATION_SYSTEM.md](REPUTATION_SYSTEM.md):** Technical implementation details
- **[User FAQ](users/faq.md):** User-facing FAQ with trust score basics
- **[Community Guidelines](users/community-guidelines.md):** Rules affecting trust scores
- **[Moderation Guide](MODERATION_SYSTEM.md):** How trust scores inform moderation

## Appendix: Mathematical Details

### Score Normalization
All components are independently normalized to their max values before being summed:

```
normalized_component = MIN(raw_value / normalization_factor, max_points)
```

This ensures:
- Early progress is rewarding (first 100 karma is easier than next 100)
- There's a ceiling to prevent extreme outliers
- Components are weighted proportionally

### Integer Rounding
Final scores are stored as integers (0-100). Rounding follows standard rules:
- 0.5 and above rounds up
- Below 0.5 rounds down

### Database Implementation
Trust scores are calculated via PostgreSQL function `calculate_trust_score(user_id)` defined in migration `000005_add_reputation_system.up.sql`.

The function:
1. Queries user data (account age, karma, ban status)
2. Queries user_stats (activity metrics, reports)
3. Applies formula as defined above
4. Returns clamped integer (0-100)

Scores are updated via scheduled job (daily at 00:00 UTC).

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-09  
**Owner:** Product & Engineering Teams  
**Review Cycle:** Quarterly
