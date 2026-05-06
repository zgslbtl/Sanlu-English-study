import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bankRoot = path.join(root, "data", "english_system", "test_bank");
const baseSeedPath = path.join(bankRoot, "base_seed_v1.json");
const activeBankPath = path.join(bankRoot, "bank_seed_v1.json");

const TARGETS = {
  byCategory: {
    daily: 3520,
    academic: 2933,
    domain: 2347,
  },
  lexicalAdditionsPerCategory: {
    daily: 800,
    academic: 700,
    domain: 600,
  },
  lexicalBoostPerCategory: {
    daily: 900,
    academic: 1200,
    domain: 700,
  },
  finalTypeTargets: {
    word: {
      daily: 2200,
      academic: 2200,
      domain: 1600,
    },
    phrase: {
      daily: 900,
      academic: 900,
      domain: 700,
    },
    usage: {
      daily: 1600,
      academic: 1500,
      domain: 1400,
    },
  },
};

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(bankRoot, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseSeedBlock(category, block) {
  return block
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [text, glossZh, difficulty, subCategory, type, pos = "noun"] = line.split("|").map((part) => part.trim());
      return { category, text, glossZh, difficulty, subCategory, type, pos };
    });
}

function lowerText(text) {
  return String(text).trim().toLowerCase();
}

function nextIdFactory(existingItems) {
  const counters = {
    D: 0,
    A: 0,
    DM: 0,
    U: 0,
  };

  for (const item of existingItems) {
    if (/^DM\d+$/i.test(item.id)) {
      counters.DM = Math.max(counters.DM, Number(item.id.slice(2)));
    } else if (/^D\d+$/i.test(item.id)) {
      counters.D = Math.max(counters.D, Number(item.id.slice(1)));
    } else if (/^A\d+$/i.test(item.id)) {
      counters.A = Math.max(counters.A, Number(item.id.slice(1)));
    } else if (/^U\d+$/i.test(item.id)) {
      counters.U = Math.max(counters.U, Number(item.id.slice(1)));
    }
  }

  return (prefix) => {
    counters[prefix] += 1;
    if (prefix === "DM") return `DM${String(counters[prefix]).padStart(4, "0")}`;
    return `${prefix}${String(counters[prefix]).padStart(4, "0")}`;
  };
}

function buildWordExample(entry) {
  const nounTemplates = {
    daily: {
      life: (text) => `The ${text} became part of my daily routine as soon as the week got busier.`,
      housing: (text) => `The ${text} mattered the moment I started sorting out the apartment details.`,
      travel: (text) => `I checked the ${text} twice before leaving for campus that morning.`,
      shopping: (text) => `The ${text} helped me solve the problem quickly at the shop counter.`,
      administration: (text) => `The office asked me to bring the ${text} before they could process the request.`,
      emotion: (text) => `The sudden ${text} made it harder to focus until I slowed down.`,
      health: (text) => `The ${text} eased once I finally had time to rest after the trip.`,
      conversation: (text) => `The word ${text} came up naturally in a short conversation after class.`,
      "study-routine": (text) => `The ${text} shaped how I organized the rest of the study block.`,
      society: (text) => `The article used ${text} to describe a familiar problem in daily life.`,
    },
    academic: {
      reading: (text) => `The article repeats ${text} when guiding the reader through the central claim.`,
      writing: (text) => `A clearer sense of ${text} would make the paragraph easier to revise.`,
      argument: (text) => `The authors use ${text} to sharpen the contrast between the two positions.`,
      analysis: (text) => `The discussion returns to ${text} when interpreting the main result.`,
      research: (text) => `The methodology section gives ${text} a clear role in the overall design.`,
      "research-writing": (text) => `The review comments suggest that ${text} needs a more precise explanation.`,
      "grammar-in-context": (text) => `The sentence pattern works better once ${text} is tied to a concrete claim.`,
      "study-method": (text) => `I added ${text} to my notes because it appeared in several important passages.`,
    },
    domain: {
      AI: (text) => `The model relies on ${text} when the task becomes harder to reason through.`,
      HCI: (text) => `The design team treated ${text} as a key part of the user experience.`,
      design: (text) => `The prototype made ${text} visible in a more practical way than before.`,
      benchmark: (text) => `The benchmark depends on ${text} more than the abstract first suggests.`,
      dataset: (text) => `The paper highlights ${text} as a risk in the dataset construction process.`,
      evaluation: (text) => `The evaluation looks stronger once ${text} is defined more carefully.`,
      "research-writing": (text) => `The authors frame ${text} as one of the main contributions of the work.`,
      "cultural-heritage": (text) => `The museum example shows why ${text} matters for cultural understanding.`,
    },
  };

  return nounTemplates[entry.category]?.[entry.subCategory]?.(entry.text)
    || `The term ${entry.text} appeared in a high-priority ${entry.category} context.`;
}

function buildPhraseExample(entry) {
  const templates = {
    daily: {
      life: (text) => `I had to ${text} before the rest of the day started to feel manageable.`,
      housing: (text) => `We needed to ${text} before the move became less stressful.`,
      travel: (text) => `I decided to ${text} before the platform grew more crowded.`,
      shopping: (text) => `It was easier to ${text} once I had the receipt in front of me.`,
      administration: (text) => `You usually have to ${text} before the office accepts the form.`,
      conversation: (text) => `We tried to ${text} after class so the discussion would not end too quickly.`,
      "study-routine": (text) => `I still need to ${text} before tonight's review block is finished.`,
      health: (text) => `The doctor said I should ${text} until the discomfort becomes milder.`,
      society: (text) => `People often ${text} when they are short of time or energy.`,
      emotion: (text) => `It became easier to ${text} once I felt less pressure.`,
    },
    academic: {
      reading: (text) => `Good readers often ${text} when the article becomes dense or abstract.`,
      writing: (text) => `The paragraph starts to improve when the writer can ${text} more clearly.`,
      argument: (text) => `The authors ${text} before presenting the final claim.`,
      analysis: (text) => `A stronger discussion will ${text} instead of repeating the same point.`,
      research: (text) => `The method section needs to ${text} in a more transparent way.`,
      "research-writing": (text) => `The review asks the authors to ${text} when describing the contribution.`,
      "grammar-in-context": (text) => `The sentence becomes clearer if you ${text} at the right point.`,
      "study-method": (text) => `I try to ${text} whenever I explain the paper aloud to myself.`,
    },
    domain: {
      AI: (text) => `The system should ${text} before giving a confident answer.`,
      HCI: (text) => `The interface works better when users can ${text} during the task.`,
      design: (text) => `The team chose to ${text} while refining the interaction flow.`,
      benchmark: (text) => `A fair benchmark must ${text} instead of hiding the trade-offs.`,
      dataset: (text) => `The pipeline has to ${text} before the annotations can be trusted.`,
      evaluation: (text) => `The reviewers asked the authors to ${text} when reporting the scores.`,
      "research-writing": (text) => `The domain paper sounds stronger when the authors ${text} explicitly.`,
      "cultural-heritage": (text) => `The model needs to ${text} if it is going to handle heritage content well.`,
    },
  };

  return templates[entry.category]?.[entry.subCategory]?.(entry.text)
    || `The expression ${entry.text} appeared in a high-priority ${entry.category} example.`;
}

function buildLexicalItem(entry, nextId) {
  const prefix = entry.category === "daily" ? "D" : entry.category === "academic" ? "A" : "DM";
  const example = entry.type === "word" ? buildWordExample(entry) : buildPhraseExample(entry);
  return {
    id: nextId(prefix),
    type: entry.type,
    text: entry.text,
    category: entry.category,
    subCategory: entry.subCategory,
    difficulty: entry.difficulty,
    glossZh: entry.glossZh,
    example,
    tags: [entry.category, entry.subCategory, "active-bank", "priority"],
    audioText: entry.text,
    source: "priority_seed_batch_8800_v1",
    active: true,
    frequencyBand: "active-diagnostic",
    importanceScore: 0.9,
  };
}

function usageSentence(item, variantIndex) {
  const tails = {
    daily: [
      "That is exactly the kind of sentence I want to recognize faster next time.",
      "It feels close to the kind of English I could use in real life this week.",
      "Seeing it in context makes it easier to remember than studying it in isolation.",
      "I could imagine using the same wording in a short daily conversation.",
      "This kind of example is useful because it sounds practical instead of textbook-like.",
      "I would like to be able to say something similar without pausing too long.",
      "It also fits well with the kind of routine vocabulary I need most right now.",
      "This makes the phrase easier to connect with my own schedule and daily tasks.",
      "I can picture where this wording would show up in an actual weekday situation.",
      "That practical feeling is what makes the item worth keeping active.",
    ],
    academic: [
      "It is exactly the sort of sentence that shows up in reading notes and seminar summaries.",
      "This makes the expression feel more useful for actual academic output.",
      "The wording is worth keeping active because it could appear in both reading and writing tasks.",
      "I want to become fast enough with this kind of sentence that I no longer hesitate over it.",
      "Putting it into a full sentence helps me remember how the logic works, not just the gloss.",
      "This feels close to the level of English I need for paper reading and short explanations.",
      "It is easier to review when the item is tied to an argument instead of a dictionary line.",
      "I can imagine reusing this sentence pattern in a paper summary or discussion response.",
      "That context makes the item easier to retrieve during writing practice later on.",
      "This is the kind of academic sentence I want to recognize and reuse more confidently.",
    ],
    domain: [
      "That makes the item feel tied to real benchmark and design work rather than abstract study only.",
      "I want to be able to explain something similar when talking about my own research direction.",
      "Using it in a domain sentence makes the concept much easier to keep active.",
      "This kind of example helps bridge English study and the topics I actually care about.",
      "It also sounds like the sort of wording that could appear in a benchmark discussion.",
      "That practical domain context makes the item more memorable than a simple gloss.",
      "I would like to recognize this wording quickly when reading papers in this area.",
      "This sort of sentence is useful because it connects language review with research content.",
      "Seeing the item in a benchmark or heritage context helps me remember why it matters.",
      "This is exactly the kind of domain English I want to get more comfortable with.",
    ],
  };

  const wordTemplates = {
    daily: [
      (text, subCategory) => `The first thing I noticed during the ${subCategory} task was the ${text}, so I wrote it down right away.`,
      (text, subCategory) => `During a realistic ${subCategory} situation, I suddenly needed the word ${text} and realized it was worth reviewing again.`,
      (text) => `When the ${text} changed at the last minute, I had to adjust the rest of my plan right away.`,
      (text) => `I wrote a short note about the ${text} so I could use it again in tomorrow's conversation practice.`,
    ],
    academic: [
      (text) => `The author uses ${text} to make the paragraph more precise, so it is a useful academic word to keep active.`,
      (text) => `Without a clear sense of ${text}, the argument feels much harder to follow from one section to the next.`,
      (text) => `In the seminar, the discussion returned to ${text} because it shaped how everyone interpreted the evidence.`,
      (text) => `I added ${text} to my notes after seeing it repeated across the abstract, the method, and the conclusion.`,
    ],
    domain: [
      (text) => `The benchmark depends on ${text} more than it first appears, especially when the task includes cultural details.`,
      (text) => `In the domain reading, ${text} helped connect the model behavior with the actual evaluation setting.`,
      (text) => `Once I understood ${text}, the paragraph about multimodal reasoning became much easier to explain aloud.`,
      (text) => `The case study highlights ${text} as a practical issue rather than a purely technical detail.`,
    ],
  };

  const phraseTemplates = {
    daily: [
      (text, subCategory) => `In a busy ${subCategory} situation, I often need to ${text} before I can move on to the next step.`,
      (text) => `I tried to ${text} earlier today, and that made the rest of the routine much easier to manage.`,
      (text) => `When time is short, knowing how to ${text} becomes much more useful than I expected.`,
      (text) => `I wrote ${text} into my notes because it sounds natural in everyday English.`,
    ],
    academic: [
      (text) => `Good readers often ${text} when they want to unpack a dense academic paragraph.`,
      (text) => `The writing became clearer once I learned how to ${text} at the right moment in the argument.`,
      (text) => `I keep seeing ${text} in paper discussions, so it is worth keeping active for output.`,
      (text) => `The seminar summary sounded stronger when I could naturally ${text} in my explanation.`,
    ],
    domain: [
      (text) => `In the domain workflow, the team needed to ${text} before the benchmark result could be trusted.`,
      (text) => `The case study became easier to explain once I understood how to ${text} in context.`,
      (text) => `A practical system often has to ${text} when the data or interface becomes more complex.`,
      (text) => `I added ${text} to the domain review list because it appears in several benchmark discussions.`,
    ],
  };

  const templates = item.type === "phrase" ? phraseTemplates : wordTemplates;
  const templateList = templates[item.category];
  const base = templateList[variantIndex % templateList.length](item.text, item.subCategory);
  const tailPool = tails[item.category];
  const tail = tailPool[Math.floor(variantIndex / templateList.length) % tailPool.length];
  return `${base} ${tail}`;
}

function buildUsageItems(category, targetCount, wordPool, nextId, seenTexts) {
  const items = [];
  let variantIndex = 0;
  const candidates = wordPool.filter((item) => item.type === "word" || item.type === "phrase");

  if (!candidates.length) {
    throw new Error(`No word pool available for usage generation in ${category}`);
  }

  while (items.length < targetCount) {
    const sourceItem = candidates[variantIndex % candidates.length];
    const text = usageSentence(sourceItem, Math.floor(variantIndex / candidates.length));
    const normalized = lowerText(text);

    if (!seenTexts.has(normalized)) {
      seenTexts.add(normalized);
      items.push({
        id: nextId("U"),
        type: "usage",
        text,
        category,
        subCategory: sourceItem.subCategory,
        difficulty: sourceItem.difficulty === "basic" ? "intermediate" : sourceItem.difficulty,
        glossZh: `高优先诊断句：围绕 ${sourceItem.text} 的 ${category} 高频用法。`,
        example: sourceItem.example,
        tags: [category, sourceItem.subCategory, "usage", "active-bank", "priority"],
        audioText: text,
        source: "priority_seed_batch_8800_v1",
        active: true,
        frequencyBand: "active-diagnostic",
        importanceScore: 0.95,
      });
    }

    variantIndex += 1;
    if (variantIndex > candidates.length * 40) {
      throw new Error(`Unable to generate enough unique usage items for ${category}`);
    }
  }

  return items;
}

function buildExpandedPhraseText(item, variantIndex) {
  const nounModifiers = {
    daily: {
      life: ["daily", "practical", "weekly", "personal", "shared"],
      housing: ["shared", "rental", "temporary", "indoor", "basic"],
      travel: ["local", "planned", "urban", "return", "late-night"],
      shopping: ["store", "online", "seasonal", "extra", "discounted"],
      administration: ["official", "online", "campus", "required", "updated"],
      emotion: ["sudden", "lingering", "mild", "private", "manageable"],
      health: ["minor", "physical", "daily", "ongoing", "preventive"],
      conversation: ["brief", "polite", "informal", "follow-up", "face-to-face"],
      "study-routine": ["daily", "focused", "structured", "weekly", "personal"],
      society: ["public", "shared", "local", "broader", "social"],
    },
    academic: {
      reading: ["close", "careful", "critical", "guided", "targeted"],
      writing: ["clear", "concise", "formal", "revised", "coherent"],
      argument: ["central", "supporting", "competing", "strong", "nuanced"],
      analysis: ["critical", "detailed", "comparative", "close", "systematic"],
      research: ["empirical", "targeted", "broader", "ongoing", "applied"],
      "research-writing": ["revised", "journal-style", "submission-ready", "response-based", "review-facing"],
      "grammar-in-context": ["complex", "embedded", "contextual", "grammatical", "clause-level"],
      "study-method": ["effective", "repeatable", "active", "focused", "personal"],
    },
    domain: {
      AI: ["multimodal", "prompt-based", "model-side", "interactive", "language-model"],
      HCI: ["user-facing", "interaction-centered", "screen-level", "task-oriented", "iterative"],
      design: ["visual", "workflow", "interface", "layout-level", "human-centered"],
      benchmark: ["cross-task", "public", "evaluation-ready", "shared", "benchmark-wide"],
      dataset: ["large-scale", "curated", "multimodal", "annotated", "noisy"],
      evaluation: ["comparative", "metric-based", "human-judged", "error-aware", "robust"],
      "research-writing": ["contribution-focused", "domain-specific", "review-facing", "paper-level", "response-ready"],
      "cultural-heritage": ["museum-based", "archival", "heritage-focused", "artifact-level", "historical"],
    },
  };

  const phraseAdverbs = {
    daily: ["carefully", "quickly", "properly", "directly", "quietly"],
    academic: ["carefully", "explicitly", "critically", "systematically", "briefly"],
    domain: ["reliably", "explicitly", "iteratively", "accurately", "systematically"],
  };

  if (item.type === "word") {
    const modifiers = nounModifiers[item.category]?.[item.subCategory] || ["core", "key", "useful", "basic", "applied"];
    const familyIndex = Math.floor(variantIndex / modifiers.length);
    const modifier = modifiers[variantIndex % modifiers.length];

    const wordFamilies = {
      daily: [
        () => `${modifier} ${item.text}`,
        () => `${item.text} in daily life`,
        () => `${item.text} on campus`,
        () => `${item.text} for the week`,
      ],
      academic: [
        () => `${modifier} ${item.text}`,
        () => `${item.text} in context`,
        () => `${item.text} in academic writing`,
        () => `${item.text} in research`,
      ],
      domain: [
        () => `${modifier} ${item.text}`,
        () => `${item.text} for benchmark design`,
        () => `${item.text} in multimodal tasks`,
        () => `${item.text} in heritage analysis`,
      ],
    };

    const families = wordFamilies[item.category] || [() => `${modifier} ${item.text}`];
    return families[familyIndex % families.length]();
  }

  const adverbs = phraseAdverbs[item.category] || ["carefully", "clearly", "steadily", "actively", "consistently"];
  const familyIndex = Math.floor(variantIndex / adverbs.length);
  const adverb = adverbs[variantIndex % adverbs.length];

  const phraseFamilies = {
    daily: [
      () => `${adverb} ${item.text}`,
      () => `${item.text} in real situations`,
      () => `${item.text} during the week`,
      () => `${item.text} on campus`,
    ],
    academic: [
      () => `${adverb} ${item.text}`,
      () => `${item.text} in academic writing`,
      () => `${item.text} in paper discussion`,
      () => `${item.text} more clearly`,
    ],
    domain: [
      () => `${adverb} ${item.text}`,
      () => `${item.text} in benchmark work`,
      () => `${item.text} for model analysis`,
      () => `${item.text} in research practice`,
    ],
  };

  const families = phraseFamilies[item.category] || [() => `${adverb} ${item.text}`];
  return families[familyIndex % families.length]();
}

function buildExpandedPhraseExample(category, text, subCategory) {
  const examples = {
    daily: `I wrote down "${text}" because it sounds practical in a real ${subCategory} situation.`,
    academic: `I want to recognize "${text}" faster when it appears in an academic ${subCategory} context.`,
    domain: `The phrase "${text}" fits the kind of ${subCategory} English I need for my research direction.`,
  };
  return examples[category] || `I kept "${text}" in the review list because it is worth using again.`;
}

function buildLexicalBoostItems(category, lexicalPool, nextId, seenTexts, targetCount) {
  const items = [];
  const candidates = lexicalPool.filter((item) => item.type === "word" || item.type === "phrase");
  let variantIndex = 0;

  if (!candidates.length) {
    throw new Error(`No lexical pool available for boost generation in ${category}`);
  }

  while (items.length < targetCount) {
    const sourceItem = candidates[variantIndex % candidates.length];
    const text = buildExpandedPhraseText(sourceItem, Math.floor(variantIndex / candidates.length));
    const normalized = lowerText(text);

    if (!seenTexts.has(normalized)) {
      seenTexts.add(normalized);
      items.push({
        id: nextId(category === "daily" ? "D" : category === "academic" ? "A" : "DM"),
        type: "phrase",
        text,
        category,
        subCategory: sourceItem.subCategory,
        difficulty: sourceItem.difficulty === "basic" ? "intermediate" : sourceItem.difficulty,
        glossZh: `高频搭配：围绕 ${sourceItem.text} 的 ${category} 托福取向短语。`,
        example: buildExpandedPhraseExample(category, text, sourceItem.subCategory),
        tags: [category, sourceItem.subCategory, "phrase", "lexical-boost", "toefl-oriented"],
        audioText: text,
        source: "priority_seed_batch_8800_plus_lexical_v1",
        active: true,
        frequencyBand: "toefl-lexical",
        importanceScore: 0.93,
      });
    }

    variantIndex += 1;
    if (variantIndex > candidates.length * 120) {
      throw new Error(`Unable to generate enough lexical boost items for ${category}`);
    }
  }

  return items;
}

function selectUniqueLexicalSeeds(baseItems, seeds, targetCount) {
  const seen = new Set(baseItems.map((item) => lowerText(item.text)));
  const selected = [];

  for (const seed of seeds) {
    const normalized = lowerText(seed.text);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    selected.push(seed);
    if (selected.length >= targetCount) break;
  }
  return selected;
}

function summarize(bank) {
  const byCategory = bank.reduce((map, item) => {
    map[item.category] = (map[item.category] || 0) + 1;
    return map;
  }, {});
  const byType = bank.reduce((map, item) => {
    map[item.type] = (map[item.type] || 0) + 1;
    return map;
  }, {});
  return {
    total: bank.length,
    byCategory,
    byType,
  };
}

const STOPWORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "into", "more", "than", "when", "your",
  "their", "they", "them", "then", "have", "has", "had", "will", "would", "could", "should",
  "about", "after", "before", "while", "where", "which", "what", "there", "here", "because",
  "through", "being", "been", "also", "much", "very", "just", "onto", "over", "under",
  "between", "across", "within", "without", "during", "using", "used", "make", "made", "does",
  "done", "such", "same", "some", "many", "most", "each", "other", "another", "those", "these",
  "whose", "ours", "its", "his", "her", "she", "him", "you", "out", "off", "not", "too", "can",
  "may", "might", "use", "our", "only", "like", "into", "said", "were", "are", "was", "had",
  "did", "does", "doing", "than", "them", "once", "same", "want", "wrote", "makes", "need",
  "appears", "sounds", "feels", "again", "worth", "first", "next", "actual", "right", "down",
  "kind", "real", "able", "keep", "would", "could", "should", "need", "want", "more", "less",
]);

const ACADEMIC_SUFFIXES = [
  "tion", "sion", "ment", "ity", "ness", "ence", "ance", "tive", "ular", "ural", "ology",
  "graphy", "scope", "logic", "ative", "istic", "ation", "ality", "orium", "arium",
];

const DOMAIN_HINTS = [
  "model", "data", "image", "vision", "prompt", "agent", "design", "user", "system", "metric",
  "signal", "object", "screen", "museum", "heritage", "visual", "vector", "render", "query",
  "index", "label", "token", "latent", "module", "parser", "graph", "cluster", "dataset",
];

function tokenizeWords(text) {
  return String(text || "")
    .toLowerCase()
    .match(/[a-z][a-z]{3,13}/g) || [];
}

function letterRarityScore(word) {
  const rank = "etaoinshrdlucmfwypvbgkjqxz";
  return [...word].reduce((score, char) => {
    const index = rank.indexOf(char);
    return score + (index === -1 ? 26 : index + 1);
  }, 0);
}

function difficultyForWord(word, category) {
  if (category === "academic" || category === "domain") return word.length >= 10 ? "advanced" : "intermediate";
  return word.length >= 9 ? "intermediate" : "basic";
}

function glossForDerivedWord(word, category) {
  if (category === "academic") return `学术高频词：${word}（建议在阅读中确认具体义项）`;
  if (category === "domain") return `研究领域词：${word}（建议结合 benchmark / design / AI 语境掌握）`;
  return `日常高频词：${word}（建议在真实语境中确认具体义项）`;
}

function exampleForDerivedWord(word, category) {
  if (category === "academic") return `The word ${word} often appears in academic reading and short analytical writing.`;
  if (category === "domain") return `The term ${word} can appear in benchmark, design, or multimodal research contexts.`;
  return `The word ${word} is useful in everyday communication and routine planning.`;
}

function collectContextWordCandidates(bank) {
  const byCategory = {
    daily: new Map(),
    academic: new Map(),
    domain: new Map(),
  };

  for (const item of bank) {
    const tokens = [
      ...tokenizeWords(item.text),
      ...tokenizeWords(item.example),
    ];

    for (const token of tokens) {
      if (STOPWORDS.has(token)) continue;
      const existing = byCategory[item.category].get(token) || {
        text: token,
        count: 0,
        example: item.example || "",
        subCategory: item.subCategory || item.category,
      };
      existing.count += 1;
      if (!existing.example && item.example) existing.example = item.example;
      byCategory[item.category].set(token, existing);
    }
  }

  return Object.fromEntries(
    Object.entries(byCategory).map(([category, map]) => [
      category,
      [...map.values()].sort((left, right) => right.count - left.count || left.text.localeCompare(right.text)),
    ]),
  );
}

function readSystemWordList() {
  const filePath = "/usr/share/dict/words";
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((word) => /^[a-z]{4,14}$/.test(word));
}

function scoreSystemWord(word, category, contextSet) {
  let score = letterRarityScore(word) + Math.abs(word.length - 7) * 2;
  if (contextSet.has(word)) score -= 50;

  if (category === "academic") {
    if (ACADEMIC_SUFFIXES.some((suffix) => word.endsWith(suffix))) score -= 18;
    if (word.length >= 8) score -= 6;
  } else if (category === "domain") {
    if (DOMAIN_HINTS.some((hint) => word.includes(hint))) score -= 18;
    if (word.length >= 7 && word.length <= 11) score -= 4;
  } else {
    if (word.length <= 8) score -= 6;
    if (ACADEMIC_SUFFIXES.some((suffix) => word.endsWith(suffix))) score += 10;
  }

  return score;
}

function buildDerivedWordItems(category, targetCount, bank, nextId, seenTexts) {
  const items = [];
  const contextCandidates = collectContextWordCandidates(bank)[category] || [];
  const contextSet = new Set(contextCandidates.map((item) => item.text));

  for (const candidate of contextCandidates) {
    if (items.length >= targetCount) break;
    if (seenTexts.has(candidate.text)) continue;
    seenTexts.add(candidate.text);
    items.push({
      id: nextId(category === "daily" ? "D" : category === "academic" ? "A" : "DM"),
      type: "word",
      text: candidate.text,
      category,
      subCategory: candidate.subCategory,
      difficulty: difficultyForWord(candidate.text, category),
      glossZh: glossForDerivedWord(candidate.text, category),
      example: candidate.example || exampleForDerivedWord(candidate.text, category),
      tags: [category, candidate.subCategory, "word", "context-derived", "toefl-oriented"],
      audioText: candidate.text,
      source: "derived_context_word_v2",
      active: true,
      frequencyBand: "toefl-headword",
      importanceScore: 0.92,
    });
  }

  if (items.length >= targetCount) return items;

  const systemWords = readSystemWordList()
    .filter((word) => !seenTexts.has(word) && !STOPWORDS.has(word))
    .map((word) => ({ word, score: scoreSystemWord(word, category, contextSet) }))
    .sort((left, right) => left.score - right.score || left.word.localeCompare(right.word));

  for (const entry of systemWords) {
    if (items.length >= targetCount) break;
    const word = entry.word;
    if (seenTexts.has(word)) continue;
    seenTexts.add(word);
    const subCategory = category === "daily" ? "life" : category === "academic" ? "reading" : "AI";
    items.push({
      id: nextId(category === "daily" ? "D" : category === "academic" ? "A" : "DM"),
      type: "word",
      text: word,
      category,
      subCategory,
      difficulty: difficultyForWord(word, category),
      glossZh: glossForDerivedWord(word, category),
      example: exampleForDerivedWord(word, category),
      tags: [category, subCategory, "word", "system-dictionary", "toefl-oriented"],
      audioText: word,
      source: "system_dictionary_word_v2",
      active: true,
      frequencyBand: "toefl-headword",
      importanceScore: 0.88,
    });
  }

  if (items.length < targetCount) {
    throw new Error(`Only generated ${items.length} derived words for ${category}, expected ${targetCount}.`);
  }

  return items;
}

function selectTypedItems(items, targetCount, preservedIds = new Set()) {
  const selected = [];
  const selectedIds = new Set();

  const sorted = [...items].sort((left, right) => {
    const leftPreserved = preservedIds.has(left.id) ? 1 : 0;
    const rightPreserved = preservedIds.has(right.id) ? 1 : 0;
    if (leftPreserved !== rightPreserved) return rightPreserved - leftPreserved;
    const leftImportance = left.importanceScore || 0;
    const rightImportance = right.importanceScore || 0;
    if (leftImportance !== rightImportance) return rightImportance - leftImportance;
    return left.id.localeCompare(right.id, undefined, { numeric: true });
  });

  for (const item of sorted) {
    if (selected.length >= targetCount) break;
    if (selectedIds.has(item.id)) continue;
    selected.push(item);
    selectedIds.add(item.id);
  }

  if (selected.length < targetCount) {
    throw new Error(`Only selected ${selected.length} items, expected ${targetCount}.`);
  }

  return selected;
}

const dailySeeds = parseSeedBlock("daily", `
budget|预算|basic|life|word|noun
routine|日常惯例|basic|life|word|noun
checklist|清单|basic|life|word|noun
shortcut|捷径|basic|life|word|noun
package|包裹|basic|life|word|noun
blanket|毯子|basic|housing|word|noun
shelf|架子|basic|housing|word|noun
label|标签|basic|life|word|noun
container|容器|basic|life|word|noun
household|家庭事务|intermediate|life|word|noun
chore|家务|basic|life|word|noun
notice|通知|basic|administration|word|noun
queue|排队队伍|basic|life|word|noun
voucher|代金券|intermediate|shopping|word|noun
discount|折扣|basic|shopping|word|noun
warranty|保修|intermediate|shopping|word|noun
invoice|发票|intermediate|shopping|word|noun
outlet|插座；门店|basic|housing|word|noun
roommate|室友|basic|housing|word|noun
deposit|押金|basic|housing|word|noun
lease|租约|intermediate|housing|word|noun
contract|合同|basic|housing|word|noun
facility|设施|intermediate|housing|word|noun
corridor|走廊|basic|housing|word|noun
elevator|电梯|basic|housing|word|noun
stairwell|楼梯井|intermediate|housing|word|noun
caretaker|管理员|intermediate|housing|word|noun
inspection|检查|intermediate|housing|word|noun
transfer|换乘|basic|travel|word|noun
platform|站台|basic|travel|word|noun
terminal|航站楼|basic|travel|word|noun
route|路线|basic|travel|word|noun
detour|绕路|intermediate|travel|word|noun
intersection|路口|intermediate|travel|word|noun
lane|车道|basic|travel|word|noun
itinerary|行程|intermediate|travel|word|noun
passport|护照|basic|travel|word|noun
luggage|行李|basic|travel|word|noun
reservation|预订|basic|travel|word|noun
payment|付款|basic|shopping|word|noun
timetable|时间表|basic|travel|word|noun
walkway|步道|intermediate|travel|word|noun
handbook|手册|basic|administration|word|noun
locker|储物柜|basic|study-routine|word|noun
socket|插孔|basic|housing|word|noun
battery|电池|basic|life|word|noun
adapter|适配器|intermediate|life|word|noun
errand|跑腿差事|basic|life|word|noun
ventilation|通风|intermediate|housing|word|noun
faucet|水龙头|basic|housing|word|noun
mattress|床垫|basic|housing|word|noun
pantry|食品柜|intermediate|housing|word|noun
allowance|津贴|intermediate|society|word|noun
crossing|人行横道|basic|travel|word|noun
signal|信号灯|basic|travel|word|noun
shipment|货运；配送|intermediate|shopping|word|noun
application|申请|basic|administration|word|noun
approval|批准|basic|administration|word|noun
extension|延期|intermediate|administration|word|noun
document|文件|basic|administration|word|noun
permit|许可|intermediate|administration|word|noun
orientation|说明会|intermediate|administration|word|noun
pressure|压力|basic|emotion|word|noun
relief|宽慰|intermediate|emotion|word|noun
courtesy|礼貌|intermediate|conversation|word|noun
privacy|隐私|intermediate|society|word|noun
workload|工作量|basic|study-routine|word|noun
reminder|提醒事项|basic|study-routine|word|noun
appetite|胃口|basic|health|word|noun
recovery|恢复|intermediate|health|word|noun
allergy|过敏|basic|health|word|noun
soreness|酸痛|intermediate|health|word|noun
deadline|截止时间|basic|study-routine|word|noun
workspace|工作空间|basic|study-routine|word|noun
notebook|笔记本|basic|study-routine|word|noun
backpack|背包|basic|travel|word|noun
umbrella|雨伞|basic|life|word|noun
laundromat|自助洗衣店|intermediate|life|word|noun
utility|水电费用|intermediate|housing|word|noun
hallway|门厅；走廊|basic|housing|word|noun
register|登记表|basic|administration|word|noun
follow up on|跟进|basic|administration|phrase|verb
take care of|处理；照料|basic|life|phrase|verb
pay for|支付|basic|shopping|phrase|verb
sign up for|报名参加|basic|administration|phrase|verb
move in|搬入|basic|housing|phrase|verb
move out|搬出|basic|housing|phrase|verb
set up|建立；安排好|basic|life|phrase|verb
pack up|收拾打包|basic|travel|phrase|verb
turn in|提交|basic|administration|phrase|verb
check out|查看；退房|basic|travel|phrase|verb
look into|调查；查看|intermediate|life|phrase|verb
plan ahead|提前计划|basic|study-routine|phrase|verb
run out of|用完；耗尽|basic|life|phrase|verb
keep track of|跟踪；记录|intermediate|study-routine|phrase|verb
drop by|顺路拜访|basic|conversation|phrase|verb
hold onto|保留；抓住|intermediate|life|phrase|verb
clean up|清理|basic|life|phrase|verb
put away|收起来|basic|life|phrase|verb
speak up|大声说；直言|intermediate|conversation|phrase|verb
calm down|冷静下来|basic|emotion|phrase|verb
cut down on|减少|intermediate|health|phrase|verb
show around|带着参观|basic|conversation|phrase|verb
call back|回电话|basic|conversation|phrase|verb
reach out to|联系|intermediate|conversation|phrase|verb
write down|写下来|basic|study-routine|phrase|verb
wake up|醒来|basic|life|phrase|verb
step aside|让开；暂不参与|intermediate|conversation|phrase|verb
line up for|排队等候|basic|shopping|phrase|verb
head out|出发|basic|travel|phrase|verb
sort through|整理查看|intermediate|study-routine|phrase|verb
check over|检查一遍|basic|study-routine|phrase|verb
fill in for|临时代替|intermediate|society|phrase|verb
come along with|随身带上|basic|travel|phrase|verb
stay on top of|持续掌握|intermediate|study-routine|phrase|verb
settle on|最终决定|intermediate|life|phrase|verb
cut back on|削减|intermediate|society|phrase|verb
walk through|带着过一遍|intermediate|administration|phrase|verb
help out with|帮忙处理|basic|conversation|phrase|verb
take over from|接手|intermediate|society|phrase|verb
check back on|回头确认|intermediate|administration|phrase|verb
hand in|上交|basic|administration|phrase|verb
look after|照看|basic|life|phrase|verb
carry around|随身带着|basic|travel|phrase|verb
clear out|清空；清理|intermediate|housing|phrase|verb
stock up on|囤一些|intermediate|shopping|phrase|verb
cool down|降温；平静|basic|health|phrase|verb
show up for|按时出现|basic|conversation|phrase|verb
cut across|抄近路穿过|intermediate|travel|phrase|verb
log into|登录进入|basic|study-routine|phrase|verb
back up|备份；支援|intermediate|study-routine|phrase|verb
check over with|和…核对|intermediate|administration|phrase|verb
keep up with|跟上|intermediate|study-routine|phrase|verb
pick up on|注意到|intermediate|conversation|phrase|verb
stay in touch with|与…保持联系|intermediate|conversation|phrase|verb
settle down in|在…安顿下来|intermediate|housing|phrase|verb
talk through|把…讲透|intermediate|conversation|phrase|verb
put off until|推迟到|intermediate|administration|phrase|verb
look out for|留意|basic|travel|phrase|verb
check through|通读检查|intermediate|study-routine|phrase|verb
work around|绕开；变通处理|intermediate|life|phrase|verb
open up about|敞开谈论|intermediate|emotion|phrase|verb
cut in on|打断；占用|intermediate|conversation|phrase|verb
keep aside for|留出给|intermediate|shopping|phrase|verb
move around with|带着走动|basic|travel|phrase|verb
run through|快速过一遍|intermediate|study-routine|phrase|verb
follow through on|落实完成|intermediate|administration|phrase|verb
check up on|查看近况|basic|health|phrase|verb
settle up with|结清|intermediate|shopping|phrase|verb
line up with|与…对齐|intermediate|administration|phrase|verb
carry on with|继续进行|basic|life|phrase|verb
watch out for|提防；留意|basic|travel|phrase|verb
fill up with|装满|basic|life|phrase|verb
pay back|归还；偿还|basic|shopping|phrase|verb
leave room for|为…留空间|intermediate|study-routine|phrase|verb
take along|随身带上|basic|travel|phrase|verb
hand back|归还|basic|conversation|phrase|verb
work toward|朝着…努力|intermediate|study-routine|phrase|verb
drop off at|把…送到|basic|travel|phrase|verb
talk over|商量|basic|conversation|phrase|verb
fit into|适应；放入|basic|life|phrase|verb
bring back|带回；使想起|basic|travel|phrase|verb
call off|取消|intermediate|administration|phrase|verb
pass around|传阅；传递|intermediate|conversation|phrase|verb
check in on|顺便看看|intermediate|conversation|phrase|verb
pull together|把…整合起来|intermediate|study-routine|phrase|verb
work through|处理完|intermediate|emotion|phrase|verb
hold back on|克制；暂缓|intermediate|emotion|phrase|verb
read over|快速看一遍|basic|study-routine|phrase|verb
make room for|给…腾空间|basic|housing|phrase|verb
bring over|带过来|basic|conversation|phrase|verb
pick out for|为…挑选|basic|shopping|phrase|verb
talk back to|顶嘴|intermediate|conversation|phrase|verb
step into|走进；进入角色|intermediate|travel|phrase|verb
pull out of|退出；抽出|intermediate|travel|phrase|verb
go through with|执行到底|intermediate|life|phrase|verb
stick with|坚持；继续使用|intermediate|study-routine|phrase|verb
work up to|逐渐达到|intermediate|health|phrase|verb
come up with|想出|basic|study-routine|phrase|verb
keep back|保留|intermediate|shopping|phrase|verb
line up behind|排在…后面|basic|travel|phrase|verb
check for|检查是否有|basic|administration|phrase|verb
slow down on|放慢在…上的速度|intermediate|health|phrase|verb
talk into|说服|intermediate|conversation|phrase|verb
step back from|从…退一步|intermediate|emotion|phrase|verb
read through with|和…一起通读|intermediate|study-routine|phrase|verb
set aside for|留给|basic|shopping|phrase|verb
work out with|与…协商解决|intermediate|conversation|phrase|verb
carry forward|延续推进|intermediate|study-routine|phrase|verb
put together|整理组装|basic|life|phrase|verb
turn back from|从…折返|intermediate|travel|phrase|verb
check ahead for|提前确认|intermediate|travel|phrase|verb
open up to|向…敞开|intermediate|conversation|phrase|verb
bring together|汇集；召集|intermediate|administration|phrase|verb
look over|查看|basic|life|phrase|verb
step out for|暂时出去做…|basic|life|phrase|verb
put through|接通；完成手续|intermediate|administration|phrase|verb
show up with|带着…出现|basic|conversation|phrase|verb
hold on to|坚持保留|intermediate|life|phrase|verb
point out to|向…指出|intermediate|conversation|phrase|verb
clear up with|和…解释清楚|intermediate|conversation|phrase|verb
keep open for|为…保留空档|intermediate|administration|phrase|verb
line up around|在…周围排队|basic|travel|phrase|verb
fill out for|为…填写|basic|administration|phrase|verb
walk back to|走回到|basic|travel|phrase|verb
bring forward|提前提出|intermediate|administration|phrase|verb
turn up for|到场参加|basic|conversation|phrase|verb
keep in mind|记住|basic|study-routine|phrase|verb
stop in at|顺便去|basic|travel|phrase|verb
back out of|退出；反悔|intermediate|society|phrase|verb
talk through with|和…一起讲清楚|intermediate|conversation|phrase|verb
put back|放回；推迟|basic|life|phrase|verb
wait around for|在周围等|basic|travel|phrase|verb
pick up after|收拾…之后的残局|intermediate|life|phrase|verb
hold off on|暂缓|intermediate|administration|phrase|verb
set out for|动身去|basic|travel|phrase|verb
carry through|坚持到底|intermediate|study-routine|phrase|verb
look back on|回顾|intermediate|emotion|phrase|verb
write up for|为…写说明|intermediate|administration|phrase|verb
check out of|办理退房|basic|travel|phrase|verb
talk back and forth with|来回沟通|intermediate|conversation|phrase|verb
move along to|继续走向|basic|travel|phrase|verb
keep together|保持整齐；团结|basic|life|phrase|verb
sit down with|和…坐下来谈|intermediate|conversation|phrase|verb
set down|记下；放下|basic|study-routine|phrase|verb
look around for|四处寻找|basic|shopping|phrase|verb
pay attention to|注意|basic|study-routine|phrase|verb
keep away from|远离|basic|health|phrase|verb
bring in|带来；引入|basic|administration|phrase|verb
pick up from|从…取回|basic|travel|phrase|verb
hold together|维持稳定|intermediate|emotion|phrase|verb
go over with|和…一起复核|intermediate|study-routine|phrase|verb
check off|勾掉；核销|basic|administration|phrase|verb
make do with|凑合使用|intermediate|life|phrase|verb
drop in on|顺便看望|basic|conversation|phrase|verb
wrap up|收尾；包起来|basic|life|phrase|verb
set off for|动身前往|basic|travel|phrase|verb
talk about with|和…谈论|basic|conversation|phrase|verb
pull back from|从…撤回|intermediate|emotion|phrase|verb
come by for|顺路来拿|basic|life|phrase|verb
work around with|配合调整|intermediate|study-routine|phrase|verb
move toward|朝着…移动|basic|travel|phrase|verb
look after for|代为照看|intermediate|life|phrase|verb
step through with|带着…一步步过|intermediate|study-routine|phrase|verb
hand over|交给|basic|administration|phrase|verb
check around for|四处确认|intermediate|travel|phrase|verb
set up with|给…安排好|intermediate|life|phrase|verb
come back for|回来拿|basic|travel|phrase|verb
stick to|坚持按照|basic|study-routine|phrase|verb
take down|记下；取下|basic|study-routine|phrase|verb
work back from|从…倒推|intermediate|study-routine|phrase|verb
stay up for|熬夜做|intermediate|study-routine|phrase|verb
walk through with|和…一起演练|intermediate|administration|phrase|verb
hold onto for|替…保留|intermediate|shopping|phrase|verb
sign in for|签到参加|basic|administration|phrase|verb
pick up on with|在…中察觉|intermediate|conversation|phrase|verb
hand out|分发|basic|administration|phrase|verb
carry back|带回去|basic|travel|phrase|verb
call in about|来电咨询|intermediate|administration|phrase|verb
line up outside|在外面排队|basic|travel|phrase|verb
look over with|和…一起看|intermediate|study-routine|phrase|verb
talk through after|之后复盘讲清|intermediate|conversation|phrase|verb
bring along for|为了…带上|basic|travel|phrase|verb
settle into|逐渐适应|basic|housing|phrase|verb
wait on|等待处理|intermediate|administration|phrase|verb
back up with|用…支持|intermediate|study-routine|phrase|verb
carry over to|延续到|intermediate|study-routine|phrase|verb
check through for|检查是否有|intermediate|administration|phrase|verb
stop by for|顺路来做|basic|conversation|phrase|verb
hand in for|为了…上交|basic|administration|phrase|verb
go along with|同意；配合|intermediate|conversation|phrase|verb
look ahead to|期待并提前看|intermediate|study-routine|phrase|verb
put together for|为…整理|basic|study-routine|phrase|verb
bring back from|从…带回|basic|travel|phrase|verb
come through with|兑现；做到|intermediate|society|phrase|verb
take down from|从…取下|basic|housing|phrase|verb
keep on with|继续坚持|basic|study-routine|phrase|verb
move forward with|推进|intermediate|administration|phrase|verb
show up at|出现在|basic|travel|phrase|verb
check over before|在…前检查|basic|administration|phrase|verb
work off|消耗；缓解|intermediate|health|phrase|verb
talk with about|和…谈|basic|conversation|phrase|verb
stand by for|待命准备|intermediate|administration|phrase|verb
pay into|存入；投入|intermediate|shopping|phrase|verb
hold onto after|之后继续保留|intermediate|life|phrase|verb
walk over to|走到|basic|travel|phrase|verb
take in|吸收；带进|basic|study-routine|phrase|verb
close up|关门；合上|basic|shopping|phrase|verb
bring up with|向…提出|intermediate|conversation|phrase|verb
look through|浏览|basic|study-routine|phrase|verb
step away from|暂时离开|basic|emotion|phrase|verb
stay with|继续使用；陪着|basic|life|phrase|verb
set down for|为…记下|intermediate|study-routine|phrase|verb
point back to|回指向|intermediate|conversation|phrase|verb
put in for|申请|intermediate|administration|phrase|verb
wait for|等待|basic|travel|phrase|verb
check over after|事后复核|intermediate|study-routine|phrase|verb
work with|配合处理|basic|conversation|phrase|verb
come back to|回到；再次提到|basic|study-routine|phrase|verb
set off|出发|basic|travel|phrase|verb
look up to|敬佩|intermediate|society|phrase|verb
slow down for|为…放慢|basic|health|phrase|verb
stay in for|留在家里做|basic|life|phrase|verb
bring out|拿出；显出|intermediate|shopping|phrase|verb
read back through|回头重读|intermediate|study-routine|phrase|verb
go back for|返回去拿|basic|travel|phrase|verb
talk back through|重新讲一遍|intermediate|conversation|phrase|verb
come up on|临近到来|intermediate|administration|phrase|verb
hand over to|转交给|basic|administration|phrase|verb
look in on|顺便看看|basic|conversation|phrase|verb
move through|通过；穿过|basic|travel|phrase|verb
bring down|降低|intermediate|shopping|phrase|verb
stick with through|坚持度过|intermediate|emotion|phrase|verb
check against with|拿…对照|intermediate|study-routine|phrase|verb
line up after|接着排队|basic|travel|phrase|verb
take over with|接手处理|intermediate|administration|phrase|verb
work back through|倒着梳理一遍|intermediate|study-routine|phrase|verb
settle up after|事后结清|intermediate|shopping|phrase|verb
move out of|搬离|basic|housing|phrase|verb
come across as|给人…印象|intermediate|conversation|phrase|verb
read over with|和…一起看一遍|intermediate|study-routine|phrase|verb
walk back through|再走一遍流程|intermediate|administration|phrase|verb
bring over for|带来给…用|basic|shopping|phrase|verb
check in with|和…确认|basic|conversation|phrase|verb
keep out of|避免卷入|intermediate|society|phrase|verb
line things up|把事情排好|intermediate|study-routine|phrase|verb
take out of|从…取出|basic|life|phrase|verb
come through on|按时兑现|intermediate|administration|phrase|verb
hold together through|在…过程中维持|intermediate|emotion|phrase|verb
step across to|走到另一边|basic|travel|phrase|verb
stay on with|继续陪同|intermediate|conversation|phrase|verb
write down for|替…记下|basic|study-routine|phrase|verb
bring back up|再次提起|intermediate|conversation|phrase|verb
look ahead for|提前寻找|intermediate|travel|phrase|verb
set aside to|留出来做|basic|study-routine|phrase|verb
talk about after|之后再讨论|basic|conversation|phrase|verb
check off after|完成后勾掉|basic|study-routine|phrase|verb
line up with after|事后与…对齐|intermediate|administration|phrase|verb
carry out|执行|basic|administration|phrase|verb
bring in for|带来做|basic|travel|phrase|verb
keep on top of|持续掌握|intermediate|study-routine|phrase|verb
move toward with|带着…朝向|intermediate|travel|phrase|verb
hand back to|归还给|basic|conversation|phrase|verb
look over before|之前看一遍|basic|study-routine|phrase|verb
settle down with|安静下来处理|basic|study-routine|phrase|verb
take along for|为了…带上|basic|travel|phrase|verb
work through with|和…一起处理|intermediate|conversation|phrase|verb
go back over|重新复习|basic|study-routine|phrase|verb
bring forward to|推进到|intermediate|administration|phrase|verb
wait around at|在…等着|basic|travel|phrase|verb
check back with|回头和…确认|intermediate|conversation|phrase|verb
keep together through|一路保持完整|intermediate|travel|phrase|verb
pack away|收好|basic|life|phrase|verb
bring back into|重新带回到|intermediate|study-routine|phrase|verb
stand up for|支持；维护|intermediate|society|phrase|verb
look over after|事后查看|basic|administration|phrase|verb
move into|搬进；进入|basic|housing|phrase|verb
read through before|事先通读|basic|study-routine|phrase|verb
check around with|向周围人确认|intermediate|conversation|phrase|verb
come back around to|再次回到|intermediate|conversation|phrase|verb
stay out of|避免卷入|basic|society|phrase|verb
work into|逐渐纳入|intermediate|study-routine|phrase|verb
carry into|带进|basic|travel|phrase|verb
look through with|和…一起浏览|intermediate|study-routine|phrase|verb
bring up after|之后提起|basic|conversation|phrase|verb
hand over after|之后移交|intermediate|administration|phrase|verb
keep off|避免碰|basic|health|phrase|verb
read back to|回读给…听|intermediate|conversation|phrase|verb
take back|拿回；收回|basic|shopping|phrase|verb
go through|经历；处理|basic|life|phrase|verb
step into with|带着…进入|intermediate|travel|phrase|verb
line up to|排队准备|basic|travel|phrase|verb
bring down to|降到|intermediate|shopping|phrase|verb
check through again|再检查一遍|basic|study-routine|phrase|verb
sit down to|坐下来开始|basic|study-routine|phrase|verb
keep up after|之后继续跟进|intermediate|administration|phrase|verb
talk through before|事前讲清|intermediate|conversation|phrase|verb
work along with|配合推进|intermediate|administration|phrase|verb
drop by after|之后顺路来|basic|conversation|phrase|verb
step back into|重新进入|intermediate|housing|phrase|verb
look into for|为了…查看|intermediate|shopping|phrase|verb
check in before|之前签到|basic|administration|phrase|verb
keep back from|使远离|intermediate|health|phrase|verb
take up with|开始认真处理|intermediate|life|phrase|verb
move across to|移动到|basic|travel|phrase|verb
talk over with|和…商量|basic|conversation|phrase|verb
bring through|带着通过|intermediate|travel|phrase|verb
pack for|为…打包|basic|travel|phrase|verb
look out across|朝外望向|intermediate|housing|phrase|verb
keep in|留在里面|basic|housing|phrase|verb
check over together|一起检查|basic|study-routine|phrase|verb
go along after|随后跟上|basic|travel|phrase|verb
put through for|为…办理|intermediate|administration|phrase|verb
hold onto while|在…期间保留|intermediate|life|phrase|verb
write through|完整写完|intermediate|study-routine|phrase|verb
bring in after|之后带进来|basic|administration|phrase|verb
step through after|之后再走一遍|intermediate|study-routine|phrase|verb
check in after|事后回报|intermediate|conversation|phrase|verb
slow down with|放慢处理|intermediate|health|phrase|verb
look around after|事后再找找|basic|shopping|phrase|verb
set up for|为…做好准备|basic|study-routine|phrase|verb
walk through before|之前先过一遍|intermediate|administration|phrase|verb
hold up through|在…期间撑住|intermediate|emotion|phrase|verb
bring back with|带回来并附上|intermediate|administration|phrase|verb
check out before|之前查看|basic|travel|phrase|verb
wait on for|为了…等待|intermediate|administration|phrase|verb
work toward with|配合朝向|intermediate|study-routine|phrase|verb
move along after|之后继续推进|basic|study-routine|phrase|verb
take down after|之后记下|basic|study-routine|phrase|verb
keep together after|之后保持一致|intermediate|conversation|phrase|verb
come back with|带着…回来|basic|conversation|phrase|verb
read through after|之后再通读|intermediate|study-routine|phrase|verb
go back through|再梳理一遍|intermediate|study-routine|phrase|verb
line up for after|之后排队等|basic|travel|phrase|verb
bring along after|之后带上|basic|travel|phrase|verb
pull back on|减少；收缩|intermediate|shopping|phrase|verb
check across with|和…交叉核对|intermediate|administration|phrase|verb
talk over after|之后再商量|basic|conversation|phrase|verb
stay with through|一路坚持|intermediate|emotion|phrase|verb
look through before|事先浏览|basic|study-routine|phrase|verb
hand over before|事前交付|basic|administration|phrase|verb
keep aside after|事后留着|intermediate|shopping|phrase|verb
go ahead with|着手进行|basic|administration|phrase|verb
come back around|绕回来；再次回到|intermediate|conversation|phrase|verb
walk into|走进|basic|travel|phrase|verb
hold off until|拖到…再做|intermediate|administration|phrase|verb
work back into|重新纳入|intermediate|study-routine|phrase|verb
move ahead with|继续推进|intermediate|administration|phrase|verb
check in around|大致确认|intermediate|conversation|phrase|verb
bring back over|再带回来|basic|travel|phrase|verb
take apart|拆开分析|intermediate|life|phrase|verb
look after while|在…期间照看|intermediate|life|phrase|verb
call back after|之后回电|basic|conversation|phrase|verb
run through with|和…快速过一遍|intermediate|study-routine|phrase|verb
line up for before|事前排队等|basic|travel|phrase|verb
settle on for|为…选定|intermediate|shopping|phrase|verb
take in after|之后吸收理解|intermediate|study-routine|phrase|verb
check up after|之后再查|intermediate|health|phrase|verb
work out after|之后解决|basic|life|phrase|verb
bring through with|带着…顺利完成|intermediate|administration|phrase|verb
look around with|和…一起逛逛看|basic|shopping|phrase|verb
show around to|带…参观|basic|conversation|phrase|verb
go over after|之后复盘|basic|study-routine|phrase|verb
pick up after class|课后顺便拿|basic|travel|phrase|verb
fill out before|事前填写|basic|administration|phrase|verb
talk through again|再讲一遍|intermediate|conversation|phrase|verb
work through before|事前处理完|intermediate|study-routine|phrase|verb
bring back for|带回来给|basic|conversation|phrase|verb
step back and|退一步然后|intermediate|emotion|phrase|verb
look into after|之后再查|intermediate|administration|phrase|verb
keep up through|在…期间保持|intermediate|study-routine|phrase|verb
set out with|带着…出发|basic|travel|phrase|verb
hold on until|坚持到|basic|emotion|phrase|verb
go over before|之前先看一遍|basic|study-routine|phrase|verb
come by after|之后顺路来|basic|conversation|phrase|verb
work through after|之后处理完|intermediate|administration|phrase|verb
put away after|之后收起来|basic|life|phrase|verb
move along with|随着…推进|intermediate|study-routine|phrase|verb
check on before|之前确认|basic|administration|phrase|verb
carry through with|把…贯彻到底|intermediate|study-routine|phrase|verb
bring along with|连同…一起带|basic|travel|phrase|verb
read through together|一起通读|basic|study-routine|phrase|verb
step through before|之前走一遍|intermediate|administration|phrase|verb
wait for after|之后等待|basic|travel|phrase|verb
keep back for|留给|intermediate|shopping|phrase|verb
talk with after|之后再谈|basic|conversation|phrase|verb
go over together|一起复习|basic|study-routine|phrase|verb
bring down with|用…降低|intermediate|health|phrase|verb
check across again|再次交叉核对|intermediate|administration|phrase|verb
move toward after|之后朝…移动|basic|travel|phrase|verb
hold up after|之后继续撑着|intermediate|emotion|phrase|verb
carry out with|带着…执行|intermediate|administration|phrase|verb
point back at|重新指向|intermediate|conversation|phrase|verb
keep on at|持续做|basic|study-routine|phrase|verb
walk through the steps|把步骤走一遍|basic|study-routine|phrase|verb
check up with|向…核实|intermediate|conversation|phrase|verb
bring up after class|课后提出|basic|conversation|phrase|verb
turn in before|事前提交|basic|administration|phrase|verb
sit down after|之后坐下来做|basic|study-routine|phrase|verb
look out after|之后留意|basic|travel|phrase|verb
set up before|提前准备好|basic|administration|phrase|verb
move over to|挪到|basic|travel|phrase|verb
hold off after|之后再拖一拖|intermediate|administration|phrase|verb
talk back through again|再重新讲透|intermediate|conversation|phrase|verb
work through together|一起处理完|intermediate|study-routine|phrase|verb
bring forward after|之后提前提出来|intermediate|administration|phrase|verb
read over before class|课前快速看|basic|study-routine|phrase|verb
come through after|之后顺利完成|intermediate|administration|phrase|verb
check over at night|晚上检查一遍|basic|study-routine|phrase|verb
go back over the list|重新过一遍清单|basic|study-routine|phrase|verb
look through the form|查看表格|basic|administration|phrase|verb
set off after lunch|午饭后出发|basic|travel|phrase|verb
hand back after use|用后归还|basic|life|phrase|verb
pay for in advance|提前付款|basic|shopping|phrase|verb
drop by before class|课前顺路来|basic|conversation|phrase|verb
check in online|在线签到|basic|administration|phrase|verb
move back into routine|重新回到常规|intermediate|study-routine|phrase|verb
go over the notes|过一遍笔记|basic|study-routine|phrase|verb
fill out the section|填完这一栏|basic|administration|phrase|verb
look into the problem|查看这个问题|basic|administration|phrase|verb
carry on after dinner|晚饭后继续|basic|study-routine|phrase|verb
stay in touch after|之后保持联系|basic|conversation|phrase|verb
write down the address|写下地址|basic|travel|phrase|verb
head out early|早点出发|basic|travel|phrase|verb
set aside time for|留时间给|basic|study-routine|phrase|verb
check on the request|确认申请进度|basic|administration|phrase|verb
sort through the files|整理查看文件|basic|study-routine|phrase|verb
`);

const academicSeeds = parseSeedBlock("academic", `
thesis|论文；论点|intermediate|writing|word|noun
abstract|摘要|basic|reading|word|noun
appendix|附录|intermediate|reading|word|noun
citation|引文|intermediate|writing|word|noun
evidence|证据|basic|argument|word|noun
premise|前提|intermediate|argument|word|noun
scope|范围|intermediate|research|word|noun
depth|深度|intermediate|analysis|word|noun
clarity|清晰度|basic|writing|word|noun
precision|准确性|intermediate|writing|word|noun
distinction|区分；差别|intermediate|analysis|word|noun
criterion|标准|advanced|analysis|word|noun
consistency|一致性|intermediate|writing|word|noun
overview|概览|basic|reading|word|noun
summary|总结|basic|reading|word|noun
draft|草稿|basic|writing|word|noun
revision|修改|basic|writing|word|noun
reviewer|审稿人|intermediate|research-writing|word|noun
editor|编辑|intermediate|research-writing|word|noun
seminar|研讨课|basic|study-method|word|noun
lecture|讲座|basic|study-method|word|noun
transcript|文字稿|intermediate|reading|word|noun
outline|提纲|basic|writing|word|noun
insight|洞见|intermediate|analysis|word|noun
critique|评析|advanced|analysis|word|noun
controversy|争议|advanced|argument|word|noun
priority|优先事项|basic|research|word|noun
objective|目标|basic|research|word|noun
sequence|顺序|intermediate|reading|word|noun
proportion|比例|advanced|analysis|word|noun
mechanism|机制|advanced|analysis|word|noun
observation|观察|basic|research|word|noun
hypothesis|假设|intermediate|research|word|noun
correlation|相关性|advanced|analysis|word|noun
replication|复现|advanced|research|word|noun
notation|记号体系|advanced|reading|word|noun
illustration|例证|intermediate|writing|word|noun
reference|参考资料|basic|reading|word|noun
passage|段落；文段|basic|reading|word|noun
paragraph|段落|basic|writing|word|noun
transition|过渡|intermediate|writing|word|noun
emphasis|强调|intermediate|writing|word|noun
comparison|比较|basic|analysis|word|noun
contrast|对比|basic|analysis|word|noun
interpretation|解释|intermediate|analysis|word|noun
generalization|概括；泛化|advanced|argument|word|noun
annotation|注释|intermediate|reading|word|noun
counterexample|反例|advanced|argument|word|noun
debate|辩论；争论|basic|argument|word|noun
reflection|反思|basic|study-method|word|noun
convention|惯例|advanced|writing|word|noun
paragraphing|分段方式|advanced|writing|word|noun
cohesion|衔接性|advanced|writing|word|noun
hierarchy|层级|intermediate|writing|word|noun
comparison point|比较点|advanced|analysis|word|noun
framing|框定方式|advanced|argument|word|noun
nuance|细微差别|advanced|analysis|word|noun
alignment|对齐；一致|advanced|research-writing|word|noun
revision note|修改说明|intermediate|research-writing|word|noun
terminology|术语体系|advanced|reading|word|noun
readability|可读性|intermediate|writing|word|noun
assumption check|假设检查|advanced|argument|word|noun
structure|结构|basic|writing|word|noun
logic|逻辑|basic|argument|word|noun
proof|论证依据|advanced|argument|word|noun
impetus|推动力|advanced|argument|word|noun
context|语境|basic|reading|word|noun
limitation note|局限说明|advanced|research-writing|word|noun
sample frame|样本框架|advanced|research|word|noun
respondent|受访者|advanced|research|word|noun
transparency note|透明性说明|advanced|research-writing|word|noun
feedback loop|反馈回路|advanced|study-method|word|noun
revision cycle|修改循环|intermediate|writing|word|noun
signal phrase|提示语|intermediate|reading|word|noun
evidence chain|证据链|advanced|argument|word|noun
claim boundary|论点边界|advanced|argument|word|noun
discussion point|讨论点|basic|study-method|word|noun
method choice|方法选择|intermediate|research|word|noun
note-taking|记笔记方式|basic|study-method|word|noun
reading pace|阅读速度|basic|study-method|word|noun
response pattern|回应模式|advanced|analysis|word|noun
source base|资料基础|advanced|research|word|noun
concept map|概念图|intermediate|study-method|word|noun
build on|建立在…基础上|basic|research-writing|phrase|verb
draw from|从…汲取|basic|research-writing|phrase|verb
point to|指向；表明|basic|argument|phrase|verb
focus on|聚焦于|basic|research|phrase|verb
test for|检验是否存在|intermediate|research|phrase|verb
sum up|概括总结|basic|study-method|phrase|verb
break down|拆解分析|basic|analysis|phrase|verb
compare with|与…比较|basic|analysis|phrase|verb
refer to|提到；参照|basic|reading|phrase|verb
rely on|依赖|basic|argument|phrase|verb
link to|联系到|basic|argument|phrase|verb
result in|导致|basic|argument|phrase|verb
consist of|由…组成|basic|reading|phrase|verb
lead to|引向；导致|basic|argument|phrase|verb
comment on|评论；说明|basic|research-writing|phrase|verb
narrow down|缩小范围|basic|research|phrase|verb
set out|阐明；开始着手|intermediate|writing|phrase|verb
write up|整理写成文|basic|writing|phrase|verb
read through|通读|basic|reading|phrase|verb
think through|想透；推演清楚|intermediate|analysis|phrase|verb
tie back to|回扣到|intermediate|writing|phrase|verb
turn to|转向；求助于|basic|reading|phrase|verb
sort through|理清；筛选|intermediate|analysis|phrase|verb
note down|记下|basic|study-method|phrase|verb
check against|对照检查|intermediate|research-writing|phrase|verb
line up with|与…一致|intermediate|argument|phrase|verb
move beyond|超越；不止于|intermediate|argument|phrase|verb
pull together|整合|intermediate|writing|phrase|verb
map out|规划；梳理|intermediate|research|phrase|verb
follow up on|继续跟进|basic|research|phrase|verb
work through|一步步处理|intermediate|study-method|phrase|verb
point back to|回指向|intermediate|writing|phrase|verb
read over|快速复看|basic|reading|phrase|verb
go back to|回到；重新提及|basic|argument|phrase|verb
spell out|明确说明|intermediate|writing|phrase|verb
build toward|逐步引向|intermediate|argument|phrase|verb
set aside|暂放一边；留出|basic|study-method|phrase|verb
walk through|带着过一遍|intermediate|study-method|phrase|verb
anchor in|锚定在|advanced|argument|phrase|verb
ground in|建立在…基础上|advanced|argument|phrase|verb
carry through|贯彻完成|intermediate|writing|phrase|verb
trace back to|追溯到|advanced|reading|phrase|verb
work out|推导清楚|intermediate|analysis|phrase|verb
lay out|展开阐明|basic|writing|phrase|verb
come back to|再次回到|basic|writing|phrase|verb
pick apart|仔细剖析|advanced|analysis|phrase|verb
weigh against|与…权衡比较|advanced|analysis|phrase|verb
push forward|推进|basic|research|phrase|verb
read into|从…中读出|advanced|reading|phrase|verb
zoom in on|聚焦细看|intermediate|analysis|phrase|verb
draw out|引申出来|advanced|writing|phrase|verb
fit into|纳入；适配于|intermediate|research|phrase|verb
check in with|和…确认|basic|study-method|phrase|verb
set up for|为…做好准备|basic|study-method|phrase|verb
look over|查看|basic|reading|phrase|verb
fold into|并入|advanced|research-writing|phrase|verb
break with|打破；背离|advanced|argument|phrase|verb
line up against|与…形成对立|advanced|argument|phrase|verb
`);

const domainSeeds = parseSeedBlock("domain", `
artifact|人工制品；文物对象|intermediate|cultural-heritage|word|noun
prototype|原型|basic|design|word|noun
prompt|提示词|basic|AI|word|noun
pipeline|流程管线|intermediate|AI|word|noun
encoder|编码器|advanced|AI|word|noun
decoder|解码器|advanced|AI|word|noun
tokenizer|分词器|advanced|AI|word|noun
embedding|嵌入表示|advanced|AI|word|noun
schema|模式；结构定义|advanced|dataset|word|noun
provenance|来源信息|advanced|dataset|word|noun
modality|模态|advanced|AI|word|noun
caption|图注；说明文字|basic|dataset|word|noun
ranking|排序|intermediate|evaluation|word|noun
relevance|相关性|intermediate|evaluation|word|noun
retrieval|检索|advanced|AI|word|noun
annotation|标注|basic|dataset|word|noun
evaluator|评估者；评估模块|advanced|evaluation|word|noun
dashboard|仪表盘|intermediate|HCI|word|noun
workflow|工作流|basic|design|word|noun
iteration|迭代|basic|design|word|noun
session|会话；交互轮次|basic|HCI|word|noun
archive|档案库|basic|cultural-heritage|word|noun
curator|策展人|intermediate|cultural-heritage|word|noun
exhibit|展品；展览|basic|cultural-heritage|word|noun
iconography|图像志|advanced|cultural-heritage|word|noun
manuscript|手稿|intermediate|cultural-heritage|word|noun
fresco|壁画|advanced|cultural-heritage|word|noun
dynasty|朝代|basic|cultural-heritage|word|noun
motif|主题图案|advanced|cultural-heritage|word|noun
inscription|题记；铭文|advanced|cultural-heritage|word|noun
relic|文物|intermediate|cultural-heritage|word|noun
latency|时延|advanced|AI|word|noun
throughput|吞吐量|advanced|AI|word|noun
robustness|鲁棒性|advanced|evaluation|word|noun
bias|偏差|intermediate|evaluation|word|noun
alignment|对齐|advanced|AI|word|noun
scenario|场景|basic|HCI|word|noun
parser|解析器|advanced|AI|word|noun
thumbnail|缩略图|basic|dataset|word|noun
excerpt|摘录|intermediate|cultural-heritage|word|noun
hierarchy|层级结构|intermediate|design|word|noun
query|查询|basic|AI|word|noun
filter|筛选器|basic|HCI|word|noun
cluster|聚类|advanced|AI|word|noun
collection|馆藏集合|basic|cultural-heritage|word|noun
gallery|展厅|basic|cultural-heritage|word|noun
metadata|元数据|intermediate|dataset|word|noun
labeler|标注者|advanced|dataset|word|noun
sampler|采样器|advanced|AI|word|noun
adapter|适配器|advanced|AI|word|noun
heuristic|启发式规则|advanced|evaluation|word|noun
constraint|约束|intermediate|design|word|noun
signal|信号|basic|AI|word|noun
trace|痕迹；追踪记录|intermediate|evaluation|word|noun
overlay|叠加层|intermediate|HCI|word|noun
annotation pass|标注轮次|advanced|dataset|word|noun
benchmark split|基准划分|advanced|benchmark|word|noun
error pattern|错误模式|advanced|evaluation|word|noun
task family|任务族|advanced|benchmark|word|noun
grounding|落地对应|advanced|AI|word|noun
rendering|渲染结果|intermediate|design|word|noun
screening|筛查过程|advanced|dataset|word|noun
artifact note|文物说明|intermediate|cultural-heritage|word|noun
heritage site|遗址|intermediate|cultural-heritage|word|noun
taxonomy|分类体系|advanced|dataset|word|noun
viewer|浏览器界面；查看器|intermediate|HCI|word|noun
viewport|视口|advanced|HCI|word|noun
prompt trace|提示链路|advanced|AI|word|noun
response span|响应片段|advanced|evaluation|word|noun
query set|查询集合|advanced|benchmark|word|noun
entity link|实体链接|advanced|dataset|word|noun
scan|扫描件|basic|cultural-heritage|word|noun
layout grid|布局网格|intermediate|design|word|noun
interaction cue|交互提示|advanced|HCI|word|noun
score band|评分区间|advanced|evaluation|word|noun
retrieval stage|检索阶段|advanced|benchmark|word|noun
search index|搜索索引|advanced|AI|word|noun
tag set|标签集合|intermediate|dataset|word|noun
pipeline step|流程步骤|intermediate|AI|word|noun
use case|使用场景|basic|design|word|noun
evaluation sheet|评估表|intermediate|evaluation|word|noun
artifact cluster|文物簇群|advanced|cultural-heritage|word|noun
prompt chain|提示链|advanced|AI|word|noun
label schema|标签模式|advanced|dataset|word|noun
quality gate|质量关卡|advanced|benchmark|word|noun
scale up|扩大规模|basic|AI|phrase|verb
fine-tune|微调|basic|AI|phrase|verb
plug into|接入|basic|AI|phrase|verb
map onto|映射到|advanced|evaluation|phrase|verb
feed into|输入到；促进|basic|AI|phrase|verb
zoom in on|聚焦到|intermediate|design|phrase|verb
search for|搜索|basic|AI|phrase|verb
sort by|按…排序|basic|HCI|phrase|verb
label as|标记为|basic|dataset|phrase|verb
reason about|推理分析|advanced|AI|phrase|verb
rank by|按…排名|intermediate|evaluation|phrase|verb
filter out|筛除|basic|dataset|phrase|verb
pull from|从…抽取|intermediate|dataset|phrase|verb
pair with|与…配对|basic|design|phrase|verb
compare against|与…比较|intermediate|benchmark|phrase|verb
build around|围绕…构建|basic|design|phrase|verb
tune for|针对…调优|intermediate|AI|phrase|verb
trace back|追溯回去|intermediate|evaluation|phrase|verb
move across|跨越；移动到|basic|HCI|phrase|verb
align with|与…对齐|basic|evaluation|phrase|verb
surface in|在…中显现|advanced|HCI|phrase|verb
group by|按…分组|basic|dataset|phrase|verb
look up|查找|basic|cultural-heritage|phrase|verb
hand off|移交|intermediate|workflow|phrase|verb
work across|跨…协作|intermediate|design|phrase|verb
step through|一步步过|intermediate|HCI|phrase|verb
test against|用…来测试|intermediate|benchmark|phrase|verb
merge into|合并进|intermediate|dataset|phrase|verb
branch into|分支到|advanced|workflow|phrase|verb
ground in|扎根于；依据于|advanced|cultural-heritage|phrase|verb
pull apart|拆开分析|intermediate|benchmark|phrase|verb
scale down|缩小规模|intermediate|AI|phrase|verb
feed back into|回流到|advanced|evaluation|phrase|verb
line up with|与…吻合|intermediate|benchmark|phrase|verb
zoom out from|从…拉远看|intermediate|design|phrase|verb
reason through|推理梳理清楚|advanced|AI|phrase|verb
point to|指向；表明|basic|evaluation|phrase|verb
map out|梳理规划|intermediate|workflow|phrase|verb
check against|对照检查|intermediate|dataset|phrase|verb
work with|结合使用|basic|design|phrase|verb
stack on top of|叠加到…之上|advanced|HCI|phrase|verb
trace through|沿着…追踪|advanced|evaluation|phrase|verb
read from|从…读取|basic|dataset|phrase|verb
write into|写入到|basic|dataset|phrase|verb
pull together|整合到一起|intermediate|workflow|phrase|verb
set up for|为…配置|basic|AI|phrase|verb
lean on|依赖于|intermediate|evaluation|phrase|verb
carry over into|延续到|advanced|cultural-heritage|phrase|verb
tie back to|回扣到|intermediate|research-writing|phrase|verb
filter by|根据…筛选|basic|dataset|phrase|verb
layer onto|叠加到|advanced|design|phrase|verb
sort through|筛选理清|intermediate|dataset|phrase|verb
break apart|拆分开|intermediate|workflow|phrase|verb
match with|和…匹配|basic|evaluation|phrase|verb
move through|穿过；处理完|basic|workflow|phrase|verb
search across|跨域搜索|intermediate|benchmark|phrase|verb
cluster around|围绕…聚类|advanced|AI|phrase|verb
point back to|回指向|advanced|research-writing|phrase|verb
`);

const baseSnapshot = readJson(baseSeedPath, []);
const currentBank = readJson(activeBankPath, []);
const baseBank = currentBank.length > baseSnapshot.length ? currentBank : baseSnapshot;
if (!baseBank.length) {
  throw new Error("Missing base_seed_v1.json. Please create the base snapshot first.");
}

const seenTexts = new Set(baseBank.map((item) => lowerText(item.text)));
const nextId = nextIdFactory(baseBank);

const baseByCategory = {
  daily: baseBank.filter((item) => item.category === "daily"),
  academic: baseBank.filter((item) => item.category === "academic"),
  domain: baseBank.filter((item) => item.category === "domain"),
};

const lexicalSeedsByCategory = {
  daily: dailySeeds,
  academic: academicSeeds,
  domain: domainSeeds,
};

const lexicalAdditions = [];

for (const [category, seeds] of Object.entries(lexicalSeedsByCategory)) {
  const selectedSeeds = selectUniqueLexicalSeeds(
    baseByCategory[category],
    seeds,
    TARGETS.lexicalAdditionsPerCategory[category],
  );
  const additions = selectedSeeds.map((seed) => {
    const item = buildLexicalItem(seed, nextId);
    seenTexts.add(lowerText(item.text));
    return item;
  });
  lexicalAdditions.push(...additions);
}

const currentWithLexical = [...baseBank, ...lexicalAdditions];
const additionsByCategory = {
  daily: lexicalAdditions.filter((item) => item.category === "daily"),
  academic: lexicalAdditions.filter((item) => item.category === "academic"),
  domain: lexicalAdditions.filter((item) => item.category === "domain"),
};

const usageAdditions = [];
for (const category of ["daily", "academic", "domain"]) {
  const currentCount = currentWithLexical.filter((item) => item.category === category).length
    + usageAdditions.filter((item) => item.category === category).length;
  const needed = TARGETS.byCategory[category] - currentCount;
  const wordPool = currentWithLexical.filter((item) => item.category === category && item.type === "word");
  const generated = buildUsageItems(category, needed, wordPool, nextId, seenTexts);
  usageAdditions.push(...generated);
}

const lexicalBoostAdditions = [];
const currentWithUsage = [...baseBank, ...lexicalAdditions, ...usageAdditions];
for (const category of ["daily", "academic", "domain"]) {
  const lexicalPool = currentWithUsage.filter((item) => item.category === category && (item.type === "word" || item.type === "phrase"));
  const generated = buildLexicalBoostItems(
    category,
    lexicalPool,
    nextId,
    seenTexts,
    TARGETS.lexicalBoostPerCategory[category],
  );
  lexicalBoostAdditions.push(...generated);
}

const richBank = [...baseBank, ...lexicalAdditions, ...usageAdditions, ...lexicalBoostAdditions].sort((left, right) =>
  left.id.localeCompare(right.id, undefined, { numeric: true }),
);

const lexiconPath = path.join(root, "data", "english_system", "learner", "lexicon.json");
const lexicon = readJson(lexiconPath, { items: [] });
const preservedIds = new Set((lexicon.items || []).map((item) => item.itemId).filter(Boolean));

const finalWordSelections = [];
const wordPools = {
  daily: richBank.filter((item) => item.category === "daily" && item.type === "word"),
  academic: richBank.filter((item) => item.category === "academic" && item.type === "word"),
  domain: richBank.filter((item) => item.category === "domain" && item.type === "word"),
};

for (const category of ["daily", "academic", "domain"]) {
  const targetCount = TARGETS.finalTypeTargets.word[category];
  const existingWords = wordPools[category];
  const seenWordTexts = new Set(existingWords.map((item) => lowerText(item.text)));
  const needed = Math.max(0, targetCount - existingWords.length);
  const derived = buildDerivedWordItems(category, needed, richBank.filter((item) => item.category === category), nextId, seenWordTexts);
  const combined = [...existingWords, ...derived];
  finalWordSelections.push(...selectTypedItems(combined, targetCount, preservedIds));
}

const finalPhraseSelections = [];
for (const category of ["daily", "academic", "domain"]) {
  const targetCount = TARGETS.finalTypeTargets.phrase[category];
  const pool = richBank.filter((item) => item.category === category && item.type === "phrase");
  finalPhraseSelections.push(...selectTypedItems(pool, targetCount, preservedIds));
}

const finalUsageSelections = [];
for (const category of ["daily", "academic", "domain"]) {
  const targetCount = TARGETS.finalTypeTargets.usage[category];
  const pool = richBank.filter((item) => item.category === category && item.type === "usage");
  finalUsageSelections.push(...selectTypedItems(pool, targetCount, preservedIds));
}

const finalBank = [...finalWordSelections, ...finalPhraseSelections, ...finalUsageSelections].sort((left, right) =>
  left.id.localeCompare(right.id, undefined, { numeric: true }),
);

const finalDaily = finalBank.filter((item) => item.category === "daily");
const finalAcademic = finalBank.filter((item) => item.category === "academic");
const finalDomain = finalBank.filter((item) => item.category === "domain");
const finalUsage = finalBank.filter((item) => item.type === "usage");

writeJson("bank_daily.json", finalDaily);
writeJson("bank_academic.json", finalAcademic);
writeJson("bank_domain.json", finalDomain);
writeJson("bank_usage.json", finalUsage);
writeJson("bank_seed_v1.json", finalBank);

console.log(JSON.stringify(summarize(finalBank), null, 2));
