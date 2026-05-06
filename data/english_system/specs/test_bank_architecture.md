# English Test Bank Architecture

This document defines the formal layering plan for the long-range English
diagnosis bank.

## Target Size

- Total target range: `8,000-10,000` items
- Recommended first production target: `8,800`

## Design Principle

The bank should not be a flat list of words.

Each item belongs to one of:

1. `word`
2. `phrase`
3. `usage`

The bank should support:

- initial diagnosis
- targeted retest
- later daily memorization
- later material generation
- later spaced review

## Layering Plan

### Layer 1: Daily Core

- Size target: `2,600-3,000`
- Purpose:
  - daily conversation
  - living in Hong Kong
  - admin / housing / travel / shopping / classroom interaction

Suggested breakdown:

- high-frequency words: `1,500`
- daily phrases: `700`
- daily usage sentences: `400-800`

Subcategories:

- life
- housing
- travel
- shopping
- emotion
- conversation
- study-routine
- administration
- health
- society

### Layer 2: Academic Core

- Size target: `2,200-2,600`
- Purpose:
  - academic reading
  - academic listening
  - academic writing
  - argument structure

Suggested breakdown:

- academic words: `1,300`
- academic phrases: `500`
- academic usage sentences: `400-800`

Subcategories:

- reading
- writing
- argument
- analysis
- research
- research-writing
- grammar-in-context
- study-method

### Layer 3: Domain-Specific Core

- Size target: `1,800-2,200`
- Purpose:
  - AI
  - HCI
  - design research
  - education design
  - benchmark
  - cultural heritage

Suggested breakdown:

- domain words: `1,100`
- domain phrases: `350`
- domain usage sentences: `350-750`

Subcategories:

- AI
- HCI
- design
- benchmark
- dataset
- evaluation
- research-writing
- cultural-heritage

### Layer 4: Grammar / Usage / Pattern Layer

- Size target: `1,400-1,800`
- Purpose:
  - long sentence parsing
  - grammar in real context
  - recurring sentence patterns
  - output-oriented usage

Suggested breakdown:

- grammar-linked phrases: `400`
- usage sentences: `1,000-1,400`

Subcategories:

- grammar-in-context
- contrast
- cause-effect
- hedging
- explanation
- summary
- comparison
- output-pattern

## Recommended Overall Distribution

- `daily`: `3,000`
- `academic`: `2,500`
- `domain`: `2,000`
- `usage-heavy cross-layer items`: `1,300`

Total example target: `8,800`

## Production Priority

The bank should be expanded in this order:

1. daily high-frequency items
2. academic core items
3. domain core items
4. grammar / usage patterns
5. lower-frequency long-tail items

## Active Bank vs Full Bank

Do not surface the full bank equally at the beginning.

Use two levels:

### Full Bank

- Size: `8,000-10,000`
- Stored as the master inventory

### Active Diagnostic Bank

- Size: `1,500-2,500`
- Higher-frequency and higher-value items only
- Used for the first 1-2 weeks of diagnosis

## Item Requirements

Each bank item must contain:

- `id`
- `type`
- `text`
- `category`
- `subCategory`
- `difficulty`
- `glossZh`
- `example`
- `tags`
- `audioText`
- `source`
- `active`

Recommended future fields:

- `frequencyBand`
- `importanceScore`
- `interestTags`
- `sourceUrl`
- `relatedItems`
- `morphology`
- `derivatives`

## Difficulty Levels

- `basic`
- `intermediate`
- `advanced`

Recommended rough ratio:

- basic: `40%`
- intermediate: `40%`
- advanced: `20%`

## Usage Sentence Principles

Usage items should:

- represent real contexts
- reinforce output patterns
- include high-frequency structures
- connect to later daily materials

Usage items should not:

- be overly literary
- contain too many rare items at once
- be only dictionary-style example fragments

## Week-1 Diagnosis Recommendation

Even after the bank grows to `8,000-10,000`, the first week should not try to
fully exhaust it.

Recommended week-1 target:

- `1,500-2,000` active diagnostic items
- mixed diagnosis + targeted retest

The rest of the bank should enter later through:

- targeted retest
- material reading
- review mistakes
- long-tail expansion
