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

本轮功能代码已经完成，但当前工作区仍有 3 个未提交文件：`app.js`、`index.html`、`styles.css`。

已完成校验：`node --check app.js`、`git diff --check`。

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

- `index.html` 使用 `app.js?v=36`。
- Service Worker 本轮未修改，因此没有递增缓存版本。
- `sw.js` 内仍可能引用旧版 `app.js?v=35`；如线上出现缓存未更新，优先检查并递增 Service Worker 缓存版本后重新部署。

## 下一步建议

1. 先检查 Git 状态和差异，确认只包含本轮 3 个文件及本交接文档。
2. 使用线上地址回归测试：登录后导出数据；编辑书籍；删除测试书籍并确认书摘、心得和阅读图片同步删除；更新、删除书摘和心得；检查移动端布局。
3. 测试通过后，使用以下 Git 可执行文件提交并推送：

```text
/Users/joyyan/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/git
```

4. 推送后确认 GitHub Pages 部署完成，并重新打开线上地址验证 `app.js?v=36` 已生效。

## 注意事项

- 不要删除旧 UID 用户。
- 不要清除浏览器 `localStorage`。
- 当前数据迁移事项仍需单独处理。
- 删除书籍属于真实数据删除操作，测试时只使用明确可删除的测试书籍。
- 若提交前发现与本轮无关的改动，保留并单独报告，不要覆盖或清理。
