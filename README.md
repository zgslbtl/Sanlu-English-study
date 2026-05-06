# English Learning Subproject

这个子项目是从 `sanlu-daily-agent` 中拆出来的独立英语学习项目。

它现在负责：

- 英语诊断
- 每日背词 / 检验 / 复习
- 今日短文
- 每周写作
- 英语语料、词库、学习状态和输出归档

## 目录

- `data/english/`：固定语料池、每日学习包、RLSA 计划
- `data/english_system/`：诊断库、背词状态、短文与写作系统数据
- `web/`：英语前端页面
- `scripts/`：英语服务端与题库脚本
- `outputs/`：当天英语学习包等输出

## Git 追踪策略

这个子项目默认只追踪：

- 前端页面与脚本
- 题库结构与架构文档
- 固定语料池说明、论文卡片、RLSA 计划

默认忽略：

- `outputs/` 下的运行产物
- `data/english/daily/` 每日归档
- `data/english_system/learner/` 个人学习状态
- `data/english/vocab/` 中频繁变化的个人词库文件
- 本地 PDF 与系统生成文件

这样仓库更适合长期维护代码和结构，而不会被个人学习记录刷满。

## 启动

在仓库根目录运行：

```bash
node projects/english-learning/scripts/english_diagnosis_server.mjs
```

前端入口：

```text
http://127.0.0.1:4320/
```

## 与每日任务项目的关系

根项目只需要在“今天任务是什么”时：

1. 给出今天英语学习安排的简要摘要
2. 给出英语前端链接
3. 如有需要，再把详细英语学习包写到本子项目的 `outputs/today_english_pack.md`

也就是说，英语学习现在已经是一个独立子项目，只是仍然挂在同一个仓库中，方便和每日计划联动。
