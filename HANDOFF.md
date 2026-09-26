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

最新已提交版本为 `0c41862 docs: record thoughts deployment`，已位于本地 `main` 与 `github/main`。该提交补充了思考模块上线状态的交接记录。

本轮已修复轮播第三张卡片滚动到居中位置后无法变亮的问题：轮播滚动结束时会按视口中心同步实际高亮卡片，兼容前、中、后三份无限循环轨道。已更新资源查询版本至 `app.js?v=38`、`styles.css?v=14`，Service Worker 缓存版本更新为 `right-now-v34`，并准备提交、推送和部署。

当前工作区状态：`HANDOFF.md`、`app.js`、`index.html`、`styles.css` 均有未提交改动；这些改动属于同一轮本地界面调整，尚未提交、推送或部署。接手时先核对这四个文件的差异，不要清理或覆盖。

线上复核结果：进入 THOUGHTS 显示“全部思考”；将全局日期从 2026-09-27 切至 2026-09-26 后，该提示与思考列表维持全部浏览模式。

当前工作区另有一轮仅本地界面调整，尚未提交、推送或部署；本轮包含 `app.js`、`index.html`、`styles.css`。线上版本仍是上述已发布版本，不能用线上页面判断以下本地改动。

- THOUGHTS：移除了页内的“THOUGHTS”及“全部思考”两行文字；顶部导航中的 THOUGHTS 标签保持不变，全部思考浏览逻辑不变。
- READING NOTES：改为全局书架，日期切换不再改写页面标题或影响书架内容；页面标题固定为“阅读笔记”。
- 空书架：书架为空时，仅居中显示“书架还是空的”，不再同时显示右侧的新建表单。
- 新建书籍：点击“新建书籍”后，才以独立的 NEW BOOK 弹窗展示书名、作者与创建按钮；创建成功后弹窗关闭。
- 已完成本地验证：`node --check app.js`、`git diff --check`；本地预览中确认阅读页切换日期后书架保持不变，且“新建书籍”弹窗可正常打开和关闭。未在验证中创建、修改或删除任何数据。

本轮最新工作继续只针对本地 READING NOTES 界面，尚未提交、推送或部署：

- 书籍卡片改为固定 `326px × 163px`，比例 2:1，当前卡片居中；移动端在屏幕不足时缩小到可用宽度。
- 卡片左上原来的黑白两个点已删除。
- 书名、作者和星级保留在上方卡片内，并整体上下居中；星级仍可点击调整。
- 下方 P2 读书笔记面板已移除书籍标题和星级头部，面板直接从“书摘”开始。
- 轮播仍支持左右滚动和选中卡片联动；书摘、心得的保存、删除和图片上传逻辑未改动。
- 已加入无限循环轮播：书籍列表渲染为前、中、后三份轨道，滚动接近首尾时自动无感跳回中间轨道；每本书仍使用原始 ID，选中后下方笔记面板正常联动。
- 本轮只改动展示结构与样式，未创建、修改或删除任何真实数据。

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
2. 检查本地待发布界面：THOUGHTS 页不应显示页内“THOUGHTS”或“全部思考”文字；READING NOTES 卡片应为 `326×163px` 左右的 2:1 居中卡片，卡片内书名/作者/星级居中，下方 P2 面板直接从“书摘”开始；空书架居中显示；点击“新建书籍”才弹出 NEW BOOK 窗口。
3. 执行 `git status --short --branch` 与 `git diff --check`。当前预期有 `HANDOFF.md`、`app.js`、`index.html`、`styles.css` 四个待提交文件；如出现其他未预期改动，保留并报告，不要清理。
4. 后续改动提交与推送使用以下 Git 可执行文件，并使用远端名称 `github`：

```text
/Users/joyyan/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/git
```

5. 如决定发布本地待提交改动，应先更新 `app.js` 的查询版本和 Service Worker 缓存版本，再推送；随后重新打开线上地址，确认五个并列导航、全部思考浏览和全局书架均已生效。

## 注意事项

- 不要删除旧 UID 用户。
- 不要清除浏览器 `localStorage`。
- 不再处理数据迁移事项。
- 删除书籍属于真实数据删除操作，测试时只使用明确可删除的测试书籍。
- 若提交前发现与本轮无关的改动，保留并单独报告，不要覆盖或清理。
