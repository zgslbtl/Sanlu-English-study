# English Diagnosis System

This directory stores the stage-1 data templates for the personal English
diagnosis system.

## Goal

Stage 1 focuses on:

1. A structured test bank
2. A personal lexicon generated from test results
3. Session history
4. Diagnostics summaries
5. Review candidates for later study planning

## Structure

```text
projects/english-learning/data/english_system/
  specs/
    test_bank_architecture.md
    word_learning_system.md
  test_bank/
    bank_seed_v1.json
    bank_daily.json
    bank_academic.json
    bank_domain.json
    bank_usage.json
  learner/
    lexicon.json
    profile.json
    sessions.json
    diagnostics.json
    review_candidates.json
    learning_items.json
    daily_learning_queue.json
    memory_schedule.json
    word_learning_sessions.json
    today_story_queue.json
    materials_index.json
```

## Notes

- `bank_seed_v1.json` is the combined starter bank.
- `bank_daily.json`, `bank_academic.json`, `bank_domain.json`, and
  `bank_usage.json` are category-specific slices that can grow over time.
- `lexicon.json` is the personal vocabulary book.
- `sessions.json` stores each diagnostic session.
- `diagnostics.json` stores aggregated stats for the frontend.
- `review_candidates.json` is the handoff file for stage 2 daily planning.
- `specs/` stores formal architecture docs for the larger bank and the later
  memorization system.
- `specs/word_learning_data_model.md` defines the field-level data model for
  the later card-based memorization workflow.
- `learning_items.json` will hold enriched item-level learning states.
- `daily_learning_queue.json` will hold daily new/review selections.
- `memory_schedule.json` will hold spaced-repetition timestamps and steps.
- `word_learning_sessions.json` will store card-based learning sessions.
- `today_story_queue.json` will hold the daily short-text generation request.
- `materials_index.json` will index uploaded and generated study materials.

## Current Status

- The diagnosis bank has now been expanded to a first large-use batch.
- The new phase-2 learner files are templates for the memorization system.
- The next implementation step can connect these learner files to a dedicated
  word-learning frontend.
