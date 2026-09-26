# RIGHT NOW 项目交接文档

## 项目概况

- 项目目录：`/Users/joyyan/Documents/03_创业工作/04_运营与内容/公众号/time-block-pwa`
- GitHub 仓库：`Sariarich/cike-time-journal-joyyan`
- 当前线上地址：<https://sariarich.github.io/cike-time-journal-joyyan/?date=2026-09-25>
- 当前分支：`main`
- Supabase 新账号 UID：`2542b033-0c41-4b25-9698-af145f6824fc`
- 旧账号 UID：`5f37a899-96ee-4862-b3dc-54dfa411f808`

## 当前状态

网页目前已经可以正常投入使用。线上页面应以带 `?date=2026-09-25` 的地址为准；此前不带日期参数的访问曾返回 GitHub Pages 404，不要据此判断当前部署状态。

本轮功能已提交并推送：`b9c354a feat: add backup and reading note controls`。GitHub Pages 已发布，线上带日期参数的页面已确认显示“导出数据”入口。

本交接文档的上一版已随 `2272663 docs: update project handoff status` 推送至 `github/main`（远端名称为 `github`，不是 `origin`）。

本轮导航调整与思考浏览调整已随 `13f139f feat: show all thoughts across dates` 推送至 `github/main`，并已在 GitHub Pages 线上地址复核。THOUGHTS 已从页面底部的独立入口移入主导航，成为与 MISSION、24 HOURS、STATISTICS、READING NOTES 并列的第五个功能区。进入思考页后主导航保持可见；手机端底栏已改为五等分。THOUGHTS 不再受全局日期切换影响，进入后始终展示全部思考；编辑思考也不再因当前日期而改写其原始归档日期。

线上复核结果：进入 THOUGHTS 显示“全部思考”；将全局日期从 2026-09-27 切至 2026-09-26 后，该提示与思考列表维持全部浏览模式。

已完成校验：`node --check app.js`、`git diff --check`、本地隔离预览、390px 移动端布局检查。未登录云端，未执行任何真实数据删除。

## 本轮已完成的功能

### 数据导出

- 顶部新增“导出数据”按钮，手机端保留入口。
- 以 JSON 导出当前用户在 `time_tasks`、`time_records`、`daily_summaries`、`thought_entries`、`reading_books`、`reading_notes` 中的全部数据。
- 所有查询均按当前登录用户的 `user_id` 过滤。
- 文件名格式：`right-now-backup-YYYY-MM-DD.json`。

### 阅读笔记书籍管理

- 书籍卡片悬停时显示编辑、删除按钮。
- 支持编辑书名和作者。
- 删除书籍前会二次确认，并同步删除该书的 `reading_notes` 与阅读图片。

### 书摘与心得

- 选中书籍后自动加载最新书摘和心得到输入框。
- 有记录时显示“更新书摘”或“更新心得”，无记录时显示“保存书摘”或“保存心得”。
- 增加“删除书摘”和“删除心得”按钮。
- 保留多条书摘、心得列表和单条删除能力。

### 安全与交互

- 阅读模块的读取、更新、删除操作增加 `user_id` 过滤。
- 任务、时间记录、总结、思考的读取和删除路径补充用户过滤。
- 增加 Toast 操作提示。

## 关键版本信息

- `index.html` 使用 `app.js?v=37`。
- `index.html` 使用 `styles.css?v=13`。
- `sw.js` 已更新为缓存版本 `right-now-v33`，并预缓存 `app.js?v=37` 与 `styles.css?v=13`。

## 下一步建议

1. 如需完整云端回归，使用线上地址登录后测试导出、编辑书籍、更新/删除书摘与心得；删除书籍仅限明确可删除的测试书籍，并确认关联笔记和阅读图片同步删除。
2. 检查主导航：桌面端应显示 5 个并列标签；手机端底栏应显示 5 等分标签；点击 THOUGHTS 后导航不应消失，切换全局日期也应始终显示全部思考。
3. 执行 `git status --short --branch` 与 `git diff --check`。当前预期有上述 5 个待提交文件；如出现其他未预期改动，保留并报告，不要清理。
4. 后续改动提交与推送使用以下 Git 可执行文件，并使用远端名称 `github`：

```text
/Users/joyyan/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/git
```

5. 推送后重新打开线上地址，确认 `app.js?v=37`、`styles.css?v=13`、缓存版本 `right-now-v33`、五个并列导航和全部思考浏览均已生效。

## 注意事项

- 不要删除旧 UID 用户。
- 不要清除浏览器 `localStorage`。
- 不再处理数据迁移事项。
- 删除书籍属于真实数据删除操作，测试时只使用明确可删除的测试书籍。
- 若提交前发现与本轮无关的改动，保留并单独报告，不要覆盖或清理。
