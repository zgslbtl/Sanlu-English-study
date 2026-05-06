# Sanlu English Study

An independent English learning project for diagnosis, vocabulary training, short-text input, and weekly writing practice.

This project was split out from `sanlu-daily-agent` so the English workflow can evolve as its own system while still staying loosely connected to daily planning.

## What It Does

This project currently supports:

- English diagnosis with a large mixed bank of `word / phrase / usage`
- Daily word learning, verification, and review
- Short daily reading/story generation based on current target items
- Weekly writing prompts with feedback
- Corpus planning for PolyU RLSA preparation
- Local data storage for vocabulary state, queues, and learning history

## Current Learning Flow

The current frontend flow is:

1. Diagnosis
2. Daily word learning
3. Daily short text
4. Weekly writing

The working entrypoint is:

```text
http://127.0.0.1:4320/
```

## Run Locally

From this project folder:

```bash
node scripts/english_diagnosis_server.mjs
```

Or with the local npm script:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4320/
```

## Project Structure

```text
projects/english-learning/
  data/
    english/
    english_system/
  scripts/
    english_diagnosis_server.mjs
    build_english_test_bank.mjs
  web/
    english_diagnosis.html
    english_word_learning.html
    english_today_story.html
    english_weekly_writing.html
  outputs/
```

### Main Directories

- `data/english/`
  Fixed corpus, paper cards, RLSA preparation plan, and archived daily English materials.

- `data/english_system/`
  Diagnosis bank, learning-state files, spaced-review state, story queue, and writing data.

- `scripts/`
  Local server and bank-building scripts.

- `web/`
  Frontend pages for diagnosis, learning, story, and writing.

- `outputs/`
  Generated daily English pack and other runtime outputs.

## Git Tracking Strategy

This repository intentionally tracks the stable project structure, but not the noisy personal runtime state.

Tracked:

- frontend pages and scripts
- test-bank structure and architecture docs
- fixed corpus descriptions and paper cards
- RLSA planning files

Ignored:

- `outputs/`
- `data/english/daily/`
- `data/english_system/learner/`
- frequently changing personal vocabulary files
- local PDFs
- macOS system files

This keeps the repository focused on the system itself rather than daily personal study exhaust.

## Relationship To `sanlu-daily-agent`

The parent project only needs to do two things:

1. summarize the day's English task arrangement
2. provide the English frontend link

Detailed English execution, data, and UI now live here as a standalone subproject.

## Current Scope

This project is designed for local personal use first.

Current strengths:

- clear local workflow
- persistent diagnosis and learning state
- integrated daily study loop
- lightweight local frontend

Current limitations:

- GitHub sync is manual
- authentication and cloud storage are not part of the app
- some generated content is still heuristic rather than model-driven
- the system is optimized for one learner rather than multiple users

## Roadmap Ideas

- stronger corpus-to-task generation
- better listening / shadowing integration
- richer writing feedback
- cleaner dashboard for today's priorities
- optional sync/export workflows

## Notes

If this project is used together with the daily planning project, the recommended pattern is:

- ask the daily agent for today's plan
- jump into this English project for execution
- report completion back to the daily agent afterward
