---
title: "Roadmap 4.0"
summary: "Sequential delivery plan that supersedes Roadmap 3.0, consolidating all open epics and issues (#225-#706) into a single, start-to-finish path."
tags: ["product", "roadmap", "planning"]
owner: "team-core"
status: "draft"
version: "4.0"
last_reviewed: 2025-12-15
---

# Roadmap 4.0

This roadmap supersedes Roadmap 3.0 (see [docs/product/roadmap.md](docs/product/roadmap.md)) and captures every open epic
and issue from #225 through #706. Follow the phases in sequence; items inside a phase can proceed in parallel where
dependencies allow.

## Development Order (Phases)

### Phase 0: Tracker & Alignment

- [#706](https://github.com/subculture-collective/clipper/issues/706) Roadmap 4.0 Master Tracker

### Phase 1: Security & Compliance Hardening

- [#397](https://github.com/subculture-collective/clipper/issues/397) CRITICAL: Implement Secrets Management and Automated
  Credential Rotation
- [#396](https://github.com/subculture-collective/clipper/issues/396) CRITICAL: Implement Multi-Factor Authentication (MFA)
  for Admin Accounts
- [#398](https://github.com/subculture-collective/clipper/issues/398) HIGH: Implement Comprehensive IDOR Testing and
  Authorization Framework
- [#400](https://github.com/subculture-collective/clipper/issues/400) HIGH: Implement Query Cost Analysis and Complexity
  Limits
- [#399](https://github.com/subculture-collective/clipper/issues/399) HIGH: Implement Comprehensive OpenSearch Query
  Validation
- [#325](https://github.com/subculture-collective/clipper/issues/325) Security: Secrets management audit and rotation
- [#326](https://github.com/subculture-collective/clipper/issues/326) Security: External penetration test and remediation
- [#601](https://github.com/subculture-collective/clipper/issues/601) Security: Implement API Rate Limiting
- [#602](https://github.com/subculture-collective/clipper/issues/602) Security: Remediate Critical & High Priority Vulnerabilities
- [#596](https://github.com/subculture-collective/clipper/issues/596) Legal: Implement DMCA Takedown and Counter-Notice System

### Phase 2: Infrastructure, Reliability & Environments

- [#666](https://github.com/subculture-collective/clipper/issues/666) Epic: Content Infrastructure & CDN
- [#586](https://github.com/subculture-collective/clipper/issues/586) Deploy: Blue/green rollout and smoke tests II
- [#608](https://github.com/subculture-collective/clipper/issues/608) Deployment: Implement Blue/Green Deployment
- [#609](https://github.com/subculture-collective/clipper/issues/609) Deployment: Set Up Staging Environment
- [#605](https://github.com/subculture-collective/clipper/issues/605) Testing: Execute Load & Performance Testing
- [#322](https://github.com/subculture-collective/clipper/issues/322) Load Test: Re-test and SLO confirmation
- [#320](https://github.com/subculture-collective/clipper/issues/320) Load Test: CI integration and nightly runs
- [#606](https://github.com/subculture-collective/clipper/issues/606) Testing: Implement Integration & E2E Tests
- [#428](https://github.com/subculture-collective/clipper/issues/428) Feature: Comprehensive E2E Testing for Clip Submission
  Flow
- [#607](https://github.com/subculture-collective/clipper/issues/607) Testing: Mobile App Testing & QA
- [#335](https://github.com/subculture-collective/clipper/issues/335) Post-Launch: Monitoring dashboards, alerts, and SLOs
- [#432](https://github.com/subculture-collective/clipper/issues/432) Epic: Production Readiness Testing

### Phase 3: Observability, Analytics & Data

- [#590](https://github.com/subculture-collective/clipper/issues/590) Feature: Product Analytics & Business Intelligence
  Infrastructure
- [#619](https://github.com/subculture-collective/clipper/issues/619) Analytics: Implement Event Tracking
- [#616](https://github.com/subculture-collective/clipper/issues/616) Analytics: Build BI Dashboards (Metabase)

### Phase 4: Admin Control & Moderation

- [#664](https://github.com/subculture-collective/clipper/issues/664) Epic: Admin Moderation Dashboard
- [#665](https://github.com/subculture-collective/clipper/issues/665) Epic: Admin Control Center
- [#674](https://github.com/subculture-collective/clipper/issues/674) Epic: Admin Comment Moderation Interface
- [#692](https://github.com/subculture-collective/clipper/issues/692) Moderation: Admin Queue UI & Bulk Actions
- [#699](https://github.com/subculture-collective/clipper/issues/699) Moderation: User Appeal System
- [#702](https://github.com/subculture-collective/clipper/issues/702) Moderation: Audit Logging & Analytics Dashboard
- [#705](https://github.com/subculture-collective/clipper/issues/705) Chat: Moderation Tools & User Management
- [#698](https://github.com/subculture-collective/clipper/issues/698) Forum: Admin Moderation Interface & Tools

### Phase 5: Payments, Entitlements & Sync

- [#225](https://github.com/subculture-collective/clipper/issues/225) Patreon integration — Parent tracking issue
- [#270](https://github.com/subculture-collective/clipper/issues/270) Patreon: OAuth app and account linking
- [#271](https://github.com/subculture-collective/clipper/issues/271) Patreon: API client and membership fetch
- [#272](https://github.com/subculture-collective/clipper/issues/272) Patreon: Webhook handler for membership changes
- [#273](https://github.com/subculture-collective/clipper/issues/273) Patreon: Entitlement mapping and premium sync
- [#230](https://github.com/subculture-collective/clipper/issues/230) Webhook notifications — Parent tracking issue
- [#294](https://github.com/subculture-collective/clipper/issues/294) Webhooks: Subscription management UI and API
- [#295](https://github.com/subculture-collective/clipper/issues/295) Webhooks: Delivery worker, retries, and dead-letter
  queue
- [#296](https://github.com/subculture-collective/clipper/issues/296) Webhooks: Signature verification docs for consumers
- [#297](https://github.com/subculture-collective/clipper/issues/297) Webhooks: Monitoring and alerting
- [#611](https://github.com/subculture-collective/clipper/issues/611) Stripe: Test & Verify Webhook Handlers
- [#612](https://github.com/subculture-collective/clipper/issues/612) Stripe: Test Subscription Lifecycle Flows
- [#438](https://github.com/subculture-collective/clipper/issues/438) Testing: Stripe Integration Production Verification
- [#429](https://github.com/subculture-collective/clipper/issues/429) Epic: User-Submitted Content Platform Launch -
  Transition Roadmap

### Phase 6: Trust, Reputation & Verification

- [#231](https://github.com/subculture-collective/clipper/issues/231) Creator verification — Parent tracking issue
- [#299](https://github.com/subculture-collective/clipper/issues/299) Creator Verification: Admin review queue and tooling
- [#300](https://github.com/subculture-collective/clipper/issues/300) Creator Verification: Badge and trust signals across
  UI
- [#301](https://github.com/subculture-collective/clipper/issues/301) Creator Verification: Abuse prevention and audits

### Phase 7: Core Feed, Discovery & Playlists

- [#663](https://github.com/subculture-collective/clipper/issues/663) Epic: Feed & Discovery
- [#668](https://github.com/subculture-collective/clipper/issues/668) Epic: Home Page & Feed Filtering
- [#669](https://github.com/subculture-collective/clipper/issues/669) Epic: Clip Playlists, Theatre Mode & Queue
- [#675](https://github.com/subculture-collective/clipper/issues/675) Feed Filtering UI & API with Presets
- [#677](https://github.com/subculture-collective/clipper/issues/677) Feed: Sort & Trending Algorithms
- [#678](https://github.com/subculture-collective/clipper/issues/678) Feed: Cursor-Based Pagination & Infinite Scroll
- [#679](https://github.com/subculture-collective/clipper/issues/679) Feed: Discovery Algorithms & Recommendation Engine
- [#680](https://github.com/subculture-collective/clipper/issues/680) Feed: Analytics & Performance Monitoring
- [#676](https://github.com/subculture-collective/clipper/issues/676) Playlists: Playlist Creation, Management & Sharing
- [#681](https://github.com/subculture-collective/clipper/issues/681) Playlists: Theatre Mode Player & Quality Selection
- [#682](https://github.com/subculture-collective/clipper/issues/682) Playlists: Queue System & Up-Next Management
- [#687](https://github.com/subculture-collective/clipper/issues/687) Playlists: Watch History & Playback Resumption
- [#688](https://github.com/subculture-collective/clipper/issues/688) Playlists: Sharing & Collaborative Playlists

### Phase 8: Live Streams, Chat & Watch Parties

- [#673](https://github.com/subculture-collective/clipper/issues/673) Epic: Live Stream Watching & Integration
- [#671](https://github.com/subculture-collective/clipper/issues/671) Epic: Live Chat System & Community Channels
- [#672](https://github.com/subculture-collective/clipper/issues/672) Epic: Watch Parties with Friends & Community
- [#690](https://github.com/subculture-collective/clipper/issues/690) Streams: Twitch Embed Integration & Stream Player
- [#696](https://github.com/subculture-collective/clipper/issues/696) Streams: Clip Submission from Live Streams
- [#697](https://github.com/subculture-collective/clipper/issues/697) Streams: Live Stream Notifications & Alerts
- [#703](https://github.com/subculture-collective/clipper/issues/703) Streams: Twitch Chat Integration & OAuth
- [#686](https://github.com/subculture-collective/clipper/issues/686) Chat: WebSocket Server & Message Infrastructure
- [#693](https://github.com/subculture-collective/clipper/issues/693) Chat: Frontend UI & Channel Interface
- [#694](https://github.com/subculture-collective/clipper/issues/694) Chat: WebSocket Server & Redis Pub/Sub Backend
- [#701](https://github.com/subculture-collective/clipper/issues/701) Chat: Channel Management & Settings
- [#689](https://github.com/subculture-collective/clipper/issues/689) Watch Parties: Sync Engine & Host Controls
- [#691](https://github.com/subculture-collective/clipper/issues/691) Watch Parties: Chat & Emoji Reactions System
- [#700](https://github.com/subculture-collective/clipper/issues/700) Watch Parties: Settings & History
- [#704](https://github.com/subculture-collective/clipper/issues/704) Watch Parties: Analytics & Engagement Metrics

### Phase 9: Forum & Social Community

- [#667](https://github.com/subculture-collective/clipper/issues/667) Epic: Social & Community
- [#670](https://github.com/subculture-collective/clipper/issues/670) Epic: Meta Forum & Community Discussions
- [#683](https://github.com/subculture-collective/clipper/issues/683) Forum: Backend & Data Model with Hierarchical Replies
- [#684](https://github.com/subculture-collective/clipper/issues/684) Forum: Frontend UI & Discussion Interface
- [#685](https://github.com/subculture-collective/clipper/issues/685) Forum: Voting System & Reputation Mechanics
- [#695](https://github.com/subculture-collective/clipper/issues/695) Forum: Search & Full-Text Indexing

### Phase 10: Integrations, Extensions & Growth Channels

- [#436](https://github.com/subculture-collective/clipper/issues/436) Epic: Browser Extension v1
- [#302](https://github.com/subculture-collective/clipper/issues/302) Browser Extension: Feature RFC and scope
- [#303](https://github.com/subculture-collective/clipper/issues/303) Browser Extension: Base scaffold for Chrome/Firefox
- [#304](https://github.com/subculture-collective/clipper/issues/304) Browser Extension: Context menu — Submit clip from
  Twitch
- [#305](https://github.com/subculture-collective/clipper/issues/305) Browser Extension: Auth and secure storage
- [#306](https://github.com/subculture-collective/clipper/issues/306) Browser Extension: Store publishing (Chrome Web
  Store, AMO)
- [#614](https://github.com/subculture-collective/clipper/issues/614) Browser Extension: Build Chrome/Firefox Extension
- [#437](https://github.com/subculture-collective/clipper/issues/437) Epic: Discord Bot v1
- [#307](https://github.com/subculture-collective/clipper/issues/307) Discord Bot: Bot setup and command design
- [#308](https://github.com/subculture-collective/clipper/issues/308) Discord Bot: OAuth and guild installation flow
- [#309](https://github.com/subculture-collective/clipper/issues/309) Discord Bot: Commands — submit clip, top clips, search
- [#310](https://github.com/subculture-collective/clipper/issues/310) Discord Bot: Hosting, monitoring, and docs
- [#615](https://github.com/subculture-collective/clipper/issues/615) Discord Bot: Implement Core Bot Features
- [#434](https://github.com/subculture-collective/clipper/issues/434) Epic: Marketing & Launch Campaign
- [#613](https://github.com/subculture-collective/clipper/issues/613) Marketing: Build Landing Page
- [#610](https://github.com/subculture-collective/clipper/issues/610) Marketing: Execute Social Media Launch Campaign

### Phase 11: Mobile Applications

- [#232](https://github.com/subculture-collective/clipper/issues/232) Mobile apps (iOS/Android) — Parent tracking issue
- [#254](https://github.com/subculture-collective/clipper/issues/254) Mobile: E2E tests and CI/CD pipelines
- [#256](https://github.com/subculture-collective/clipper/issues/256) Mobile: Telemetry and crash reporting
- [#361](https://github.com/subculture-collective/clipper/issues/361) Mobile: Feed performance — batch media fields to
  avoid per-item detail fetch
- [#362](https://github.com/subculture-collective/clipper/issues/362) Mobile: Video playback polish — quality selection,
  PiP QA, memory usage
- [#363](https://github.com/subculture-collective/clipper/issues/363) Mobile: Remove pointerEvents deprecation warnings and
  update usages
- [#617](https://github.com/subculture-collective/clipper/issues/617) App Store: Prepare & Submit Android App
- [#618](https://github.com/subculture-collective/clipper/issues/618) App Store: Prepare & Submit iOS App
- [#589](https://github.com/subculture-collective/clipper/issues/589) Feature: Mobile App Store Submission & ASO Strategy

### Phase 12: Internationalization

- [#235](https://github.com/subculture-collective/clipper/issues/235) Multi-language support — Parent tracking issue
- [#311](https://github.com/subculture-collective/clipper/issues/311) i18n: Integrate framework and extract strings
- [#312](https://github.com/subculture-collective/clipper/issues/312) i18n: Locale switcher and detection
- [#313](https://github.com/subculture-collective/clipper/issues/313) i18n: Language packs (EN baseline, ES/DE/FR v1)
- [#314](https://github.com/subculture-collective/clipper/issues/314) i18n: RTL support, date/number formatting

### Phase 13: Launch, Marketing Assets & Post-Launch Ops

- [#331](https://github.com/subculture-collective/clipper/issues/331) Launch: Announcement plan and messaging
- [#332](https://github.com/subculture-collective/clipper/issues/332) Launch: Product Hunt and social media assets
- [#333](https://github.com/subculture-collective/clipper/issues/333) Launch: Blog post and press kit
- [#334](https://github.com/subculture-collective/clipper/issues/334) Launch: Community outreach and partnerships
- [#318](https://github.com/subculture-collective/clipper/issues/318) Final QA: Release signoff checklist
- [#317](https://github.com/subculture-collective/clipper/issues/317) Final QA: Accessibility pass (WCAG AA) and fixes
- [#316](https://github.com/subculture-collective/clipper/issues/316) Final QA: Exploratory testing and bug tracking
- [#315](https://github.com/subculture-collective/clipper/issues/315) Final QA: Comprehensive test plan and owners
- [#337](https://github.com/subculture-collective/clipper/issues/337) Post-Launch: Feedback loop and rapid fix pipeline
- [#336](https://github.com/subculture-collective/clipper/issues/336) Post-Launch: On-call runbook and triage process
- [#588](https://github.com/subculture-collective/clipper/issues/588) Roadmap 3.0 — Production Launch & Beyond (Q1 2026)
- [#584](https://github.com/subculture-collective/clipper/issues/584) Feature: documentation overhaul II

## Start-to-Finish Checklist (Ordered)

1. [#706](https://github.com/subculture-collective/clipper/issues/706)
2. [#397](https://github.com/subculture-collective/clipper/issues/397)
3. [#396](https://github.com/subculture-collective/clipper/issues/396)
4. [#398](https://github.com/subculture-collective/clipper/issues/398)
5. [#400](https://github.com/subculture-collective/clipper/issues/400)
6. [#399](https://github.com/subculture-collective/clipper/issues/399)
7. [#325](https://github.com/subculture-collective/clipper/issues/325)
8. [#326](https://github.com/subculture-collective/clipper/issues/326)
9. [#601](https://github.com/subculture-collective/clipper/issues/601)
10. [#602](https://github.com/subculture-collective/clipper/issues/602)
11. [#596](https://github.com/subculture-collective/clipper/issues/596)
12. [#666](https://github.com/subculture-collective/clipper/issues/666)
13. [#586](https://github.com/subculture-collective/clipper/issues/586)
14. [#608](https://github.com/subculture-collective/clipper/issues/608)
15. [#609](https://github.com/subculture-collective/clipper/issues/609)
16. [#605](https://github.com/subculture-collective/clipper/issues/605)
17. [#322](https://github.com/subculture-collective/clipper/issues/322)
18. [#320](https://github.com/subculture-collective/clipper/issues/320)
19. [#606](https://github.com/subculture-collective/clipper/issues/606)
20. [#428](https://github.com/subculture-collective/clipper/issues/428)
21. [#607](https://github.com/subculture-collective/clipper/issues/607)
22. [#335](https://github.com/subculture-collective/clipper/issues/335)
23. [#432](https://github.com/subculture-collective/clipper/issues/432)
24. [#590](https://github.com/subculture-collective/clipper/issues/590)
25. [#619](https://github.com/subculture-collective/clipper/issues/619)
26. [#616](https://github.com/subculture-collective/clipper/issues/616)
27. [#664](https://github.com/subculture-collective/clipper/issues/664)
28. [#665](https://github.com/subculture-collective/clipper/issues/665)
29. [#674](https://github.com/subculture-collective/clipper/issues/674)
30. [#692](https://github.com/subculture-collective/clipper/issues/692)
31. [#699](https://github.com/subculture-collective/clipper/issues/699)
32. [#702](https://github.com/subculture-collective/clipper/issues/702)
33. [#705](https://github.com/subculture-collective/clipper/issues/705)
34. [#698](https://github.com/subculture-collective/clipper/issues/698)
35. [#225](https://github.com/subculture-collective/clipper/issues/225)
36. [#270](https://github.com/subculture-collective/clipper/issues/270)
37. [#271](https://github.com/subculture-collective/clipper/issues/271)
38. [#272](https://github.com/subculture-collective/clipper/issues/272)
39. [#273](https://github.com/subculture-collective/clipper/issues/273)
40. [#230](https://github.com/subculture-collective/clipper/issues/230)
41. [#294](https://github.com/subculture-collective/clipper/issues/294)
42. [#295](https://github.com/subculture-collective/clipper/issues/295)
43. [#296](https://github.com/subculture-collective/clipper/issues/296)
44. [#297](https://github.com/subculture-collective/clipper/issues/297)
45. [#611](https://github.com/subculture-collective/clipper/issues/611)
46. [#612](https://github.com/subculture-collective/clipper/issues/612)
47. [#438](https://github.com/subculture-collective/clipper/issues/438)
48. [#429](https://github.com/subculture-collective/clipper/issues/429)
49. [#231](https://github.com/subculture-collective/clipper/issues/231)
50. [#299](https://github.com/subculture-collective/clipper/issues/299)
51. [#300](https://github.com/subculture-collective/clipper/issues/300)
52. [#301](https://github.com/subculture-collective/clipper/issues/301)
53. [#663](https://github.com/subculture-collective/clipper/issues/663)
54. [#668](https://github.com/subculture-collective/clipper/issues/668)
55. [#669](https://github.com/subculture-collective/clipper/issues/669)
56. [#675](https://github.com/subculture-collective/clipper/issues/675)
57. [#677](https://github.com/subculture-collective/clipper/issues/677)
58. [#678](https://github.com/subculture-collective/clipper/issues/678)
59. [#679](https://github.com/subculture-collective/clipper/issues/679)
60. [#680](https://github.com/subculture-collective/clipper/issues/680)
61. [#676](https://github.com/subculture-collective/clipper/issues/676)
62. [#681](https://github.com/subculture-collective/clipper/issues/681)
63. [#682](https://github.com/subculture-collective/clipper/issues/682)
64. [#687](https://github.com/subculture-collective/clipper/issues/687)
65. [#688](https://github.com/subculture-collective/clipper/issues/688)
66. [#673](https://github.com/subculture-collective/clipper/issues/673)
67. [#671](https://github.com/subculture-collective/clipper/issues/671)
68. [#672](https://github.com/subculture-collective/clipper/issues/672)
69. [#690](https://github.com/subculture-collective/clipper/issues/690)
70. [#696](https://github.com/subculture-collective/clipper/issues/696)
71. [#697](https://github.com/subculture-collective/clipper/issues/697)
72. [#703](https://github.com/subculture-collective/clipper/issues/703)
73. [#686](https://github.com/subculture-collective/clipper/issues/686)
74. [#693](https://github.com/subculture-collective/clipper/issues/693)
75. [#694](https://github.com/subculture-collective/clipper/issues/694)
76. [#701](https://github.com/subculture-collective/clipper/issues/701)
77. [#689](https://github.com/subculture-collective/clipper/issues/689)
78. [#691](https://github.com/subculture-collective/clipper/issues/691)
79. [#700](https://github.com/subculture-collective/clipper/issues/700)
80. [#704](https://github.com/subculture-collective/clipper/issues/704)
81. [#667](https://github.com/subculture-collective/clipper/issues/667)
82. [#670](https://github.com/subculture-collective/clipper/issues/670)
83. [#683](https://github.com/subculture-collective/clipper/issues/683)
84. [#684](https://github.com/subculture-collective/clipper/issues/684)
85. [#685](https://github.com/subculture-collective/clipper/issues/685)
86. [#695](https://github.com/subculture-collective/clipper/issues/695)
87. [#436](https://github.com/subculture-collective/clipper/issues/436)
88. [#302](https://github.com/subculture-collective/clipper/issues/302)
89. [#303](https://github.com/subculture-collective/clipper/issues/303)
90. [#304](https://github.com/subculture-collective/clipper/issues/304)
91. [#305](https://github.com/subculture-collective/clipper/issues/305)
92. [#306](https://github.com/subculture-collective/clipper/issues/306)
93. [#614](https://github.com/subculture-collective/clipper/issues/614)
94. [#437](https://github.com/subculture-collective/clipper/issues/437)
95. [#307](https://github.com/subculture-collective/clipper/issues/307)
96. [#308](https://github.com/subculture-collective/clipper/issues/308)
97. [#309](https://github.com/subculture-collective/clipper/issues/309)
98. [#310](https://github.com/subculture-collective/clipper/issues/310)
99. [#615](https://github.com/subculture-collective/clipper/issues/615)
100. [#434](https://github.com/subculture-collective/clipper/issues/434)
101. [#613](https://github.com/subculture-collective/clipper/issues/613)
102. [#610](https://github.com/subculture-collective/clipper/issues/610)
103. [#232](https://github.com/subculture-collective/clipper/issues/232)
104. [#254](https://github.com/subculture-collective/clipper/issues/254)
105. [#256](https://github.com/subculture-collective/clipper/issues/256)
106. [#361](https://github.com/subculture-collective/clipper/issues/361)
107. [#362](https://github.com/subculture-collective/clipper/issues/362)
108. [#363](https://github.com/subculture-collective/clipper/issues/363)
109. [#617](https://github.com/subculture-collective/clipper/issues/617)
110. [#618](https://github.com/subculture-collective/clipper/issues/618)
111. [#589](https://github.com/subculture-collective/clipper/issues/589)
112. [#235](https://github.com/subculture-collective/clipper/issues/235)
113. [#311](https://github.com/subculture-collective/clipper/issues/311)
114. [#312](https://github.com/subculture-collective/clipper/issues/312)
115. [#313](https://github.com/subculture-collective/clipper/issues/313)
116. [#314](https://github.com/subculture-collective/clipper/issues/314)
117. [#331](https://github.com/subculture-collective/clipper/issues/331)
118. [#332](https://github.com/subculture-collective/clipper/issues/332)
119. [#333](https://github.com/subculture-collective/clipper/issues/333)
120. [#334](https://github.com/subculture-collective/clipper/issues/334)
121. [#318](https://github.com/subculture-collective/clipper/issues/318)
122. [#317](https://github.com/subculture-collective/clipper/issues/317)
123. [#316](https://github.com/subculture-collective/clipper/issues/316)
124. [#315](https://github.com/subculture-collective/clipper/issues/315)
125. [#337](https://github.com/subculture-collective/clipper/issues/337)
126. [#336](https://github.com/subculture-collective/clipper/issues/336)
127. [#588](https://github.com/subculture-collective/clipper/issues/588)
128. [#584](https://github.com/subculture-collective/clipper/issues/584)

## Notes & Dependencies

- Security hardening (Phase 1) is a blocking dependency for admin, payments, and production readiness work.
- Moderation capabilities (#692, #699, #702, #705) should be pulled forward in parallel once chat/forum UIs stabilize to
  manage risk.
- Analytics and event tracking (Phase 3) should precede marketing and launch efforts to ensure reliable measurement.
- Roadmap 3.0 remains available in [docs/product/roadmap.md](docs/product/roadmap.md) for historical reference; 4.0 is
  the active delivery path.
