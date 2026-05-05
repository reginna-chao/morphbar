# Review Backlog — 延後修正項目

集中記錄歷次 fe-review 中**未在當下修正、決定延後處理**的問題。處理完成後請從此檔移除。

---

## 來源：Sprint 5.1 Code Review（2026-05-06）

### 🔴 結構性 — 待開重構 Sprint 處理

#### B1. EditorCanvas.tsx 違反 200 行上限（**733 行**，3.6×）

- **來源**：CRITICAL C8 + C13
- **位置**：[src/components/EditorCanvas.tsx](src/components/EditorCanvas.tsx)
- **問題**：單檔承擔 4 種工具（select / pen-add / pen-remove / rotate）+ marquee + hover + cursor + keyboard + SelectionBox 渲染
- **連帶**：`handleMouseDown` 一個函式約 175 行（規則 40 行的 4.4×）
- **建議重構**：
  - 抽 `usePenAddTool({ lines, mode, getSVGPoint, onLinesChange })`
  - 抽 `usePenRemoveTool(...)`
  - 抽 `useSelectTool(...)`（部分已在 `useBoxSelection`）
  - 抽 `useCanvasKeyboard({ activeTool, ... })`
  - `handleMouseDown` → 10 行 dispatch
- **建議：開新 Sprint「EditorCanvas 重構」處理**

#### B2. 其他超過 200 行的檔案

- **來源**：CRITICAL C13
- `src/hooks/useCanvasRender.ts`（281 行）：建議將 `renderLine` / `renderHoverConnection` / `renderPenAddPreview` 抽到 `src/utils/canvasDraw.ts`，hook 本身只負責 effect 排程
- `src/utils/geometry.ts`（206 行）：規則略超；如果再長可拆 `geometry/bbox.ts` / `geometry/rotation.ts` / `geometry/snap.ts`（同 SUGGESTION S6）
- `src/components/EditorCanvas.module.scss`（238 行）：拆成 SelectionBox 自己的 module（同 SUGGESTION S10）

---

### 🟡 低優先 / 邊界案例 — 暫緩

#### B3. 旋轉中 mirror group 變動的 race condition

- **來源**：CRITICAL C16
- **位置**：[src/hooks/useRotateInteraction.ts:51-71](src/hooks/useRotateInteraction.ts#L51-L71)
- **問題**：`sourceRef` 在 dragstart 凍結；若拖曳期間 mirror group 改變，mirror sync 會用舊的 source 集合，造成 stale 同步
- **發生機率**：極低（拖曳中很難同時操作 MirrorManager）
- **建議修法**：拖曳期間若偵測 `mirrorGroups` 變動，要嘛取消旋轉、要嘛刷新 `sourceRef`
- **延後理由**：實際使用情境難重現，且修復成本與效益不成比例

#### B4. 重複旋轉的浮點漂移累積

- **來源**：SUGGESTION S15
- **位置**：[src/utils/geometry.ts](src/utils/geometry.ts)（`rotatePoints` 已有 4 位小數 round）
- **問題**：每次拖曳結束後，rotated coords 在下一輪再被旋轉，多輪累積 → 整數座標 (20.0) 變成 19.9998
- **影響**：generated SVG path 出現長小數
- **建議修法**：每次拖曳結束時把座標 snap 回 0.5 SVG-unit 整數網格（與現有 5px 拖曳網格一致）
- **延後理由**：目前 4 位小數 round 已大幅減緩漂移；視實際使用體感再決定是否進一步處理

#### B5. `rotatePoints` 對 0° 沒有 early return

- **來源**：SUGGESTION S14
- **位置**：[src/utils/geometry.ts:31-45](src/utils/geometry.ts#L31-L45)
- **問題**：`rotateLineMode` 呼叫 `rotatePoints(_, 0)` 仍會跑完整旋轉計算
- **影響**：微小 perf 浪費 + 0° 也會經過 round 而引入漂移
- **建議修法**：`if (angleDeg === 0) return points.map(p => ({ ...p }));`
- **延後理由**：呼叫站上層通常已 guard 0°，影響邊際

#### B6. 鍵盤 input guard 沒涵蓋 `<select>` / contenteditable

- **來源**：SUGGESTION S16
- **位置**：[src/components/EditorCanvas.tsx](src/components/EditorCanvas.tsx) 鍵盤 handler
- **問題**：guard 只檢查 `HTMLInputElement` / `HTMLTextAreaElement`；遇到 `<select>` 或 `contenteditable` 元素時可能誤觸快捷鍵
- **影響**：目前專案沒有 `<select>` 與 contenteditable，無實際影響
- **延後理由**：未來新增此類元素時再補

---

## 處理流程

完成本檔列出之項目時：
1. 在 commit message 引用對應編號（B1、B2…）
2. 從本檔刪除已完成項
3. 新一輪 fe-review 找到的延後項目用「來源：Sprint X.Y Code Review（YYYY-MM-DD）」分節新增於上方
4. 全部清空時可保留檔案（標註「目前沒有 backlog」）或刪除

---

**最後更新**：2026-05-06
