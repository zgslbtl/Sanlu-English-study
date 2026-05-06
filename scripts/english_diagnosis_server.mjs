import fs from "fs";
import http from "http";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";
import { promisify } from "util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "data", "english_system");
const learnerRoot = path.join(dataRoot, "learner");

const bankSeedPath = path.join(dataRoot, "test_bank", "bank_seed_v1.json");
const lexiconPath = path.join(learnerRoot, "lexicon.json");
const profilePath = path.join(learnerRoot, "profile.json");
const sessionsPath = path.join(learnerRoot, "sessions.json");
const diagnosticsPath = path.join(learnerRoot, "diagnostics.json");
const reviewCandidatesPath = path.join(learnerRoot, "review_candidates.json");
const learningItemsPath = path.join(learnerRoot, "learning_items.json");
const dailyLearningQueuePath = path.join(learnerRoot, "daily_learning_queue.json");
const memorySchedulePath = path.join(learnerRoot, "memory_schedule.json");
const wordLearningSessionsPath = path.join(learnerRoot, "word_learning_sessions.json");
const storyQueuePath = path.join(learnerRoot, "today_story_queue.json");
const materialsIndexPath = path.join(learnerRoot, "materials_index.json");
const weeklyWritingPath = path.join(learnerRoot, "weekly_writing.json");

const htmlPath = path.join(root, "web", "english_diagnosis.html");
const learningHtmlPath = path.join(root, "web", "english_word_learning.html");
const storyHtmlPath = path.join(root, "web", "english_today_story.html");
const readerHtmlPath = path.join(root, "web", "english_reader.html");
const writingHtmlPath = path.join(root, "web", "english_weekly_writing.html");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4320);
const appTimezone = "Asia/Shanghai";
const execFileAsync = promisify(execFile);

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

let pdfParseModulePromise = null;

function nowIso() {
  return new Date().toISOString();
}

function todayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function weekKey(dateString = todayDate()) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = localDate.getUTCDay() || 7;
  localDate.setUTCDate(localDate.getUTCDate() - (weekday - 1));
  return localDate.toISOString().slice(0, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSize(rawSize) {
  const parsed = Number(rawSize);
  if (!Number.isFinite(parsed)) return 100;
  return clamp(Math.round(parsed), 1, 200);
}

function normalizeStudyCount(rawSize, fallback) {
  const parsed = Number(rawSize);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(Math.round(parsed), 1, 30);
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function sentenceCase(text) {
  const clean = String(text || "").trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function ensureSentence(text) {
  const clean = sentenceCase(text);
  if (!clean) return "";
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "item";
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupe(list) {
  return [...new Set(list.filter(Boolean))];
}

function addDaysIso(baseIso, offsetDays) {
  const base = baseIso ? new Date(baseIso) : new Date();
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString();
}

function priorityWeight(status) {
  return {
    unknown: 1,
    fuzzy: 0.7,
    familiar: 0.35,
  }[status] || 0.4;
}

function typeWeight(type) {
  return {
    usage: 1,
    phrase: 0.82,
    word: 0.72,
  }[type] || 0.6;
}

function categoryWeight(category) {
  return {
    domain: 1,
    academic: 0.9,
    daily: 0.75,
  }[category] || 0.6;
}

function computePriorityScore({ status, wrongCount = 0, category, type }) {
  const score = (
    priorityWeight(status) * 0.5 +
    Math.min(wrongCount, 5) * 0.08 +
    categoryWeight(category) * 0.25 +
    typeWeight(type) * 0.17
  );
  return Number(score.toFixed(2));
}

function latestStatusByItem(sessionsData) {
  const map = new Map();
  for (const session of sessionsData.sessions || []) {
    for (const response of session.responses || []) {
      const previous = map.get(response.itemId);
      if (!previous || String(previous.answeredAt).localeCompare(String(response.answeredAt)) < 0) {
        map.set(response.itemId, response);
      }
    }
  }
  return map;
}

function createEmptyDiagnostics() {
  return {
    version: 1,
    summary: {
      tested: 0,
      familiar: 0,
      fuzzy: 0,
      unknown: 0,
    },
    byCategory: {
      academic: { tested: 0, familiar: 0, fuzzy: 0, unknown: 0 },
      daily: { tested: 0, familiar: 0, fuzzy: 0, unknown: 0 },
      domain: { tested: 0, familiar: 0, fuzzy: 0, unknown: 0 },
    },
    byType: {
      word: { tested: 0, familiar: 0, fuzzy: 0, unknown: 0 },
      phrase: { tested: 0, familiar: 0, fuzzy: 0, unknown: 0 },
      usage: { tested: 0, familiar: 0, fuzzy: 0, unknown: 0 },
    },
    weakSubCategories: [],
    updatedAt: "",
  };
}

function createEmptyLearningInventory() {
  return {
    version: 1,
    updatedAt: "",
    items: [],
  };
}

function createEmptyDailyLearningQueue() {
  return {
    version: 1,
    date: "",
    status: "draft",
    sourceMode: "unknown_and_fuzzy_priority",
    targetNewCount: 15,
    targetReviewCount: 15,
    newItems: [],
    reviewItems: [],
    verificationItems: [],
    storyItems: [],
    sourceMaterials: [],
    sessionIds: {
      learning: "",
      verification: "",
      review: "",
    },
    generatedAt: "",
    completedAt: "",
  };
}

function createEmptyMemorySchedule() {
  return {
    version: 1,
    defaultSteps: [
      { name: "D0", offsetDays: 0, purpose: "same_day_consolidation" },
      { name: "D1", offsetDays: 1, purpose: "next_day_review" },
      { name: "D3", offsetDays: 3, purpose: "early_stabilization" },
      { name: "D7", offsetDays: 7, purpose: "weekly_review" },
      { name: "D14", offsetDays: 14, purpose: "biweekly_review" },
      { name: "D30", offsetDays: 30, purpose: "monthly_review" },
      { name: "D60", offsetDays: 60, purpose: "long_term_retention" },
    ],
    items: [],
    updatedAt: "",
  };
}

function createEmptyWordLearningSessions() {
  return {
    version: 1,
    activeSessionId: "",
    sessions: [],
  };
}

function createEmptyStoryQueue() {
  return {
    version: 1,
    date: "",
    sourceItems: [],
    sourceMaterials: [],
    storyType: "mixed",
    status: "pending",
    storyId: "",
    constraints: {
      minTargetCoverage: 0.9,
      targetLengthWords: 160,
      difficulty: "controlled",
      allowDialogueTone: true,
    },
    outputs: {
      storyText: "",
      storyTranslationTask: "",
      storySummaryPrompt: "",
      storyAudioStatus: "pending",
    },
    generatedAt: "",
    completedAt: "",
  };
}

function createEmptyMaterialsIndex() {
  return {
    version: 1,
    materials: [],
    updatedAt: "",
  };
}

function createEmptyWeeklyWriting() {
  return {
    version: 1,
    schemaVersion: 3,
    weekKey: "",
    prompts: [],
    submissions: [],
    updatedAt: "",
  };
}

async function extractPdfTextFromBase64(base64Payload) {
  const clean = String(base64Payload || "").trim();
  if (!clean) {
    throw new Error("PDF data is required");
  }
  const normalized = clean.includes(",") ? clean.split(",").pop() : clean;
  const buffer = Buffer.from(normalized, "base64");
  if (!pdfParseModulePromise) {
    pdfParseModulePromise = import("pdf-parse");
  }
  const { PDFParse } = await pdfParseModulePromise;
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return String(result?.text || "").trim();
  } finally {
    await parser.destroy();
  }
}

async function extractDocxTextFromBase64(base64Payload) {
  const clean = String(base64Payload || "").trim();
  if (!clean) {
    throw new Error("DOCX data is required");
  }
  const normalized = clean.includes(",") ? clean.split(",").pop() : clean;
  const buffer = Buffer.from(normalized, "base64");
  const tempName = `english-reader-${Date.now()}-${Math.random().toString(16).slice(2)}.docx`;
  const tempPath = path.join("/private/tmp", tempName);
  fs.writeFileSync(tempPath, buffer);
  try {
    const { stdout } = await execFileAsync("/usr/bin/textutil", [
      "-convert",
      "txt",
      "-stdout",
      tempPath,
    ]);
    return String(stdout || "").trim();
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // ignore temp cleanup failures
    }
  }
}

function loadBank() {
  return readJson(bankSeedPath, []).filter((item) => item && item.active);
}

function loadBankMap() {
  return new Map(loadBank().map((item) => [item.id, item]));
}

function getBankSummary() {
  const bank = loadBank();
  return {
    total: bank.length,
    byCategory: bank.reduce((map, item) => {
      map[item.category] = (map[item.category] || 0) + 1;
      return map;
    }, {}),
    byType: bank.reduce((map, item) => {
      map[item.type] = (map[item.type] || 0) + 1;
      return map;
    }, {}),
  };
}

function loadSessions() {
  return readJson(sessionsPath, { version: 1, sessions: [] });
}

function loadLearningItems() {
  return readJson(learningItemsPath, createEmptyLearningInventory());
}

function loadDailyLearningQueue() {
  return readJson(dailyLearningQueuePath, createEmptyDailyLearningQueue());
}

function loadMemorySchedule() {
  return readJson(memorySchedulePath, createEmptyMemorySchedule());
}

function loadWordLearningSessions() {
  return readJson(wordLearningSessionsPath, createEmptyWordLearningSessions());
}

function loadStoryQueue() {
  return readJson(storyQueuePath, createEmptyStoryQueue());
}

function loadMaterialsIndex() {
  return readJson(materialsIndexPath, createEmptyMaterialsIndex());
}

function loadWeeklyWriting() {
  return readJson(weeklyWritingPath, createEmptyWeeklyWriting());
}

function sessionStats(session) {
  const responses = session.responses || [];
  const counts = { familiar: 0, fuzzy: 0, unknown: 0 };
  for (const response of responses) {
    if (counts[response.choice] !== undefined) {
      counts[response.choice] += 1;
    }
  }
  return {
    answered: responses.length,
    ...counts,
  };
}

function prioritizeItems(items, latestStatuses) {
  const ranked = {
    unseen: [],
    unknown: [],
    fuzzy: [],
    familiar: [],
  };

  for (const item of items) {
    const latest = latestStatuses.get(item.id);
    if (!latest) {
      ranked.unseen.push(item);
    } else if (latest.choice === "unknown") {
      ranked.unknown.push(item);
    } else if (latest.choice === "fuzzy") {
      ranked.fuzzy.push(item);
    } else {
      ranked.familiar.push(item);
    }
  }

  return [
    ...shuffle(ranked.unseen),
    ...shuffle(ranked.unknown),
    ...shuffle(ranked.fuzzy),
    ...shuffle(ranked.familiar),
  ];
}

function takeFromPool(pool, count) {
  if (count <= 0) return [];
  return pool.splice(0, Math.min(count, pool.length));
}

function bucketConfigForSize(size) {
  const usage = Math.max(1, Math.round(size * 0.2));
  const daily = Math.max(1, Math.round(size * 0.3));
  const academic = Math.max(1, Math.round(size * 0.25));
  const domain = Math.max(1, size - usage - daily - academic);

  return [
    {
      key: "daily",
      target: daily,
      filter: (item) => item.category === "daily" && item.type !== "usage",
    },
    {
      key: "academic",
      target: academic,
      filter: (item) => item.category === "academic" && item.type !== "usage",
    },
    {
      key: "domain",
      target: domain,
      filter: (item) => item.category === "domain" && item.type !== "usage",
    },
    {
      key: "usage",
      target: usage,
      filter: (item) => item.type === "usage",
    },
  ];
}

function buildFocusedPool(bank, focusCategory) {
  if (!focusCategory || focusCategory === "mixed") return bank;
  if (focusCategory === "usage") {
    return bank.filter((item) => item.type === "usage");
  }
  return bank.filter((item) => item.category === focusCategory);
}

function interleaveBuckets(selectedBuckets, fallbackPool, desiredSize) {
  const queue = [];

  while (queue.length < desiredSize) {
    let added = false;
    const last = queue[queue.length - 1];

    for (const bucket of selectedBuckets) {
      if (!bucket.items.length) continue;

      let index = bucket.items.findIndex((item) =>
        !last || (item.category !== last.category && item.type !== last.type),
      );

      if (index < 0) index = 0;
      const [next] = bucket.items.splice(index, 1);
      queue.push(next);
      added = true;

      if (queue.length >= desiredSize) break;
    }

    if (!added) break;
  }

  while (queue.length < desiredSize && fallbackPool.length) {
    const last = queue[queue.length - 1];
    let index = fallbackPool.findIndex((item) =>
      !last || (item.category !== last.category && item.type !== last.type),
    );
    if (index < 0) index = 0;
    const [next] = fallbackPool.splice(index, 1);
    queue.push(next);
  }

  return queue;
}

function buildQueue(size, mode = "diagnostic", focusCategory = "mixed") {
  const bank = loadBank();
  const sessionsData = loadSessions();
  const focusedBank = buildFocusedPool(bank, focusCategory);
  const desiredSize = Math.min(size, focusedBank.length);
  const latestStatuses = latestStatusByItem(sessionsData);
  const prioritized = prioritizeItems(focusedBank, latestStatuses);

  if (mode === "targeted") {
    const ranked = {
      unknown: [],
      fuzzy: [],
      unseen: [],
      familiar: [],
    };
    for (const item of focusedBank) {
      const latest = latestStatuses.get(item.id);
      if (!latest) ranked.unseen.push(item);
      else if (latest.choice === "unknown") ranked.unknown.push(item);
      else if (latest.choice === "fuzzy") ranked.fuzzy.push(item);
      else ranked.familiar.push(item);
    }

    return interleaveBuckets(
      [
        {
          key: focusCategory,
          items: [
            ...shuffle(ranked.unknown),
            ...shuffle(ranked.fuzzy),
            ...shuffle(ranked.unseen),
            ...shuffle(ranked.familiar),
          ],
        },
      ],
      [],
      desiredSize,
    );
  }

  const configs = bucketConfigForSize(desiredSize);
  const selectedBuckets = configs.map((config) => {
    const bucketItems = prioritized.filter(config.filter);
    return {
      key: config.key,
      items: takeFromPool([...bucketItems], config.target),
    };
  });

  const selectedIds = new Set(selectedBuckets.flatMap((bucket) => bucket.items.map((item) => item.id)));
  const fallbackPool = prioritized.filter((item) => !selectedIds.has(item.id));

  return interleaveBuckets(selectedBuckets, fallbackPool, desiredSize);
}

function rebuildDerivedDataFromSessions(sessionsData) {
  const bank = loadBank();
  const bankMap = new Map(bank.map((item) => [item.id, item]));
  const existingLexicon = readJson(lexiconPath, { version: 1, items: [] });
  const sessions = sessionsData.sessions || [];
  const responsesByItem = new Map();

  for (const session of sessions) {
    for (const response of session.responses || []) {
      if (!bankMap.has(response.itemId)) continue;
      if (!responsesByItem.has(response.itemId)) {
        responsesByItem.set(response.itemId, []);
      }
      responsesByItem.get(response.itemId).push(response);
    }
  }

  const lexiconItems = [];
  const diagnostics = createEmptyDiagnostics();
  const weakSubCategories = new Map();

  for (const [itemId, responses] of responsesByItem.entries()) {
    const item = bankMap.get(itemId);
    const sortedResponses = [...responses].sort((left, right) =>
      String(left.answeredAt).localeCompare(String(right.answeredAt)),
    );
    const latest = sortedResponses[sortedResponses.length - 1];
    const wrongCount = sortedResponses.filter((entry) => entry.choice !== "familiar").length;
    const responseCount = sortedResponses.length;
    const status = latest.choice;
    const priority = status === "unknown" ? "high" : status === "fuzzy" ? "medium" : "low";

    lexiconItems.push({
      itemId,
      text: item.text,
      type: item.type,
      category: item.category,
      subCategory: item.subCategory,
      sourceType: "diagnostic_bank",
      status,
      firstTestedAt: sortedResponses[0].answeredAt,
      lastTestedAt: latest.answeredAt,
      reviewCount: Math.max(responseCount - 1, 0),
      wrongCount,
      priority,
      example: item.example,
      notes: "",
    });

    diagnostics.summary.tested += 1;
    diagnostics.summary[status] += 1;

    if (!diagnostics.byCategory[item.category]) {
      diagnostics.byCategory[item.category] = { tested: 0, familiar: 0, fuzzy: 0, unknown: 0 };
    }
    diagnostics.byCategory[item.category].tested += 1;
    diagnostics.byCategory[item.category][status] += 1;

    if (!diagnostics.byType[item.type]) {
      diagnostics.byType[item.type] = { tested: 0, familiar: 0, fuzzy: 0, unknown: 0 };
    }
    diagnostics.byType[item.type].tested += 1;
    diagnostics.byType[item.type][status] += 1;

    if (status !== "familiar") {
      weakSubCategories.set(
        item.subCategory,
        (weakSubCategories.get(item.subCategory) || 0) + (status === "unknown" ? 2 : 1),
      );
    }
  }

  const customItems = (existingLexicon.items || []).filter((item) => item.sourceType && item.sourceType !== "diagnostic_bank");
  const mergedLexicon = [...lexiconItems, ...customItems];

  mergedLexicon.sort((left, right) => {
    const statusRank = { unknown: 0, fuzzy: 1, familiar: 2 };
    const byStatus = statusRank[left.status] - statusRank[right.status];
    if (byStatus !== 0) return byStatus;
    return left.text.localeCompare(right.text);
  });

  diagnostics.weakSubCategories = [...weakSubCategories.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([subCategory, score]) => ({ subCategory, score }));
  diagnostics.updatedAt = nowIso();

  const reviewCandidates = {
    version: 1,
    items: mergedLexicon
      .filter((item) => item.status !== "familiar")
      .map((item) => ({
        itemId: item.itemId,
        text: item.text,
        type: item.type,
        category: item.category,
        subCategory: item.subCategory,
        status: item.status,
        priority: item.priority,
        reason: manualReasonForSource(item.sourceType, item.status),
        nextAction: "include_in_materials",
        wrongCount: item.wrongCount,
      })),
  };

  writeJson(lexiconPath, { version: 1, items: mergedLexicon });
  writeJson(diagnosticsPath, diagnostics);
  writeJson(reviewCandidatesPath, reviewCandidates);
}

function createLearningRecordFromLexicon(lexiconItem, bankItem) {
  const status = lexiconItem.status || "unknown";
  return {
    itemId: lexiconItem.itemId,
    text: lexiconItem.text,
    type: lexiconItem.type,
    category: lexiconItem.category,
    subCategory: lexiconItem.subCategory,
    diagnosticStatus: status,
    learningStage: status === "familiar" ? "learned" : "new",
    masteryLevel: status === "familiar" ? 2 : 0,
    priorityScore: computePriorityScore({
      status,
      wrongCount: lexiconItem.wrongCount || 0,
      category: lexiconItem.category,
      type: lexiconItem.type,
    }),
    importanceScore: bankItem?.difficulty === "advanced" ? 0.75 : bankItem?.difficulty === "intermediate" ? 0.85 : 0.92,
    interestTags: bankItem?.tags || [],
    firstSeenAt: lexiconItem.firstTestedAt || nowIso(),
    lastSeenAt: lexiconItem.lastTestedAt || nowIso(),
    lastLearnedAt: "",
    lastReviewedAt: "",
    lastOutcome: "",
    wrongCount: lexiconItem.wrongCount || 0,
    stableCount: status === "familiar" ? 1 : 0,
    lapseCount: 0,
    currentMemoryStep: status === "familiar" ? "D7" : "D0",
    nextDueAt: "",
    origin: {
      sourceType: lexiconItem.sourceType || "diagnostic_bank",
      sourceId: lexiconItem.itemId,
      sourceSessionId: "",
    },
    links: {
      lexiconItemId: lexiconItem.itemId,
      materialIds: [],
      storyIds: [],
    },
    enrichment: {
      glossZh: bankItem?.glossZh || lexiconItem.glossZh || "",
      example: bankItem?.example || lexiconItem.example || "",
      exampleZh: lexiconItem.exampleZh || "",
      root: lexiconItem.root || "",
      derivatives: lexiconItem.derivatives || [],
      relatedItems: lexiconItem.relatedItems || [],
    },
    notes: "",
  };
}

function syncLearningItemsFromLexicon() {
  const lexicon = readJson(lexiconPath, { version: 1, items: [] });
  const bankMap = loadBankMap();
  const learningData = loadLearningItems();
  const existingMap = new Map((learningData.items || []).map((item) => [item.itemId, item]));

  let changed = false;
  for (const lexiconItem of lexicon.items || []) {
    const bankItem = bankMap.get(lexiconItem.itemId);
    if (!existingMap.has(lexiconItem.itemId)) {
      existingMap.set(
        lexiconItem.itemId,
        createLearningRecordFromLexicon(lexiconItem, bankItem),
      );
      changed = true;
      continue;
    }

    const existing = existingMap.get(lexiconItem.itemId);
    const previousStatus = existing.diagnosticStatus;
    existing.text = lexiconItem.text;
    existing.type = lexiconItem.type;
    existing.category = lexiconItem.category;
    existing.subCategory = lexiconItem.subCategory;
    existing.diagnosticStatus = lexiconItem.status;
    existing.priorityScore = computePriorityScore({
      status: lexiconItem.status,
      wrongCount: lexiconItem.wrongCount || 0,
      category: lexiconItem.category,
      type: lexiconItem.type,
    });
    existing.wrongCount = lexiconItem.wrongCount || existing.wrongCount || 0;
    existing.lastSeenAt = lexiconItem.lastTestedAt || existing.lastSeenAt || nowIso();
    existing.interestTags = bankItem?.tags || existing.interestTags || [];
    existing.enrichment = {
      glossZh: bankItem?.glossZh || lexiconItem.glossZh || existing.enrichment?.glossZh || "",
      example: bankItem?.example || lexiconItem.example || existing.enrichment?.example || "",
      exampleZh: lexiconItem.exampleZh || existing.enrichment?.exampleZh || "",
      root: lexiconItem.root || existing.enrichment?.root || "",
      derivatives: lexiconItem.derivatives || existing.enrichment?.derivatives || [],
      relatedItems: lexiconItem.relatedItems || existing.enrichment?.relatedItems || [],
    };

    if (lexiconItem.status !== "familiar" && previousStatus === "familiar" && existing.learningStage === "mastered") {
      existing.learningStage = "relearning";
      existing.currentMemoryStep = "D0";
      existing.nextDueAt = nowIso();
      existing.lapseCount = (existing.lapseCount || 0) + 1;
    }

    changed = true;
  }

  const merged = [...existingMap.values()].sort((left, right) => {
    if (left.priorityScore !== right.priorityScore) return right.priorityScore - left.priorityScore;
    return left.text.localeCompare(right.text);
  });

  const result = {
    version: 1,
    updatedAt: nowIso(),
    items: merged,
  };

  if (changed || !learningData.updatedAt) {
    writeJson(learningItemsPath, result);
  }

  return result;
}

function rebuildReviewCandidatesFromLexicon() {
  const lexicon = readJson(lexiconPath, { version: 1, items: [] });
  const items = (lexicon.items || [])
    .filter((item) => item.status !== "familiar")
    .map((item) => ({
      itemId: item.itemId,
      text: item.text,
      type: item.type,
      category: item.category,
      subCategory: item.subCategory,
      status: item.status,
      priority: item.priority || (item.status === "unknown" ? "high" : "medium"),
      reason: manualReasonForSource(item.sourceType, item.status),
      nextAction: "include_in_materials",
      wrongCount: item.wrongCount || 0,
    }));
  const payload = { version: 1, items };
  writeJson(reviewCandidatesPath, payload);
  return payload;
}

function manualReasonForSource(sourceType, status) {
  if (sourceType === "manual_entry") return "manual_input";
  if (sourceType === "custom_selection") return "reader_selection";
  return status === "unknown" ? "diagnostic_unknown" : "diagnostic_fuzzy";
}

function normalizeManualType(mode, text) {
  if (["word", "phrase", "usage"].includes(mode)) return mode;
  const cleanText = String(text || "").trim();
  if (!cleanText) return "word";
  if (/[.!?]/.test(cleanText) && cleanText.split(/\s+/).length >= 6) return "usage";
  if (/\s/.test(cleanText)) return "phrase";
  return "word";
}

function findBankItemByText(text) {
  const clean = String(text || "").trim().toLowerCase();
  if (!clean) return null;
  const bank = readJson(bankSeedPath, []);
  return bank.find((item) => String(item.text || "").trim().toLowerCase() === clean) || null;
}

function inferManualCategory(text) {
  const clean = String(text || "").trim().toLowerCase();
  const domainHints = [
    "benchmark", "multimodal", "dataset", "prompt", "model", "retrieval", "annotation", "museum",
    "heritage", "hci", "design", "evaluation", "pipeline", "query", "interface", "workflow",
  ];
  const academicHints = [
    "abstract", "argument", "citation", "cohesion", "clause", "evidence", "grammar", "hypothesis",
    "methodology", "paragraph", "precision", "research", "seminar", "thesis", "transition",
    "in light of", "in terms of", "with respect to", "as a result", "in contrast", "in addition",
  ];

  if (domainHints.some((hint) => clean.includes(hint))) return "domain";
  if (academicHints.some((hint) => clean.includes(hint))) return "academic";
  if (clean.split(/\s+/).length >= 3) return "academic";
  return "daily";
}

function inferManualSubCategory(text, category) {
  const clean = String(text || "").trim().toLowerCase();
  if (category === "domain") {
    if (/(benchmark|score|metric|evaluation)/.test(clean)) return "benchmark";
    if (/(dataset|annotation|label|schema)/.test(clean)) return "dataset";
    if (/(museum|heritage|artifact|dynasty|archive)/.test(clean)) return "cultural-heritage";
    if (/(interface|user|screen|interaction)/.test(clean)) return "HCI";
    if (/(design|prototype|workflow|layout)/.test(clean)) return "design";
    return "AI";
  }
  if (category === "academic") {
    if (/(paragraph|draft|citation|transition|cohesion|thesis)/.test(clean)) return "writing";
    if (/(argument|evidence|contrast|claim|hypothesis)/.test(clean)) return "argument";
    if (/(abstract|seminar|reading|article|passage)/.test(clean)) return "reading";
    return "research";
  }
  if (/(travel|commute|platform|route)/.test(clean)) return "travel";
  if (/(rent|lease|room|apartment|housing)/.test(clean)) return "housing";
  if (/(shop|grocery|discount|payment)/.test(clean)) return "shopping";
  return "life";
}

function inferManualGloss(text, category, type) {
  const clean = String(text || "").trim();
  if (category === "domain") {
    return type === "word"
      ? `研究领域词：${clean}`
      : `研究领域表达：${clean}`;
  }
  if (category === "academic") {
    return type === "word"
      ? `学术高频词：${clean}`
      : `学术表达：${clean}`;
  }
  return type === "word"
    ? `日常高频词：${clean}`
    : `日常表达：${clean}`;
}

function inferManualExample(text, category, type, subCategory) {
  const clean = String(text || "").trim();
  if (type === "usage") return clean;
  if (type === "phrase") {
    if (category === "domain") return `I want to reuse "${clean}" when I explain a ${subCategory} issue in my research.`;
    if (category === "academic") return `I want to reuse "${clean}" when I summarize a reading or explain an academic point.`;
    return `I want to reuse "${clean}" in a natural daily conversation this week.`;
  }
  if (category === "domain") return `The word ${clean} appears often in benchmark, design, or multimodal research contexts.`;
  if (category === "academic") return `The word ${clean} appears often in academic reading and short analytical writing.`;
  return `The word ${clean} is useful in everyday communication and routine planning.`;
}

function inferManualMetadata(text, provided = {}) {
  const bankItem = findBankItemByText(text);
  const type = provided.type || normalizeManualType("auto", text);
  const category = provided.category || inferManualCategory(text);
  const subCategory = provided.subCategory || inferManualSubCategory(text, category);
  return {
    type: bankItem?.type || type,
    category: bankItem?.category || category,
    subCategory: bankItem?.subCategory || subCategory,
    glossZh: provided.glossZh || bankItem?.glossZh || inferManualGloss(text, bankItem?.category || category, bankItem?.type || type),
    example: provided.example || bankItem?.example || inferManualExample(text, bankItem?.category || category, bankItem?.type || type, bankItem?.subCategory || subCategory),
  };
}

function splitManualTexts(rawValue) {
  return String(rawValue || "")
    .split(/[\n,，;；]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function upsertManualLexiconItem(lexicon, {
  text = "",
  type = "",
  category = "",
  subCategory = "",
  status = "unknown",
  glossZh = "",
  example = "",
  notes = "",
} = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;
  if (!["unknown", "fuzzy", "familiar"].includes(status)) {
    throw new Error("Invalid manual item status");
  }

  const inferred = inferManualMetadata(cleanText, { type, category, subCategory, glossZh, example });
  const finalType = inferred.type;
  const finalCategory = inferred.category;
  const finalSubCategory = inferred.subCategory;
  const finalGlossZh = inferred.glossZh;
  const finalExample = inferred.example;

  const normalized = cleanText.toLowerCase();
  const refNow = nowIso();
  const existing = (lexicon.items || []).find((item) => String(item.text || "").toLowerCase() === normalized);

  if (existing) {
    existing.type = finalType;
    existing.category = finalCategory;
    existing.subCategory = finalSubCategory || existing.subCategory || "manual";
    existing.sourceType = existing.sourceType || "manual_entry";
    existing.status = status;
    existing.lastTestedAt = refNow;
    existing.priority = status === "unknown" ? "high" : status === "fuzzy" ? "medium" : "low";
    existing.glossZh = finalGlossZh || existing.glossZh || "";
    existing.example = finalExample || existing.example || "";
    existing.notes = notes || existing.notes || "";
    return { itemId: existing.itemId, text: cleanText, existed: true };
  }

  const created = {
    itemId: `manual-${slugify(cleanText)}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    text: cleanText,
    type: finalType,
    category: finalCategory,
    subCategory: finalSubCategory || "manual",
    sourceType: "manual_entry",
    status,
    firstTestedAt: refNow,
    lastTestedAt: refNow,
    reviewCount: 0,
    wrongCount: status === "familiar" ? 0 : 1,
    priority: status === "unknown" ? "high" : status === "fuzzy" ? "medium" : "low",
    example: finalExample || "",
    glossZh: finalGlossZh || "",
    notes: notes || "",
    exampleZh: "",
    root: "",
    derivatives: [],
    relatedItems: [],
  };
  lexicon.items.push(created);
  return { itemId: created.itemId, text: cleanText, existed: false };
}

function addManualLexiconItem({
  text = "",
  type = "",
  category = "",
  subCategory = "",
  status = "unknown",
  glossZh = "",
  example = "",
  notes = "",
} = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("Manual text is required");
  }

  const lexicon = readJson(lexiconPath, { version: 1, items: [] });
  upsertManualLexiconItem(lexicon, { text: cleanText, type, category, subCategory, status, glossZh, example, notes });

  writeJson(lexiconPath, lexicon);
  const learningData = syncLearningItemsFromLexicon();
  rebuildReviewCandidatesFromLexicon();

  return {
    ok: true,
    item: (learningData.items || []).find((item) => item.text.toLowerCase() === cleanText.toLowerCase()) || null,
    overview: getLearningOverview(),
  };
}

function addManualLexiconItems({
  texts = [],
  typeMode = "auto",
  category = "",
  subCategory = "",
  status = "unknown",
  notes = "",
} = {}) {
  const list = Array.isArray(texts) ? texts : splitManualTexts(texts);
  const cleaned = [...new Set(list.map((item) => String(item || "").trim()).filter(Boolean))];
  if (!cleaned.length) {
    throw new Error("Manual texts are required");
  }

  const lexicon = readJson(lexiconPath, { version: 1, items: [] });
  const results = [];

  for (const text of cleaned) {
    results.push(
      upsertManualLexiconItem(lexicon, {
        text,
        type: typeMode === "auto" ? "" : normalizeManualType(typeMode, text),
        category,
        subCategory,
        status,
        notes,
      }),
    );
  }

  writeJson(lexiconPath, lexicon);
  const learningData = syncLearningItemsFromLexicon();
  rebuildReviewCandidatesFromLexicon();

  const addedItems = results
    .map((result) => (learningData.items || []).find((item) => item.itemId === result.itemId))
    .filter(Boolean);

  return {
    ok: true,
    count: addedItems.length,
    items: addedItems,
    overview: getLearningOverview(),
  };
}

function getStepMap(scheduleData) {
  return new Map((scheduleData.defaultSteps || []).map((step) => [step.name, step]));
}

function getNextStepName(scheduleData, currentStep) {
  const steps = (scheduleData.defaultSteps || []).map((step) => step.name);
  const index = steps.indexOf(currentStep);
  if (index < 0) return steps[0] || "D0";
  if (index >= steps.length - 1) return "";
  return steps[index + 1];
}

function scheduleDueForStep(scheduleData, stepName, baseIso = nowIso()) {
  const stepMap = getStepMap(scheduleData);
  const step = stepMap.get(stepName);
  return addDaysIso(baseIso, step?.offsetDays ?? 0);
}

function findScheduleRecord(scheduleData, itemId) {
  return (scheduleData.items || []).find((item) => item.itemId === itemId);
}

function ensureScheduleRecord(scheduleData, itemId) {
  const existing = findScheduleRecord(scheduleData, itemId);
  if (existing) return existing;

  const record = {
    itemId,
    currentStage: "learning",
    currentStep: "D0",
    dueAt: "",
    lastReviewedAt: "",
    nextDueAt: "",
    successCount: 0,
    lapseCount: 0,
    history: [],
  };
  scheduleData.items.push(record);
  return record;
}

function serializeLearningItem(item, scheduleRecord) {
  return {
    itemId: item.itemId,
    text: item.text,
    type: item.type,
    category: item.category,
    subCategory: item.subCategory,
    diagnosticStatus: item.diagnosticStatus,
    learningStage: item.learningStage,
    masteryLevel: item.masteryLevel,
    priorityScore: item.priorityScore,
    wrongCount: item.wrongCount,
    currentMemoryStep: item.currentMemoryStep,
    nextDueAt: item.nextDueAt || scheduleRecord?.nextDueAt || "",
    glossZh: item.enrichment?.glossZh || "",
    example: item.enrichment?.example || "",
    exampleZh: item.enrichment?.exampleZh || "",
    root: item.enrichment?.root || "",
    derivatives: item.enrichment?.derivatives || [],
    relatedItems: item.enrichment?.relatedItems || [],
    interestTags: item.interestTags || [],
  };
}

function latestMaterialSnippets(materialsData, limit = 2) {
  return (materialsData.materials || [])
    .slice()
    .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
    .slice(0, limit)
    .map((material) => ({
      materialId: material.materialId,
      title: material.title,
      excerpt: (material.sections?.[0]?.text || material.rawText || "").slice(0, 180).trim(),
      category: material.category || "general",
    }));
}

function composeStoryParagraphs(items, materialSnippets = []) {
  const normalizedItems = items.filter(Boolean);
  const materialLead = materialSnippets[0];
  const intro = materialLead
    ? `This morning, I opened my notes for ${materialLead.title} and tried to connect it with the phrases I need to remember this week.`
    : "This morning, I opened my study notebook and tried to connect today’s English items with one clear scene.";

  const bodySentences = normalizedItems.map((item) => {
    if (item.type === "usage") return ensureSentence(item.text);
    if (item.example) return ensureSentence(item.example);
    if (item.type === "phrase") {
      return ensureSentence(`I want to ${item.text} in a sentence that feels natural and easy to recall later`);
    }
    return ensureSentence(`Today I want to remember the word ${item.text} and use it in a realistic context`);
  });

  const bridge = materialLead?.excerpt
    ? ensureSentence(`The article reminded me that ${materialLead.excerpt}`)
    : "The more these items appear in one scene, the easier it is for me to recall them later.";
  const closing = "By the end of the study block, I could summarize the gist aloud and explain which expressions still felt uncertain.";

  const first = [intro, bridge, ...bodySentences.slice(0, 4)].join(" ");
  const second = [...bodySentences.slice(4, 8)].join(" ");
  const third = [...bodySentences.slice(8), closing].filter(Boolean).join(" ");
  return [first, second, third].filter((paragraph) => paragraph.trim());
}

function generateTodayStory({ date = todayDate() } = {}) {
  const queueData = loadDailyLearningQueue();
  const existing = loadStoryQueue();
  const hydratedQueue = queueData.date === date ? hydrateDailyLearningQueue(queueData) : null;
  const sourceItems = hydratedQueue?.resolvedStoryItems?.length
    ? hydratedQueue.resolvedStoryItems
    : hydratedQueue?.resolvedNewItems?.slice(0, 12) || [];
  if (!sourceItems.length) {
    throw new Error("No story source items available for today");
  }

  const materialsData = loadMaterialsIndex();
  const snippets = latestMaterialSnippets(materialsData, 2);
  const paragraphs = composeStoryParagraphs(sourceItems, snippets);
  const glossary = sourceItems.map((item) => ({
    itemId: item.itemId,
    text: item.text,
    glossZh: item.glossZh || "",
    type: item.type,
  }));

  const story = {
    ...existing,
    version: 1,
    date,
    sourceItems: sourceItems.map((item) => ({ itemId: item.itemId, role: "target_word" })),
    sourceMaterials: snippets.map((item) => ({
      materialId: item.materialId,
      title: item.title,
      excerpt: item.excerpt,
    })),
    storyType: snippets.some((item) => item.category === "academic" || item.category === "domain") ? "academic_plus_daily" : "daily",
    status: "ready",
    storyId: existing.storyId || `story-${date}-${Date.now()}`,
    constraints: {
      minTargetCoverage: 0.9,
      targetLengthWords: 160,
      difficulty: "controlled",
      allowDialogueTone: true,
    },
    outputs: {
      storyText: paragraphs.join("\n\n"),
      storyTranslationTask: "先通读这篇短文，再把它翻译成中文。尽量保留语气和逻辑关系，不要只逐词直译。",
      storySummaryPrompt: "请用 3-4 句英文总结这篇短文的 gist，并点出今天仍然不稳的两个表达。",
      storyAudioStatus: "todo",
      targetGlossary: glossary,
      referencePoints: [
        "交代今天的学习场景或阅读材料",
        "把今日词汇放进一段连贯的小故事里",
        "最后用自己的话总结 gist 或指出难点",
      ],
      submissions: existing.outputs?.submissions || [],
    },
    generatedAt: nowIso(),
    completedAt: existing.completedAt || "",
  };

  writeJson(storyQueuePath, story);
  return story;
}

function getTodayStory(date = todayDate()) {
  const story = loadStoryQueue();
  if (story.date === date && story.outputs?.storyText) {
    return story;
  }
  return generateTodayStory({ date });
}

function submitStoryTranslation({ date = todayDate(), translation = "" } = {}) {
  const story = getTodayStory(date);
  const cleanTranslation = String(translation || "").trim();
  if (!cleanTranslation) {
    throw new Error("Translation text is required");
  }
  const wordCount = cleanTranslation.split(/\s+/).filter(Boolean).length;
  const feedback = [];
  if (wordCount < 60) feedback.push("你的译文现在偏短，可能漏掉了一些细节或逻辑连接。");
  if (wordCount >= 60) feedback.push("译文长度基本够了，下一步重点检查句间逻辑和语气是否自然。");
  feedback.push("对照目标词表，检查是否把关键动作词和搭配翻出来了，而不是只保留模糊意思。");
  feedback.push("如果某句很难直译，先保留英文原意，再用更自然的中文重写。");

  const submission = {
    submittedAt: nowIso(),
    translation: cleanTranslation,
    wordCount,
    feedback,
  };
  story.outputs.submissions = [...(story.outputs.submissions || []), submission];
  story.completedAt = nowIso();
  writeJson(storyQueuePath, story);
  return {
    ok: true,
    submission,
    referencePoints: story.outputs.referencePoints || [],
    glossary: story.outputs.targetGlossary || [],
  };
}

function splitIntoSections(text) {
  const paragraphs = String(text || "")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const source = paragraphs.length ? paragraphs : String(text || "").split(/\n/g).map((line) => line.trim()).filter(Boolean);
  return source.map((paragraph, index) => ({
    sectionId: `section-${index + 1}`,
    title: `Section ${index + 1}`,
    text: paragraph,
  }));
}

const stopwordSet = new Set([
  "about", "after", "again", "also", "among", "because", "before", "being", "between",
  "both", "could", "during", "each", "from", "have", "into", "itself", "just", "many",
  "might", "more", "most", "other", "over", "same", "such", "than", "that", "their",
  "there", "these", "they", "this", "those", "through", "under", "very", "what", "when",
  "where", "which", "while", "with", "would", "your", "into", "upon", "them", "then",
  "were", "been", "ours", "ourselves", "herself", "himself", "around", "within", "using",
  "used", "uses", "study", "paper", "research", "results", "method", "methods", "data",
  "analysis", "model", "models", "design", "human", "large", "language",
]);

function normalizeForMatch(text) {
  return ` ${String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ")} `.replace(/\s+/g, " ");
}

function extractMaterialTitleFromText(text, fileName = "") {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
  const compactLead = lines.find((line) =>
    line.length >= 3 &&
    line.length <= 60 &&
    /[A-Za-z]/.test(line) &&
    !/^[0-9①②③④⑤⑥⑦⑧⑨\.\-\s]+$/.test(line),
  );
  const preferred = lines.find((line) =>
    line.length >= 12 &&
    line.length <= 140 &&
    !/^(abstract|introduction|keywords|contents?)$/i.test(line) &&
    !/^[0-9①②③④⑤⑥⑦⑧⑨\.\-\s]+$/.test(line),
  );
  return compactLead || preferred || String(fileName || "").replace(/\.[^.]+$/, "") || "Untitled material";
}

function summarizeMaterialText(text) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const sentences = compact.match(/[^.!?]+[.!?]?/g) || [];
  const picked = [];
  let length = 0;
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (!clean) continue;
    picked.push(clean);
    length += clean.length;
    if (picked.length >= 3 || length > 320) break;
  }
  return picked.join(" ").trim();
}

function firstSentenceContaining(text, needle) {
  const sentences = String(text || "").match(/[^.!?\n]+[.!?\n]?/g) || [];
  const normalizedNeedle = String(needle || "").toLowerCase();
  const match = sentences.find((sentence) => sentence.toLowerCase().includes(normalizedNeedle));
  return (match || "").trim();
}

function recommendCandidatesFromMaterial(text, category = "daily") {
  const normalizedText = normalizeForMatch(text);
  const bank = loadBank().filter((item) => item.type !== "usage");
  const learningData = syncLearningItemsFromLexicon();
  const learningMap = new Map((learningData.items || []).map((item) => [item.itemId, item]));
  const lexicon = readJson(lexiconPath, { version: 1, items: [] });
  const lexiconByText = new Map((lexicon.items || []).map((item) => [String(item.text || "").toLowerCase(), item]));

  const matched = [];
  for (const item of bank) {
    const needle = normalizeForMatch(item.text).trim();
    if (!needle) continue;
    if (!normalizedText.includes(` ${needle} `)) continue;
    const lexiconItem = lexiconByText.get(String(item.text || "").toLowerCase());
    const learningItem = learningMap.get(item.id);
    const statusHint = lexiconItem?.status || learningItem?.diagnosticStatus || "unseen";
    const statusScore = statusHint === "unknown" ? 4 : statusHint === "fuzzy" ? 3 : statusHint === "unseen" ? 2 : 1;
    const typeScore = item.type === "phrase" ? 1.2 : 1;
    const categoryScore = item.category === category ? 1 : item.category === "domain" || item.category === "academic" ? 0.9 : 0.75;
    const score = statusScore * 10 + typeScore * 4 + categoryScore * 3;
    matched.push({
      itemId: item.id,
      text: item.text,
      type: item.type,
      category: item.category,
      subCategory: item.subCategory,
      glossZh: item.glossZh || "",
      statusHint,
      reason: statusHint === "unknown"
        ? "这项已在你的词汇书里标记为不认识，而且当前材料中出现了。"
        : statusHint === "fuzzy"
          ? "这项已在你的词汇书里标记为模糊，适合趁读材料时顺手收回。"
          : statusHint === "unseen"
            ? "这是新材料中命中的可学习词或短语，适合加入后续计划。"
            : "这项你已经比较熟，但它在当前语料中出现，适合快速复现。",
      context: firstSentenceContaining(text, item.text),
      score,
    });
  }

  const dedupedMatched = [...matched
    .reduce((map, item) => {
      const key = item.text.toLowerCase();
      const existing = map.get(key);
      if (!existing || item.score > existing.score) {
        map.set(key, item);
      }
      return map;
    }, new Map())
    .values()];

  const selected = dedupedMatched
    .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text))
    .slice(0, 10);

  if (selected.length >= 6) return selected;

  const tokens = String(text || "").toLowerCase().match(/[a-z][a-z-]{4,}/g) || [];
  const freq = new Map();
  for (const token of tokens) {
    if (stopwordSet.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  const usedTexts = new Set(selected.map((item) => item.text.toLowerCase()));
  const fallback = [...freq.entries()]
    .filter(([token, count]) => count >= 2 && !usedTexts.has(token))
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10 - selected.length)
    .map(([token, count]) => ({
      itemId: "",
      text: token,
      type: "word",
      category,
      subCategory: "material-keyword",
      glossZh: "",
      statusHint: "unseen",
      reason: `这个词在新语料中出现了 ${count} 次，适合你确认是否要收进词汇库。`,
      context: firstSentenceContaining(text, token),
      score: count,
    }));

  return [...selected, ...fallback];
}

function analyzeMaterial({ text, fileName = "", category = "daily" }) {
  const extractedTitle = extractMaterialTitleFromText(text, fileName);
  return {
    extractedTitle,
    summary: summarizeMaterialText(text),
    recommendedCandidates: recommendCandidatesFromMaterial(text, category),
  };
}

function getMaterialsPayload() {
  return loadMaterialsIndex();
}

async function saveMaterial({
  title = "",
  sourceType = "txt",
  category = "daily",
  content = "",
  pdfBase64 = "",
  docxBase64 = "",
  fileName = "",
  originalPath = "",
  notes = "",
} = {}) {
  const requestedTitle = String(title || "").trim();

  let cleanContent = String(content || "").trim();
  if (!cleanContent && sourceType === "pdf") {
    cleanContent = await extractPdfTextFromBase64(pdfBase64);
  }
  if (!cleanContent && sourceType === "docx") {
    cleanContent = await extractDocxTextFromBase64(docxBase64);
  }
  if (!cleanContent) {
    throw new Error(
      sourceType === "pdf"
        ? "PDF 正文提取失败，请确认文件可读，或临时粘贴正文。"
        : sourceType === "docx"
          ? "DOCX 正文提取失败，请确认文件可读，或临时粘贴正文。"
          : "Material content is required",
    );
  }

  const materials = loadMaterialsIndex();
  const sections = splitIntoSections(cleanContent);
  const analysis = analyzeMaterial({ text: cleanContent, fileName, category });
  const cleanTitle = requestedTitle || analysis.extractedTitle || String(fileName || "Untitled material").replace(/\.[^.]+$/, "");
  const materialId = `material-${Date.now()}`;
  const payload = {
    materialId,
    title: cleanTitle,
    sourceType,
    category,
    status: "ready",
    fileName: fileName || cleanTitle,
    originalPath,
    rawText: cleanContent,
    sections,
    linkedItemIds: [],
    notes,
    analysis,
    metadata: {
      paragraphCount: sections.length,
      wordCount: cleanContent.split(/\s+/).filter(Boolean).length,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  materials.materials.unshift(payload);
  materials.updatedAt = nowIso();
  writeJson(materialsIndexPath, materials);
  return payload;
}

function lookupText(text) {
  const normalized = String(text || "").trim().toLowerCase();
  if (!normalized) return { matches: [], learningMatches: [] };
  const bank = loadBank();
  const bankMatches = bank
    .filter((item) => item.text.toLowerCase() === normalized || item.text.toLowerCase().includes(normalized))
    .slice(0, 8)
    .map((item) => ({
      itemId: item.id,
      text: item.text,
      type: item.type,
      category: item.category,
      subCategory: item.subCategory,
      glossZh: item.glossZh || "",
      example: item.example || "",
    }));
  const learningData = syncLearningItemsFromLexicon();
  const learningMatches = (learningData.items || [])
    .filter((item) => item.text.toLowerCase() === normalized || item.text.toLowerCase().includes(normalized))
    .slice(0, 8)
    .map((item) => ({
      itemId: item.itemId,
      text: item.text,
      type: item.type,
      category: item.category,
      subCategory: item.subCategory,
      status: item.diagnosticStatus,
      glossZh: item.enrichment?.glossZh || "",
      example: item.enrichment?.example || "",
    }));
  return { matches: bankMatches, learningMatches };
}

function collectReaderSelection({
  text = "",
  materialId = "",
  category = "daily",
  context = "",
} = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("Selected text is required");
  }

  const materials = loadMaterialsIndex();
  const material = (materials.materials || []).find((entry) => entry.materialId === materialId);
  const normalized = cleanText.toLowerCase();
  const lexicon = readJson(lexiconPath, { version: 1, items: [] });
  const existing = (lexicon.items || []).find((item) => item.text.toLowerCase() === normalized);
  const match = lookupText(cleanText).matches[0];

  let itemId = existing?.itemId;
  if (!existing) {
    itemId = `custom-${slugify(cleanText)}-${Date.now()}`;
    lexicon.items.push({
      itemId,
      text: cleanText,
      type: cleanText.includes(" ") ? "phrase" : "word",
      category,
      subCategory: material?.category || "reader",
      sourceType: "custom_selection",
      status: "fuzzy",
      firstTestedAt: nowIso(),
      lastTestedAt: nowIso(),
      reviewCount: 0,
      wrongCount: 1,
      priority: "medium",
      example: context || match?.example || "",
      notes: material ? `Collected from ${material.title}` : "Collected from reader",
    });
    writeJson(lexiconPath, lexicon);
  }

  if (material) {
    material.linkedItemIds = dedupe([...(material.linkedItemIds || []), itemId]);
    material.updatedAt = nowIso();
    materials.updatedAt = nowIso();
    writeJson(materialsIndexPath, materials);
  }

  syncLearningItemsFromLexicon();
  rebuildReviewCandidatesFromLexicon();

  const learningData = loadLearningItems();
  const linked = (learningData.items || []).find((item) => item.itemId === itemId);
  if (linked && material && !linked.links.materialIds.includes(material.materialId)) {
    linked.links.materialIds.push(material.materialId);
    linked.enrichment.example = linked.enrichment.example || context || match?.example || "";
    linked.enrichment.glossZh = linked.enrichment.glossZh || match?.glossZh || "";
    writeJson(learningItemsPath, {
      version: learningData.version || 1,
      updatedAt: nowIso(),
      items: learningData.items,
    });
  }

  return {
    ok: true,
    itemId,
    text: cleanText,
    linkedStatus: linked?.diagnosticStatus || "fuzzy",
  };
}

function buildWeeklyPrompts() {
  const key = weekKey();
  const writingData = loadWeeklyWriting();
  if (
    writingData.schemaVersion === 3
    &&
    writingData.weekKey === key
    && (writingData.prompts || []).length
    && writingData.prompts.every((prompt) => Array.isArray(prompt.mustUseItems) && Array.isArray(prompt.taskChecklist))
  ) {
    return writingData;
  }

  const reviewCandidates = readJson(reviewCandidatesPath, { version: 1, items: [] }).items || [];
  const materials = latestMaterialSnippets(loadMaterialsIndex(), 3);
  const queueData = hydrateDailyLearningQueue(loadDailyLearningQueue());
  const storyData = loadStoryQueue();
  const uniqueTexts = (items = []) => dedupe(items.map((item) => String(item?.text || "").trim()).filter(Boolean));
  const dailyPool = uniqueTexts([
    ...(reviewCandidates.filter((item) => item.category === "daily")),
    ...(queueData.resolvedNewItems || []).filter((item) => item.category === "daily"),
    ...(queueData.resolvedReviewItems || []).filter((item) => item.category === "daily"),
  ]);
  const academicPool = uniqueTexts([
    ...(reviewCandidates.filter((item) => item.category === "academic" || item.category === "domain")),
    ...(queueData.resolvedNewItems || []).filter((item) => item.category === "academic" || item.category === "domain"),
    ...(queueData.resolvedReviewItems || []).filter((item) => item.category === "academic" || item.category === "domain"),
  ]);
  const storyDailyPool = uniqueTexts(
    (queueData.resolvedStoryItems || []).filter((item) => item.category === "daily"),
  );
  const storyAcademicPool = uniqueTexts(
    (queueData.resolvedStoryItems || []).filter((item) => item.category === "academic" || item.category === "domain"),
  );
  const dailyFallback = ["schedule", "catch up", "appointment", "commute", "work out", "sort out"];
  const academicFallback = ["benchmark", "methodology", "evidence", "in light of", "for instance", "research question"];
  const dailySuggested = dedupe([...dailyPool, ...storyDailyPool, ...dailyFallback]).slice(0, 6);
  const academicSuggested = dedupe([...academicPool, ...storyAcademicPool, ...academicFallback]).slice(0, 6);
  const dailyMustUse = dailySuggested.slice(0, Math.min(4, dailySuggested.length));
  const academicMustUse = academicSuggested.slice(0, Math.min(4, academicSuggested.length));
  const academicMaterial = materials.find((item) => item.category === "academic" || item.category === "domain");
  const latestMaterialText = academicMaterial?.title || "你最近读到的研究材料";
  const storyReference = storyData.outputs?.storyText
    ? storyData.outputs.storyText.split(/\n+/)[0].slice(0, 120)
    : "";

  const prompts = [
    {
      promptId: `weekly-${key}-daily`,
      type: "daily",
      title: "给同学发一封学习安排调整邮件",
      instruction: "用 80-120 词写一封英文邮件，告诉同学你本周的英语学习安排发生了变化，并重新约一个具体的讨论时间。",
      scenario: "场景：你原本约了同学一起讨论学习计划，但因为本周阅读、背词和通勤安排变化，需要礼貌地改时间，同时说明你还想保留讨论重点。",
      taskChecklist: [
        "第一句先说明写信目的",
        "交代本周计划变动的一个具体原因",
        "提出新的见面或线上讨论时间",
        "最后礼貌确认对方是否方便",
      ],
      mustUseItems: dailyMustUse,
      suggestedItems: dailySuggested,
      referenceContext: storyReference
        ? `可以把今天短文里的学习场景借过来，例如：${storyReference}`
        : "尽量写出真实学习情境，不要只写很空的客套句。",
      sourceSignals: {
        story: Boolean(storyReference),
        materialTitle: "",
      },
    },
    {
      promptId: `weekly-${key}-academic`,
      type: "academic",
      title: "解释你最近材料里的一个研究概念",
      instruction: academicMaterial
        ? `用 90-130 词解释 ${academicMaterial.title} 里一个最关键的研究概念或方法，并说明它和你的 benchmark / design 方向有什么关系。`
        : "用 90-130 词解释一个和你研究相关的学术概念，并说明它为什么重要。",
      scenario: academicMaterial
        ? `场景：你需要向导师或同学口头转述 ${academicMaterial.title} 的核心概念，所以这段文字要清楚、具体，而且能看出你真的理解。`
        : "场景：你需要向导师或同学解释一个研究概念，所以这段文字要像真正的学术说明，而不是背定义。",
      taskChecklist: [
        "先给出概念或方法的简短定义",
        "说明它在研究里解决什么问题",
        "举一个和你的 benchmark / design 方向有关的小例子",
        "最后写一句你自己的理解或判断",
      ],
      mustUseItems: academicMustUse,
      suggestedItems: academicSuggested,
      referenceContext: academicMaterial
        ? `优先联系你最近材料 ${latestMaterialText}，可以按“定义 -> 作用 -> 例子 -> 你的理解”来写。`
        : "可以按“定义 -> 作用 -> 例子 -> 你的理解”来写。",
      sourceSignals: {
        story: Boolean(storyReference),
        materialTitle: latestMaterialText,
      },
    },
  ];

  const payload = {
    version: 1,
    schemaVersion: 3,
    weekKey: key,
    prompts,
    submissions: writingData.submissions || [],
    updatedAt: nowIso(),
  };
  writeJson(weeklyWritingPath, payload);
  return payload;
}

function analyzeWritingSubmission(prompt, text) {
  const clean = String(text || "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const sentences = clean.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  const lowered = clean.toLowerCase();
  const usedItems = (prompt.suggestedItems || []).filter((item) =>
    new RegExp(`\\b${escapeRegExp(String(item).toLowerCase())}\\b`).test(lowered),
  );
  const usedMustUseItems = (prompt.mustUseItems || []).filter((item) =>
    new RegExp(`\\b${escapeRegExp(String(item).toLowerCase())}\\b`).test(lowered),
  );
  const missingMustUseItems = (prompt.mustUseItems || []).filter((item) => !usedMustUseItems.includes(item));

  const notes = [];
  if (words.length < 80) notes.push("篇幅偏短，建议补一个例子或一句解释。");
  if (words.length > 130) notes.push("篇幅已经超过建议范围，可以再压缩一两句让结构更紧。");
  if (sentences.length < 3) notes.push("句子数量偏少，建议至少写出 3 个完整句子。");
  if (!usedItems.length) notes.push("这次还没有明显用到推荐词汇，可以下次主动塞进 2-3 个重点表达。");
  if (prompt.mustUseItems?.length && usedMustUseItems.length < Math.min(2, prompt.mustUseItems.length)) {
    notes.push(`这次命中的必用词还不够，下一版尽量至少用上这些里的 2 个：${prompt.mustUseItems.join(" / ")}。`);
  }
  if (missingMustUseItems.length) {
    notes.push(`这次还没用到的必用词有：${missingMustUseItems.join(" / ")}。可以下一版优先补进去。`);
  }
  if (prompt.type === "academic" && !/\b(because|therefore|for example|for instance|this means)\b/i.test(clean)) {
    notes.push("学术解释里可以再加一个逻辑连接词或例子，让说明更完整。");
  }
  if (prompt.type === "daily" && !/\b(could|would|please|thank)\b/i.test(clean)) {
    notes.push("日常邮件场景里可以再加入更礼貌的表达，比如 could / would / thank you。");
  }
  if (!notes.length) {
    notes.push("整体结构已经比较稳，可以开始追求更自然的表达和更精准的词汇。");
  }

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    usedSuggestedItems: usedItems,
    usedMustUseItems,
    missingMustUseItems,
    feedback: notes,
  };
}

function submitWeeklyWriting({ promptId = "", text = "" } = {}) {
  const writing = buildWeeklyPrompts();
  const prompt = (writing.prompts || []).find((item) => item.promptId === promptId);
  if (!prompt) {
    throw new Error("Prompt not found");
  }
  const clean = String(text || "").trim();
  if (!clean) {
    throw new Error("Writing text is required");
  }
  const analysis = analyzeWritingSubmission(prompt, clean);
  const submission = {
    submissionId: `submission-${Date.now()}`,
    promptId,
    text: clean,
    submittedAt: nowIso(),
    analysis,
  };
  writing.submissions = [...(writing.submissions || []), submission];
  writing.updatedAt = nowIso();
  writeJson(weeklyWritingPath, writing);
  return {
    ok: true,
    prompt,
    submission,
  };
}

function hydrateDailyLearningQueue(queueData) {
  const learningData = syncLearningItemsFromLexicon();
  const learningMap = new Map((learningData.items || []).map((item) => [item.itemId, item]));
  const scheduleData = loadMemorySchedule();
  const scheduleMap = new Map((scheduleData.items || []).map((item) => [item.itemId, item]));

  const resolveRefs = (refs = []) => refs
    .map((ref) => {
      const item = learningMap.get(ref.itemId);
      if (!item) return null;
      return {
        ...ref,
        ...serializeLearningItem(item, scheduleMap.get(ref.itemId)),
      };
    })
    .filter(Boolean);

  return {
    ...queueData,
    resolvedNewItems: resolveRefs(queueData.newItems),
    resolvedReviewItems: resolveRefs(queueData.reviewItems),
    resolvedVerificationItems: resolveRefs(queueData.verificationItems),
    resolvedStoryItems: resolveRefs(queueData.storyItems),
  };
}

function getLearningOverview() {
  const learningData = syncLearningItemsFromLexicon();
  const scheduleData = loadMemorySchedule();
  const queueData = loadDailyLearningQueue();
  const storyData = loadStoryQueue();
  const materialsData = loadMaterialsIndex();
  const weeklyWriting = buildWeeklyPrompts();
  const today = todayDate();

  const items = learningData.items || [];
  const dueNow = (scheduleData.items || []).filter((item) => item.nextDueAt && item.nextDueAt <= nowIso());

  return {
    date: today,
    queue: queueData.date === today ? hydrateDailyLearningQueue(queueData) : null,
    stats: {
      totalLearningItems: items.length,
      unknownCount: items.filter((item) => item.diagnosticStatus === "unknown").length,
      fuzzyCount: items.filter((item) => item.diagnosticStatus === "fuzzy").length,
      learnedCount: items.filter((item) => item.learningStage === "learned" || item.learningStage === "reviewing").length,
      masteredCount: items.filter((item) => item.learningStage === "mastered").length,
      dueReviewCount: dueNow.length,
    },
    story: {
      status: storyData.date === today ? storyData.status : "pending",
      targetCount: storyData.date === today ? (storyData.sourceItems || []).length : 0,
      hasStoryText: Boolean(storyData.date === today && storyData.outputs?.storyText),
    },
    materials: {
      total: (materialsData.materials || []).length,
      latestTitle: materialsData.materials?.[0]?.title || "",
    },
    writing: {
      weekKey: weeklyWriting.weekKey,
      promptCount: (weeklyWriting.prompts || []).length,
      submissionCount: (weeklyWriting.submissions || []).length,
    },
  };
}

function generateDailyLearningQueue({
  date = todayDate(),
  targetNewCount = 15,
  targetReviewCount = 15,
} = {}) {
  const learningData = syncLearningItemsFromLexicon();
  const scheduleData = loadMemorySchedule();
  const scheduleMap = new Map((scheduleData.items || []).map((item) => [item.itemId, item]));
  const refNow = nowIso();

  const reviewCandidates = (scheduleData.items || [])
    .filter((record) => record.nextDueAt && record.nextDueAt <= refNow)
    .map((record) => ({
      record,
      item: learningData.items.find((item) => item.itemId === record.itemId),
    }))
    .filter((entry) => entry.item && entry.item.learningStage !== "mastered")
    .sort((left, right) => {
      const byDue = String(left.record.nextDueAt).localeCompare(String(right.record.nextDueAt));
      if (byDue !== 0) return byDue;
      return right.item.priorityScore - left.item.priorityScore;
    });

  const reviewIds = new Set();
  const reviewItems = reviewCandidates.slice(0, targetReviewCount).map(({ record, item }) => {
    reviewIds.add(item.itemId);
    return {
      itemId: item.itemId,
      reason: "due_today",
      memoryStep: record.currentStep || "D0",
      dueAt: record.nextDueAt || record.dueAt || "",
    };
  });

  const newCandidates = (learningData.items || [])
    .filter((item) => !reviewIds.has(item.itemId))
    .filter((item) => item.diagnosticStatus === "unknown" || item.diagnosticStatus === "fuzzy")
    .filter((item) => item.learningStage !== "mastered")
    .sort((left, right) => {
      const leftStatusRank = left.diagnosticStatus === "unknown" ? 0 : 1;
      const rightStatusRank = right.diagnosticStatus === "unknown" ? 0 : 1;
      if (leftStatusRank !== rightStatusRank) return leftStatusRank - rightStatusRank;
      if (left.priorityScore !== right.priorityScore) return right.priorityScore - left.priorityScore;
      if (left.wrongCount !== right.wrongCount) return right.wrongCount - left.wrongCount;
      return left.text.localeCompare(right.text);
    });

  const newItems = newCandidates.slice(0, targetNewCount).map((item, index) => ({
    itemId: item.itemId,
    reason: item.diagnosticStatus === "unknown" ? "diagnostic_unknown" : "diagnostic_fuzzy",
    queueOrder: index + 1,
  }));

  const verificationItems = newItems.map((item) => ({
    itemId: item.itemId,
    fromStage: "learning",
  }));

  const storyItems = newItems.slice(0, 12).map((item) => ({
    itemId: item.itemId,
    role: "target_word",
  }));

  const queueData = {
    version: 1,
    date,
    status: "ready",
    sourceMode: "unknown_and_fuzzy_priority",
    targetNewCount,
    targetReviewCount,
    newItems,
    reviewItems,
    verificationItems,
    storyItems,
    sourceMaterials: [],
    sessionIds: {
      learning: "",
      verification: "",
      review: "",
    },
    generatedAt: refNow,
    completedAt: "",
  };

  const storyQueue = createEmptyStoryQueue();
  storyQueue.date = date;
  storyQueue.storyId = `story-${date}-${Date.now()}`;
  storyQueue.sourceItems = storyItems;
  storyQueue.status = "pending";
  storyQueue.generatedAt = refNow;

  writeJson(dailyLearningQueuePath, queueData);
  writeJson(storyQueuePath, storyQueue);
  return hydrateDailyLearningQueue(queueData);
}

function summarizeLatestEvents(events) {
  const latestByItem = new Map();
  for (const event of events) {
    latestByItem.set(event.itemId, event);
  }

  const counts = { familiar: 0, fuzzy: 0, unknown: 0 };
  for (const event of latestByItem.values()) {
    if (counts[event.choice] !== undefined) counts[event.choice] += 1;
  }

  return {
    counts,
    latestByItem,
    repeatedItems: Math.max(events.length - latestByItem.size, 0),
  };
}

function applyLearningPhase(item, event) {
  item.lastLearnedAt = event.answeredAt;
  item.lastOutcome = event.choice;
  item.learningStage = "verifying";
  item.currentMemoryStep = "D0";
}

function applyVerificationPhase(scheduleData, item, event) {
  const record = ensureScheduleRecord(scheduleData, item.itemId);
  const reviewedAt = event.answeredAt;

  item.lastReviewedAt = reviewedAt;
  item.lastOutcome = event.choice;

  if (event.choice === "familiar") {
    const nextStep = "D1";
    const nextDueAt = scheduleDueForStep(scheduleData, nextStep, reviewedAt);
    item.learningStage = "learned";
    item.currentMemoryStep = nextStep;
    item.nextDueAt = nextDueAt;
    item.masteryLevel = Math.min(5, (item.masteryLevel || 0) + 1);
    item.stableCount = (item.stableCount || 0) + 1;

    record.currentStage = "reviewing";
    record.currentStep = nextStep;
    record.lastReviewedAt = reviewedAt;
    record.dueAt = nextDueAt;
    record.nextDueAt = nextDueAt;
    record.successCount = (record.successCount || 0) + 1;
  } else {
    const relearnDue = reviewedAt;
    item.learningStage = "relearning";
    item.currentMemoryStep = "D0";
    item.nextDueAt = relearnDue;
    item.masteryLevel = Math.max(0, (item.masteryLevel || 0) - (event.choice === "unknown" ? 1 : 0));
    item.lapseCount = (item.lapseCount || 0) + 1;

    record.currentStage = "relearning";
    record.currentStep = "D0";
    record.lastReviewedAt = reviewedAt;
    record.dueAt = relearnDue;
    record.nextDueAt = relearnDue;
    record.lapseCount = (record.lapseCount || 0) + 1;
  }

  record.history.push({
    step: record.currentStep,
    outcome: event.choice,
    reviewedAt,
    sessionId: event.sessionId,
  });
}

function applyReviewPhase(scheduleData, item, event) {
  const record = ensureScheduleRecord(scheduleData, item.itemId);
  const reviewedAt = event.answeredAt;
  const currentStep = record.currentStep || item.currentMemoryStep || "D1";

  item.lastReviewedAt = reviewedAt;
  item.lastOutcome = event.choice;

  if (event.choice === "familiar") {
    const nextStep = getNextStepName(scheduleData, currentStep);
    if (nextStep) {
      const nextDueAt = scheduleDueForStep(scheduleData, nextStep, reviewedAt);
      item.learningStage = "reviewing";
      item.currentMemoryStep = nextStep;
      item.nextDueAt = nextDueAt;
      item.masteryLevel = Math.min(5, (item.masteryLevel || 0) + 1);
      item.stableCount = (item.stableCount || 0) + 1;

      record.currentStage = "reviewing";
      record.currentStep = nextStep;
      record.dueAt = nextDueAt;
      record.nextDueAt = nextDueAt;
      record.successCount = (record.successCount || 0) + 1;
    } else {
      item.learningStage = "mastered";
      item.nextDueAt = "";
      item.masteryLevel = 5;
      item.stableCount = (item.stableCount || 0) + 1;

      record.currentStage = "mastered";
      record.dueAt = "";
      record.nextDueAt = "";
      record.successCount = (record.successCount || 0) + 1;
    }
  } else if (event.choice === "fuzzy") {
    const nextDueAt = addDaysIso(reviewedAt, 1);
    item.learningStage = "reviewing";
    item.currentMemoryStep = currentStep;
    item.nextDueAt = nextDueAt;

    record.currentStage = "reviewing";
    record.currentStep = currentStep;
    record.dueAt = nextDueAt;
    record.nextDueAt = nextDueAt;
  } else {
    const relearnDue = reviewedAt;
    item.learningStage = "relearning";
    item.currentMemoryStep = "D0";
    item.nextDueAt = relearnDue;
    item.masteryLevel = Math.max(0, (item.masteryLevel || 0) - 1);
    item.lapseCount = (item.lapseCount || 0) + 1;

    record.currentStage = "relearning";
    record.currentStep = "D0";
    record.dueAt = relearnDue;
    record.nextDueAt = relearnDue;
    record.lapseCount = (record.lapseCount || 0) + 1;
  }

  record.lastReviewedAt = reviewedAt;
  record.history.push({
    step: record.currentStep,
    outcome: event.choice,
    reviewedAt,
    sessionId: event.sessionId,
  });
}

function completeLearningPhase({
  date = todayDate(),
  phase,
  sessionId = `${date}-${phase}-${Date.now()}`,
  startedAt = "",
  results = [],
} = {}) {
  if (!["learning", "verification", "review"].includes(phase)) {
    throw new Error("Invalid learning phase");
  }
  if (!Array.isArray(results) || !results.length) {
    throw new Error("Learning phase results are required");
  }

  const learningData = syncLearningItemsFromLexicon();
  const learningMap = new Map((learningData.items || []).map((item) => [item.itemId, item]));
  const scheduleData = loadMemorySchedule();
  const wordSessions = loadWordLearningSessions();
  const queueData = loadDailyLearningQueue();

  const normalizedEvents = results.map((event) => ({
    itemId: event.itemId,
    choice: event.choice,
    phase: event.phase || phase,
    answeredAt: event.answeredAt || nowIso(),
    latencyMs: Number.isFinite(Number(event.latencyMs)) ? Number(event.latencyMs) : 0,
    round: Number.isFinite(Number(event.round)) ? Number(event.round) : 1,
    sessionId,
  }));

  const summaryInfo = summarizeLatestEvents(normalizedEvents);

  for (const event of normalizedEvents) {
    const item = learningMap.get(event.itemId);
    if (!item) continue;
    if (phase === "learning") applyLearningPhase(item, event);
  }

  for (const event of summaryInfo.latestByItem.values()) {
    const item = learningMap.get(event.itemId);
    if (!item) continue;
    if (phase === "verification") applyVerificationPhase(scheduleData, item, event);
    if (phase === "review") applyReviewPhase(scheduleData, item, event);
  }

  const completedAt = nowIso();
  wordSessions.activeSessionId = "";
  wordSessions.sessions.push({
    sessionId,
    date,
    sessionType: phase,
    status: "completed",
    startedAt: startedAt || normalizedEvents[0].answeredAt,
    endedAt: completedAt,
    queueItemIds: [...summaryInfo.latestByItem.keys()],
    events: normalizedEvents,
    summary: {
      totalItems: summaryInfo.latestByItem.size,
      familiar: summaryInfo.counts.familiar,
      fuzzy: summaryInfo.counts.fuzzy,
      unknown: summaryInfo.counts.unknown,
      repeatedItems: summaryInfo.repeatedItems,
    },
  });

  const sessionKey = phase;
  if (queueData.date === date) {
    queueData.sessionIds[sessionKey] = sessionId;
    if (queueData.sessionIds.learning && queueData.sessionIds.verification && (queueData.reviewItems.length === 0 || queueData.sessionIds.review)) {
      queueData.status = "completed";
      queueData.completedAt = completedAt;
    } else {
      queueData.status = "in_progress";
    }
  }

  const updatedLearningData = {
    version: 1,
    updatedAt: completedAt,
    items: [...learningMap.values()].sort((left, right) => {
      if (left.priorityScore !== right.priorityScore) return right.priorityScore - left.priorityScore;
      return left.text.localeCompare(right.text);
    }),
  };

  scheduleData.updatedAt = completedAt;

  writeJson(learningItemsPath, updatedLearningData);
  writeJson(memorySchedulePath, scheduleData);
  writeJson(wordLearningSessionsPath, wordSessions);
  writeJson(dailyLearningQueuePath, queueData);

  return {
    ok: true,
    sessionId,
    phase,
    summary: {
      familiar: summaryInfo.counts.familiar,
      fuzzy: summaryInfo.counts.fuzzy,
      unknown: summaryInfo.counts.unknown,
      repeatedItems: summaryInfo.repeatedItems,
      uniqueItems: summaryInfo.latestByItem.size,
    },
    queue: queueData.date ? hydrateDailyLearningQueue(queueData) : null,
    overview: getLearningOverview(),
  };
}

function rebuildDerivedData() {
  rebuildDerivedDataFromSessions(loadSessions());
}

function createSession(size, mode = "diagnostic", focusCategory = "mixed") {
  const queue = buildQueue(size, mode, focusCategory);
  const sessionId = `${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  const sessionsData = loadSessions();
  const session = {
    sessionId,
    startedAt: nowIso(),
    endedAt: "",
    mode,
    focusCategory,
    itemIds: queue.map((item) => item.id),
    responses: [],
  };
  sessionsData.sessions.push(session);
  writeJson(sessionsPath, sessionsData);
  return {
    sessionId,
    startedAt: session.startedAt,
    mode,
    focusCategory,
    total: queue.length,
    items: queue,
  };
}

function upsertAnswer({ sessionId, itemId, choice, latencyMs = 0 }) {
  if (!["familiar", "fuzzy", "unknown"].includes(choice)) {
    throw new Error("Invalid choice");
  }

  const sessionsData = loadSessions();
  const session = sessionsData.sessions.find((entry) => entry.sessionId === sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  if (!session.itemIds.includes(itemId)) {
    throw new Error("Item does not belong to this session");
  }

  const response = {
    itemId,
    choice,
    answeredAt: nowIso(),
    latencyMs: Number.isFinite(Number(latencyMs)) ? Number(latencyMs) : 0,
  };
  const existingIndex = (session.responses || []).findIndex((entry) => entry.itemId === itemId);
  if (existingIndex >= 0) {
    session.responses[existingIndex] = response;
  } else {
    session.responses.push(response);
  }

  writeJson(sessionsPath, sessionsData);
  rebuildDerivedDataFromSessions(sessionsData);
  return {
    ok: true,
    sessionId,
    stats: sessionStats(session),
  };
}

function finishSession(sessionId) {
  const sessionsData = loadSessions();
  const session = sessionsData.sessions.find((entry) => entry.sessionId === sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  if (!session.endedAt) {
    session.endedAt = nowIso();
    writeJson(sessionsPath, sessionsData);
  }
  rebuildDerivedDataFromSessions(sessionsData);
  return {
    ok: true,
    sessionId,
    endedAt: session.endedAt,
    stats: sessionStats(session),
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, type, text) {
  res.writeHead(statusCode, {
    "Content-Type": `${type}; charset=utf-8`,
    "Cache-Control": "no-store",
  });
  res.end(text);
}

function sendRedirect(res, location) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 25_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function routeNotFound(res) {
  return sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${host}:${port}`);

    if (req.method === "GET" && url.pathname === "/") {
      return sendText(res, 200, "text/html", readText(htmlPath));
    }

    if (req.method === "GET" && url.pathname === "/learning") {
      return sendText(res, 200, "text/html", readText(learningHtmlPath));
    }

    if (req.method === "GET" && url.pathname === "/story") {
      return sendText(res, 200, "text/html", readText(storyHtmlPath));
    }

    if (req.method === "GET" && url.pathname === "/reader") {
      return sendRedirect(res, "/learning");
    }

    if (req.method === "GET" && url.pathname === "/writing") {
      return sendText(res, 200, "text/html", readText(writingHtmlPath));
    }

    if (req.method === "GET" && url.pathname === "/api/english/profile") {
      return sendJson(res, 200, readJson(profilePath, {}));
    }

    if (req.method === "GET" && url.pathname === "/api/english/lexicon") {
      return sendJson(res, 200, readJson(lexiconPath, { version: 1, items: [] }));
    }

    if (req.method === "GET" && url.pathname === "/api/english/diagnostics") {
      return sendJson(res, 200, readJson(diagnosticsPath, createEmptyDiagnostics()));
    }

    if (req.method === "GET" && url.pathname === "/api/english/bank-summary") {
      return sendJson(res, 200, getBankSummary());
    }

    if (req.method === "GET" && url.pathname === "/api/english/review-candidates") {
      return sendJson(res, 200, readJson(reviewCandidatesPath, { version: 1, items: [] }));
    }

    if (req.method === "GET" && url.pathname === "/api/english/queue") {
      const size = normalizeSize(url.searchParams.get("size"));
      const mode = url.searchParams.get("mode") || "diagnostic";
      const focusCategory = url.searchParams.get("focusCategory") || "mixed";
      return sendJson(res, 200, createSession(size, mode, focusCategory));
    }

    if (req.method === "POST" && url.pathname === "/api/english/session/start") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const size = normalizeSize(body.size);
      return sendJson(
        res,
        200,
        createSession(size, body.mode || "diagnostic", body.focusCategory || "mixed"),
      );
    }

    if (req.method === "POST" && url.pathname === "/api/english/answer") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      if (!body.sessionId || !body.itemId || !body.choice) {
        return sendJson(res, 400, { error: "Missing required answer fields" });
      }
      return sendJson(res, 200, upsertAnswer(body));
    }

    if (req.method === "POST" && url.pathname === "/api/english/session/finish") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      if (!body.sessionId) {
        return sendJson(res, 400, { error: "Missing sessionId" });
      }
      return sendJson(res, 200, finishSession(body.sessionId));
    }

    if (req.method === "GET" && url.pathname === "/api/english/learning/overview") {
      return sendJson(res, 200, getLearningOverview());
    }

    if (req.method === "GET" && url.pathname === "/api/english/learning/queue/today") {
      return sendJson(res, 200, hydrateDailyLearningQueue(loadDailyLearningQueue()));
    }

    if (req.method === "GET" && url.pathname === "/api/english/story/today") {
      return sendJson(res, 200, getTodayStory(url.searchParams.get("date") || todayDate()));
    }

    if (req.method === "GET" && url.pathname === "/api/english/materials") {
      return sendJson(res, 200, getMaterialsPayload());
    }

    if (req.method === "GET" && url.pathname === "/api/english/lookup") {
      return sendJson(res, 200, lookupText(url.searchParams.get("text") || ""));
    }

    if (req.method === "GET" && url.pathname === "/api/english/writing/weekly") {
      return sendJson(res, 200, buildWeeklyPrompts());
    }

    if (req.method === "POST" && url.pathname === "/api/english/learning/queue/generate") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const targetNewCount = normalizeStudyCount(body.targetNewCount, 15);
      const targetReviewCount = normalizeStudyCount(body.targetReviewCount, 15);
      return sendJson(res, 200, generateDailyLearningQueue({
        date: body.date || todayDate(),
        targetNewCount,
        targetReviewCount,
      }));
    }

    if (req.method === "POST" && url.pathname === "/api/english/learning/phase/complete") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, completeLearningPhase(body));
    }

    if (req.method === "POST" && url.pathname === "/api/english/manual-items/add") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, addManualLexiconItem(body));
    }

    if (req.method === "POST" && url.pathname === "/api/english/manual-items/bulk") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, addManualLexiconItems(body));
    }

    if (req.method === "POST" && url.pathname === "/api/english/story/generate") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, generateTodayStory({ date: body.date || todayDate() }));
    }

    if (req.method === "POST" && url.pathname === "/api/english/story/submit") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, submitStoryTranslation(body));
    }

    if (req.method === "POST" && url.pathname === "/api/english/materials/save") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, await saveMaterial(body));
    }

    if (req.method === "POST" && url.pathname === "/api/english/materials/analyze") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, await saveMaterial(body));
    }

    if (req.method === "POST" && url.pathname === "/api/english/reader/collect") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, collectReaderSelection(body));
    }

    if (req.method === "POST" && url.pathname === "/api/english/writing/generate") {
      return sendJson(res, 200, buildWeeklyPrompts());
    }

    if (req.method === "POST" && url.pathname === "/api/english/writing/submit") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return sendJson(res, 200, submitWeeklyWriting(body));
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, date: todayDate() });
    }

    return routeNotFound(res);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Server error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, host, () => {
  console.log(`English diagnosis server running at http://${host}:${port}`);
});
