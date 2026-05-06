# Word Learning Data Model

This document defines the implementation-ready data model for the later
word-learning system.

It works together with:

- `test_bank_architecture.md`
- `word_learning_system.md`
- the learner JSON files under `data/english_system/learner/`

## Design Goal

The data model should support one continuous loop:

1. diagnosis result enters the personal lexicon
2. `unknown` and `fuzzy` items become learning candidates
3. the system builds a daily queue
4. the user studies cards and completes verification
5. learned items enter spaced review
6. learned items are reused in story/material generation
7. review results update future priority

## Core Relationships

- `lexicon.json`:
  keeps the diagnostic status view
- `learning_items.json`:
  keeps the long-lived learning state view
- `daily_learning_queue.json`:
  keeps the selected tasks for one day
- `memory_schedule.json`:
  keeps due dates and review history
- `word_learning_sessions.json`:
  keeps per-session card records
- `today_story_queue.json`:
  keeps the short-text generation request and output metadata
- `materials_index.json`:
  indexes uploaded and generated materials

## 1. learning_items.json

Purpose:

- one long-lived learning profile per item
- source of "today's new words"
- bridge between diagnosis and memorization

Recommended shape:

```json
{
  "version": 1,
  "updatedAt": "",
  "items": [
    {
      "itemId": "A0001",
      "text": "framework",
      "type": "word",
      "category": "academic",
      "subCategory": "research",
      "diagnosticStatus": "fuzzy",
      "learningStage": "new",
      "masteryLevel": 0,
      "priorityScore": 0.84,
      "importanceScore": 0.9,
      "interestTags": ["AI", "design-research"],
      "firstSeenAt": "",
      "lastSeenAt": "",
      "lastLearnedAt": "",
      "lastReviewedAt": "",
      "lastOutcome": "",
      "wrongCount": 0,
      "stableCount": 0,
      "lapseCount": 0,
      "currentMemoryStep": "D0",
      "nextDueAt": "",
      "origin": {
        "sourceType": "diagnostic_bank",
        "sourceId": "A0001",
        "sourceSessionId": ""
      },
      "links": {
        "lexiconItemId": "A0001",
        "materialIds": [],
        "storyIds": []
      },
      "enrichment": {
        "glossZh": "框架",
        "example": "The paper proposes a framework for analyzing design collaboration.",
        "exampleZh": "",
        "root": "",
        "derivatives": [],
        "relatedItems": []
      },
      "notes": ""
    }
  ]
}
```

Important fields:

- `diagnosticStatus`: `familiar | fuzzy | unknown`
- `learningStage`:
  `new | learning | verifying | learned | reviewing | relearning | mastered`
- `masteryLevel`: recommended `0-5`
- `priorityScore`: used for daily queue selection
- `importanceScore`: reflects bank-side importance, not user performance
- `stableCount`: number of successful confirmations
- `lapseCount`: number of relearning fallbacks

## 2. daily_learning_queue.json

Purpose:

- one daily study package for the card system
- input for the word-learning frontend

Recommended shape:

```json
{
  "version": 1,
  "date": "2026-05-05",
  "status": "draft",
  "sourceMode": "unknown_and_fuzzy_priority",
  "targetNewCount": 15,
  "targetReviewCount": 15,
  "newItems": [
    {
      "itemId": "A0001",
      "reason": "diagnostic_unknown",
      "queueOrder": 1
    }
  ],
  "reviewItems": [
    {
      "itemId": "D0012",
      "reason": "due_today",
      "memoryStep": "D3",
      "dueAt": ""
    }
  ],
  "verificationItems": [
    {
      "itemId": "A0001",
      "fromStage": "learning"
    }
  ],
  "storyItems": [
    {
      "itemId": "A0001",
      "role": "target_word"
    }
  ],
  "sourceMaterials": [],
  "sessionIds": {
    "learning": "",
    "verification": "",
    "review": ""
  },
  "generatedAt": "",
  "completedAt": ""
}
```

Recommended `status` values:

- `draft`
- `ready`
- `in_progress`
- `completed`
- `archived`

## 3. memory_schedule.json

Purpose:

- spaced-repetition schedule
- due-date engine for review

Recommended shape:

```json
{
  "version": 1,
  "defaultSteps": [
    { "name": "D0", "offsetDays": 0, "purpose": "same_day_consolidation" },
    { "name": "D1", "offsetDays": 1, "purpose": "next_day_review" },
    { "name": "D3", "offsetDays": 3, "purpose": "early_stabilization" },
    { "name": "D7", "offsetDays": 7, "purpose": "weekly_review" },
    { "name": "D14", "offsetDays": 14, "purpose": "biweekly_review" },
    { "name": "D30", "offsetDays": 30, "purpose": "monthly_review" },
    { "name": "D60", "offsetDays": 60, "purpose": "long_term_retention" }
  ],
  "items": [
    {
      "itemId": "A0001",
      "currentStage": "learning",
      "currentStep": "D0",
      "dueAt": "",
      "lastReviewedAt": "",
      "nextDueAt": "",
      "successCount": 0,
      "lapseCount": 0,
      "history": [
        {
          "step": "D0",
          "outcome": "fuzzy",
          "reviewedAt": "",
          "sessionId": ""
        }
      ]
    }
  ],
  "updatedAt": ""
}
```

Recommended review outcomes:

- `familiar`
- `fuzzy`
- `unknown`

Transition suggestion:

- `familiar`: move to next step
- `fuzzy`: stay or move to a shorter retry step
- `unknown`: fallback to `relearning` and earlier step

## 4. word_learning_sessions.json

Purpose:

- record all card-level interactions
- support analytics and retry logic

Recommended shape:

```json
{
  "version": 1,
  "activeSessionId": "",
  "sessions": [
    {
      "sessionId": "2026-05-05-learning-01",
      "date": "2026-05-05",
      "sessionType": "learning",
      "status": "completed",
      "startedAt": "",
      "endedAt": "",
      "queueItemIds": ["A0001", "D0012"],
      "events": [
        {
          "itemId": "A0001",
          "phase": "front",
          "choice": "fuzzy",
          "answeredAt": "",
          "latencyMs": 3200,
          "round": 1
        },
        {
          "itemId": "A0001",
          "phase": "verification",
          "choice": "familiar",
          "answeredAt": "",
          "latencyMs": 1800,
          "round": 2
        }
      ],
      "summary": {
        "totalItems": 2,
        "familiar": 1,
        "fuzzy": 1,
        "unknown": 0,
        "repeatedItems": 1
      }
    }
  ]
}
```

Recommended `sessionType` values:

- `learning`
- `verification`
- `review`

Recommended `phase` values:

- `front`
- `back`
- `verification`
- `review`

## 5. today_story_queue.json

Purpose:

- describe the short text that should be generated after today's word session
- connect words to materials and output tasks

Recommended shape:

```json
{
  "version": 1,
  "date": "2026-05-05",
  "storyId": "story-2026-05-05-01",
  "storyType": "mixed",
  "status": "pending",
  "sourceItems": [
    {
      "itemId": "A0001",
      "role": "target_word"
    }
  ],
  "sourceMaterials": [
    {
      "materialId": "paper-musebench",
      "useMode": "concept_reference"
    }
  ],
  "constraints": {
    "minTargetCoverage": 0.9,
    "targetLengthWords": 160,
    "difficulty": "controlled",
    "allowDialogueTone": true
  },
  "outputs": {
    "storyText": "",
    "storyTranslationTask": "",
    "storySummaryPrompt": "",
    "storyAudioStatus": "pending"
  },
  "generatedAt": "",
  "completedAt": ""
}
```

Recommended `storyType` values:

- `daily`
- `academic`
- `dialogue`
- `mixed`

## 6. materials_index.json

Purpose:

- index real uploaded materials and generated materials
- support later reading frontend and story generation

Recommended shape:

```json
{
  "version": 1,
  "materials": [
    {
      "materialId": "paper-musebench",
      "title": "MuseBench",
      "materialType": "pdf",
      "category": "academic",
      "subCategory": "benchmark",
      "sourceMode": "uploaded",
      "sourcePath": "data/english/corpus/papers/pdf/P06_musebench.pdf",
      "sourceUrl": "https://openreview.net/forum?id=IsuJ4GBCoe",
      "status": "indexed",
      "tags": ["benchmark", "cultural-heritage"],
      "detectedItems": [],
      "generatedChildren": [],
      "createdAt": "",
      "updatedAt": ""
    }
  ],
  "updatedAt": ""
}
```

Recommended `materialType` values:

- `pdf`
- `docx`
- `txt`
- `md`
- `generated_story`
- `generated_dialogue`
- `generated_article`

## Selection Logic Suggestions

When generating a daily queue:

1. take `unknown` items first
2. then take `fuzzy` items
3. blend in due review items from `memory_schedule.json`
4. keep category balance:
   - academic and domain on study-heavy days
   - daily and dialogue items on lighter days
5. avoid too many hard `usage` items on the same day

## Recommended MVP Scope

For the first implementation of the word-learning frontend, only require:

- `learning_items.json`
- `daily_learning_queue.json`
- `memory_schedule.json`
- `word_learning_sessions.json`
- `today_story_queue.json`

`materials_index.json` can stay lightweight until the reading frontend is
implemented.
