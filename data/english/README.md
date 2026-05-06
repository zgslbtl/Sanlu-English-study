# English Workflow

这个目录用于存放每日英语学习包、固定语料池、词汇复习队列，以及面向 PolyU RLSA 的阶段性准备文件。

## 目标

- 用 2 周为一个周期维护固定语料池
- 每天围绕 1 篇论文做阅读、词汇、轻听力、口语和短写作
- 把 `不背单词` 的新词和论文生词并入同一个复习系统
- 为 2026 年 9 月 PolyU RLSA 做持续准备

## 目录说明

- `corpus/`
  - `corpus_pool.md`：当前 2 周固定语料池
  - `corpus_cycle_state.json`：语料池周期状态，用于提醒 2 周后更新
  - `papers/`：每篇固定语料的独立卡片
  - `papers/pdf/`：下载好的论文 PDF
- `vocab/`
  - `master_vocab.md`：总词库
  - `review_queue.md`：当天或下一轮待复习词
  - `app_word_inbox.md`：`不背单词` 截图转写后的原始词表入口
- `daily/`
  - 每日英语学习包归档目录，按 `YYYY-MM-DD/` 存放
- `plans/`
  - `rlsa_prep_plan.md`：RLSA 阶段规划

## 每日工作流

1. 问 agent：`今天任务是什么`
2. agent 从固定语料池中选出当天论文，并生成 `projects/english-learning/outputs/today_english_pack.md`
3. 你完成当天英语 block：
   - App 新词 10-20 个
   - 阅读指定论文片段
   - 补 5-8 个阅读生词
   - 阅读复习短文
   - 做 1 个轻听说任务和 1 个微写作任务
4. 你汇报完成情况或发 `不背单词` 截图
5. agent 自动归档到 `daily/YYYY-MM-DD/`，并更新词库与明日雏形

## 测试后语料生成规则

在当前这一阶段，默认还有一条固定工作流：

1. 你先完成当天诊断测试
2. 然后告诉 agent：`今天测试完成了，帮我生成语料`
3. agent 会根据当天的 `unknown / fuzzy` 项生成当天语料组

默认每天生成：

- `2` 篇核心论文链接
- `1` 篇可选论文链接
- `1` 份学术解释型生成语料
- `1` 份日常场景生成语料
- `1` 份对话 / 邮件型生成语料
- `1` 份 `source_manifest.md`

默认存放到：

- `projects/english-learning/data/english/daily/YYYY-MM-DD/`

推荐命名：

- `source_manifest.md`
- `generated_academic_01.md`
- `generated_daily_01.md`
- `generated_dialogue_01.md`

真实论文 PDF 统一放在：

- `projects/english-learning/data/english/corpus/papers/pdf/`

推荐命名方式：

- `P09_short_title.pdf`
- `P10_short_title.pdf`

对应论文说明卡放在：

- `projects/english-learning/data/english/corpus/papers/`

并命名为：

- `P09.md`
- `P10.md`

之后每日短文默认优先参考：

1. 当天生成语料文件
2. 当天真实论文
3. 当天 `unknown / fuzzy` 词
4. 最近复习词

## 默认强度

- 标准版：70-90 分钟
- 最小版：30-40 分钟

## 默认词汇规则

- App 新词：10-20 个
- 当日复习词：不超过 20 个
- 阅读生词：5-8 个
- 复习短文：120-180 词

## PDF 存放规则

- 所有下载好的论文 PDF 统一放在 `projects/english-learning/data/english/corpus/papers/pdf/`
- 推荐命名方式：
  - `P01_second_mind.pdf`
  - `P06_musebench.pdf`
- 每篇论文卡片里同时保留：
  - `Web Link`
  - `Local PDF Path`
