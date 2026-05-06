# Fixed Corpus Pool

这个文件用于维护当前 2 周固定语料池。

## 使用规则

- 总数控制在 5-8 篇
- 其中：
  - `AI+Design / design+agent`：3-5 篇
  - `benchmark`：2-3 篇
- 每次语料池启用 14 天
- 到期后由 agent 主动提醒更新
- 每天只安排 1 篇作为主阅读材料

## 当前周期

- Cycle status: `active`
- Start date: `2026-04-30`
- Planned refresh date: `2026-05-14`

## Corpus List

| ID | Category | Title | Web Link | Local PDF Path | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| P01 | AI+Design | "It Felt Like Having a Second Mind": Investigating Human-AI Co-creativity in Prewriting with Large Language Models | https://arxiv.org/abs/2307.10811 | `data/english/corpus/papers/pdf/P01_second_mind.pdf` | active | 适合建立你对 human-AI co-creativity 流程的基础理解 |
| P02 | AI+Design | Supporting Sensemaking of Large Language Model Outputs at Scale | https://arxiv.org/abs/2401.13726 | `data/english/corpus/papers/pdf/P02_sensemaking_llm_outputs.pdf` | active | 适合读界面、交互和 LLM 输出组织方式 |
| P03 | AI+Design | The Role of Designers in Human-AI Collaborative Design: Capturing the New Patterns in AI4UX Framework | https://doi.org/10.1177/29776481261427591 | `data/english/corpus/papers/pdf/P03_ai4ux_framework.pdf` | active | 适合用来建立 UX / design 视角下的人机协作框架 |
| P04 | design+agent | Large language model tools as catalysts for collective cognition in collaborative new-product development: a quasi-experimental study | https://www.nature.com/articles/s41599-026-06738-7 | `data/english/corpus/papers/pdf/P04_collective_cognition_llm.pdf` | active | 适合读团队协作、知识整合和 LLM 边界 |
| P05 | design+agent | Human-level design proposals by an artificial agent in multiple scenarios | https://doi.org/10.1016/j.destud.2021.101029 | `data/english/corpus/papers/pdf/P05_human_level_design_proposals.pdf` | active | 偏 foundational，适合建立设计代理和创造力评价的长期词汇 |
| P06 | benchmark | MuseBench: A Comprehensive Benchmark for Multimodal Cultural Understanding of Chinese Museum Artifacts | https://openreview.net/forum?id=IsuJ4GBCoe | `data/english/corpus/papers/pdf/P06_musebench.pdf` | active | 第一轮 benchmark 主启动材料，和你当前 cultural heritage 方向最贴近 |
| P07 | benchmark | Dunhuang-Bench: How Well Do MLLMs Understand Cultural Heritage? | https://openreview.net/forum?id=TYsnjYNzpv | `data/english/corpus/papers/pdf/P07_dunhuang_bench.pdf` | active | 适合接在 MuseBench 后读，任务形式更清楚，文化遗产语义更强 |
| P08 | optional | RAVENEA: A Benchmark for Multimodal Retrieval-Augmented Visual Culture Understanding | https://openreview.net/forum?id=4zAbkxQ23i | `data/english/corpus/papers/pdf/P08_ravenea.pdf` | optional | 备用位，第二周后半段可替换或加读 |

## 今日轮转记录

| Date | Paper ID | Reading scope | Done | Notes |
| --- | --- | --- | --- | --- |
| 2026-04-30 | P06 | 标题 + abstract + introduction 前 1-2 页 | in progress | 今天正式用 `MuseBench` 启动第一轮语料池 |
