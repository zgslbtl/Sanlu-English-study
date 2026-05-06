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

## Daily Post-Diagnosis Material Workflow

During the current intensive week, the expected pattern is:

1. finish `10-20` rounds of diagnosis testing for the day
2. tell the agent: `今天测试完成了，帮我生成语料`
3. let the system generate the day's material set
4. download the recommended paper PDFs
5. place the PDFs into the fixed paper folder
6. use those files as the source for the next short text and learning tasks

### What Will Be Generated Each Day

After the daily diagnosis session, the default output should be:

- `2` core paper links
- `1` optional paper link
- `1` generated academic material
- `1` generated daily-life material
- `1` generated dialogue / email material
- `1` daily source manifest

The selection logic should prioritize:

- the day's `unknown` items
- the day's `fuzzy` items
- repeated weak items
- current research interests
- academic + daily-life balance

### Daily Folder Convention

Generated daily materials should be saved under:

```text
projects/english-learning/data/english/daily/YYYY-MM-DD/
```

Recommended generated filenames:

- `source_manifest.md`
- `generated_academic_01.md`
- `generated_daily_01.md`
- `generated_dialogue_01.md`

If needed, additional files can extend this pattern:

- `generated_academic_02.md`
- `generated_daily_02.md`

### Real Paper Storage

Downloaded paper PDFs should be stored under:

```text
projects/english-learning/data/english/corpus/papers/pdf/
```

Recommended naming pattern:

- `P09_short_title.pdf`
- `P10_short_title.pdf`

Matching paper cards should live under:

```text
projects/english-learning/data/english/corpus/papers/
```

Recommended card naming:

- `P09.md`
- `P10.md`

Each paper card should record:

- title
- source link
- local PDF path
- why it was selected
- which weak items it helps cover

### Source Manifest Role

`source_manifest.md` is the daily routing file.

It should summarize:

1. today's real papers
2. today's generated materials
3. which weak items each source covers
4. which files the short text should prioritize

### Short Text Generation Rule

From this point on, the daily short text should not be generated only from a flat word list.

It should instead prioritize:

1. the day's generated materials
2. the day's selected real papers
3. the day's `unknown / fuzzy` items
4. recent review items

That keeps the short text closer to real study inputs instead of isolated vocabulary prompts.

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
