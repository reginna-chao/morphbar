# Features 文件

本資料夾存放各**主要功能**的深度說明文件，作為 ROADMAP 之外的補充：

- **ROADMAP.md**：未來規劃 + 各 Sprint 概要狀態
- **REVIEW_BACKLOG.md**：歷次 code review 中延後處理的項目清單
- **docs/features/*.md**：個別功能的設計決策、架構、互動規範（適合換電腦或新成員快速 onboarding）

## 目錄

| 檔案 | 涵蓋功能 | 對應 Sprint |
|------|---------|------------|
| [transform-tool.md](transform-tool.md) | Transform 工具系統（rotate / translate / scale / undo-redo / quick-rotate / global rotation） | Sprint 5.1–5.6（v1.5.0） |

## 寫作慣例

- 重要決策必須帶日期，方便日後追溯
- 行為規範用表格列清楚（cursor、互動、守衛條件等）
- 已知技術債只引用 `REVIEW_BACKLOG.md` 編號，不重複內容
- 換電腦開發時應先閱讀對應的 feature 文件，再對照 ROADMAP 與 backlog
