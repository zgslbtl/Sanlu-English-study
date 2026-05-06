# Word Learning System Architecture

This document defines the data model and interaction logic for the later
"memorize words + study materials + spaced review" system.

## Goal

Turn the diagnosis results into:

1. daily learning queues
2. card-based memorization sessions
3. same-day verification
4. short text study
5. spaced repetition review

## Core Daily Flow

1. Pick `10-20` items from `unknown` and `fuzzy`
2. Start today's memorization session
3. Show card front:
   - word / phrase / usage
   - example sentence
   - buttons: `认识 / 模糊 / 不认识`
4. After choice, show card back:
   - gloss
   - explanation
   - sentence translation
   - morphology / root / derivative
   - button: `下一个`
5. Items marked `模糊 / 不认识` reappear during the same session
6. Once all items are marked stable, enter verification mode
7. Verification mode hides the example sentence
8. Finish today's word session
9. Generate today's short text page
10. Complete review tasks from the memory schedule

## Memory Stages

Each learning item should move across:

1. `new`
2. `learning`
3. `verifying`
4. `learned`
5. `reviewing`
6. `relearning`
7. `mastered`

## Daily Session Units

The system works on learning units, not just words.

Each unit can be:

- `word`
- `phrase`
- `usage`

## Spaced Review Milestones

Recommended default schedule:

- `D0`
- `D1`
- `D3`
- `D7`
- `D14`
- `D30`
- `D60`

## Future Frontend Pages

1. `today_words`
2. `today_verification`
3. `today_story`
4. `today_review`
5. `history`

## Immediate Phase-2 Data Files

- `learning_items.json`
- `daily_learning_queue.json`
- `memory_schedule.json`
- `word_learning_sessions.json`
- `today_story_queue.json`
- `materials_index.json`

## Story Generation Rule

After today's items are learned, the system should produce:

- one short text containing today's target items
- an input area for translation / summary / understanding
- later feedback on mistakes

The story source can mix:

- academic PDF extraction
- daily generated content
- dialogue-like generated content

## Review Rule

Review should include:

- item review
- old story review
- later listening review
- later dialogue practice

## Output Connection

In later stages, the system should connect learned items to:

- short writing prompts
- concept explanation prompts
- email-style prompts
- mini speaking prompts
