# Marketing drafting prompts

Use these with the completed product context and the relevant packet section. They are original task prompts informed by the resource types in [Okara's skills library](https://okara.ai/skills) and [prompt library](https://okara.ai/prompts); they do not require Okara or install third-party skills. Replace the inputs before running a prompt.

## Common instruction

Prepend this to each task:

```text
Use only the supplied product context, claims register, and source material.
Keep source-supported scope, deployment verification, and hypotheses distinct.
If evidence is missing, omit the claim from public copy and list the question
separately. Never invent metrics, quotes, pricing, customer experience,
competitor weaknesses, complete coverage, or availability. Follow this
product's voice and visual sources. Draft only; do not send or publish.

Product context: {{CONTEXT}}
Relevant packet section: {{SECTION}}
Goal, audience, channel, and one desired action: {{BRIEF}}
```

## 1. Positioning and message

```text
Write one positioning paragraph and three distinct campaign angles.
For each angle, name the reader's situation, supported task, evidence claim
IDs, one action, and one assumption to test. Prefer a concrete demonstration
over a broad superiority claim. Recommend an angle from the supplied facts;
do not describe an audience hypothesis as research.
```

## 2. Landing copy and FAQ

```text
Draft a hero, supporting line, primary button, three task-led sections,
proof section, final action, and six concise FAQ answers. Use one primary
action throughout. Make availability and prerequisites accurate. Return
public copy followed by a separate claim-to-source map and unresolved facts.
```

## 3. Channel adaptation

```text
Adapt the brief into one short social post, a four-post demonstration thread,
a community introduction, a newsletter block, and a personal outreach draft.
Keep the core facts but change the framing to fit each channel. Disclose the
builder relationship in community copy. Give each piece one relevant action.
Mark unknown destination limits or rules for a current check. Do not invent
personal experience, recipient details, endorsements, or reasons for urgency.
```

## 4. Demo and visual brief

```text
Write a 30–60-second demonstration of one real user task. Supply timing,
capture instructions, captions, opening hook, and final action. Name required
product state and verification before capture. Reference existing brand
layouts rather than inventing a new identity. List media rights, captions,
and alt-text needs. Keep unbuilt behavior out of the script.
```

## 5. Launch research

```text
Inputs: {{THREE_TO_FIVE_SELECTED_LAUNCH_URLS_AND_OBSERVATIONS}}.
For each example, record source/date, audience, opening idea, demonstrated
task, proof, format, action, and what might transfer to our product. If only
a directory entry is supplied, do not claim to have watched the video.
Propose three original hooks and one demo structure. Do not copy slogans
or scripts. Report view counts only as attributed observations; do not infer
conversion or predict virality. Identify selection bias in a popular-launch
collection. Return the evidence gaps separately.
```

Browse [Okara's launch library](https://okara.ai/launch-library) for candidates. Choose products with comparable audience and user tasks, then inspect the originals before drawing conclusions about their videos. No individual launch video was analyzed for the initial CLPR packet.

## 6. Thirty-day experiment plan

```text
Inputs: {{OWNER_TIME_BUDGET_CHANNEL_ACCESS_EXISTING_MEASUREMENT}}.
Plan four weeks around the selected audience and first-use action. Choose
at most two initial channels and explain their fit. Specify assets, owners,
dependencies, completion evidence, measurement definitions, and review dates.
Separate application changes from content work. Treat missing analytics as
unavailable. Use observed baselines for targets; otherwise propose a baseline
period. Do not assume community permission or commit spend or outreach.
```

## 7. Editorial and claim review

```text
Review the finished packet against the supplied sources. Identify unsupported
capabilities, quantitative or comparative claims, fabricated quotes, outdated
scope, unexplained terminology, repetitive hooks, and unresolved placeholders.
Check that every action leads to the described experience. Replace vague
benefits with supported tasks. Return revised copy and a short list of
remaining factual or publication blockers; preserve useful uncertainty.
```
