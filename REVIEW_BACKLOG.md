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

---

## 來源：Sprint 5.3 Code Review（2026-05-06）

### 🟡 低優先 / 邊界案例 — 暫緩

#### B7. Shift-uniform 縮放的負號處理（Figma spec 校驗）

- **來源**：Sprint 5.3 SUGGESTION
- **位置**：[src/hooks/useScaleInteraction.ts](src/hooks/useScaleInteraction.ts)（Shift 分支）
- **問題**：目前 `Math.max(|sx|, |sy|)` + 各軸保留自己的 sign，當使用者按住 Shift 拖過對角錨點時可能產生 `(-0.5, +0.5)` 這種「對角鏡像」結果。Figma 嚴格行為是「以較大絕對值的軸的 sign 套用到雙軸」。
- **影響**：邊界案例，typical 拖曳不會碰到
- **建議修法**：實際比對 Figma 行為決定後再改，避免主觀調整

#### B8. SelectionBox prop sprawl

- **來源**：Sprint 5.3 SUGGESTION
- **位置**：[src/components/SelectionBox.tsx](src/components/SelectionBox.tsx) 已 8 個 props
- **問題**：再加 1 個 interaction（例如 shear）就會非常擁擠
- **建議重構**：拆成 `<RotateHandle />` / `<ScaleHandles />` / `<PivotMarker />` 子元件，或改成 `{ onRotate, onScale, onPivot, onBbox }` 物件 prop
- **延後理由**：屬重構，搭配 EditorCanvas 重構（B1）一起處理較好

#### B9. Cursor utility class 重複

- **來源**：Sprint 5.3 SUGGESTION
- **位置**：[src/components/SelectionBox.module.scss](src/components/SelectionBox.module.scss) 的 `.cursorNwse / Nesw / Ns / Ew`
- **問題**：與 `body.is-scaling-*` 重複定義方向 → cursor 對應；JSX 用字串 concat 拼 className
- **建議修法**：改用 `data-cursor` 屬性 + 屬性選擇器
- **延後理由**：純 cosmetic

#### B10. 未來新增 scale handle 切換時的 body class leak 風險

- **來源**：Sprint 5.3 SUGGESTION
- **位置**：[src/components/EditorCanvas.tsx](src/components/EditorCanvas.tsx) `is-scaling-*` body class effect
- **問題**：目前 handle 一次只會固定一個（不會中途切換），若未來新增動態切換功能會 leak class
- **建議修法**：cleanup 時移除全部 4 個 `is-scaling-*` class
- **延後理由**：目前不存在切換場景

#### B11. 縮放時 race condition（線段中途被刪等）

- **來源**：Sprint 5.3 SUGGESTION（與 rotate / translate 同類問題）
- **位置**：[src/hooks/useScaleInteraction.ts](src/hooks/useScaleInteraction.ts)
- **問題**：拖曳期間若外部 state mutate（mirror toggle / undo / 鍵盤刪除）→ snapshot 與 current `lines` 長度可能不一致
- **建議修法**：snapshot 時記錄行數，onMove 中比對；不一致則 abort
- **延後理由**：與 B3（rotate 的 race）同性質，集中處理

#### B12. 手動驗證：custom pivot 拖過對角錨點後的位置

- **來源**：Sprint 5.3 SUGGESTION（manual QA）
- **內容**：先把 pivot 拖到非中心位置 → 縮放拖過對角錨點（產生負縮放）→ pivot 應該被鏡射到對側；後續再操作（translate / scale / rotate）不能讓 pivot 卡在錨點。
- **延後理由**：屬視覺驗證項，留給瀏覽器測試 checklist

---

---

## 來源：Sprint 5.4 Code Review（2026-05-06）

### 🟡 低優先 / 邊界案例 — 暫緩

#### B13. Removed-index inference 用 JSON.stringify 比較

- **來源**：Sprint 5.4 SUGGESTION
- **位置**：[src/hooks/useDesignHistory.ts](src/hooks/useDesignHistory.ts) `reconcileLines`
- **問題**：刪除偵測迴圈用 JSON.stringify 逐行比較找出被刪的索引。LineManager 的 handleDeleteLine 已知 index，可以直接傳遞。
- **建議修法**：新增 `removeLine(index: number)` handler，避免推測
- **延後理由**：sub-millisecond 成本，目前正確

#### B14. Reset 在無變化時也會 toast

- **來源**：Sprint 5.4 SUGGESTION
- **位置**：[src/App.tsx](src/App.tsx) `handleReset`
- **問題**：commitWith 會 short-circuit，但 toast 還是會顯示
- **建議修法**：reset 回傳是否真的有變更，或在呼叫前先比對

#### B15. live/commit handler API 配對不對稱

- **來源**：Sprint 5.4 SUGGESTION
- **位置**：[src/hooks/useDesignHistory.ts](src/hooks/useDesignHistory.ts) `DesignHistoryHandlers`
- **問題**：handlers 一字排開 9 個方法（live + commit + meta + mirror + style + shift + reset + template）。`setStyleConfig` 是 live-only 但沒對應 `commitStyleConfig`，呼叫端要記得搭配 `handlers.commit`
- **建議修法**：每個 concern 都提供 paired (`setX` / `commitX`)，或提供 `withCommit(setter)` helper
- **延後理由**：屬 API 設計重整，搭配 EditorCanvas 重構（B1）一起處理

#### B16. Color picker 在 macOS 不可靠 blur

- **來源**：Sprint 5.4 SUGGESTION
- **位置**：StylePanel 各 section 的 `<input type="color">` `onBlur`
- **問題**：macOS 原生 color picker 關閉時不一定觸發 blur，導致 live 變更可能被綁進下一個 commit 裡（破壞「一個動作一個 undo」不變條件）
- **建議修法**：改用 250ms idle debounce commit，或自訂 color input
- **延後理由**：跨平台行為，需要實機驗證

#### B17. useHistory `initial` 只在 mount 時生效

- **來源**：Sprint 5.4 SUGGESTION
- **位置**：[src/hooks/useHistory.ts](src/hooks/useHistory.ts)
- **問題**：`initial` 一旦 mount 後就鎖定。若未來有人把 `useHistory` 用在其他地方並期待 `initial` 可變動就會出 bug
- **建議修法**：補一行注解，或加 dev-time warning
- **延後理由**：目前只有一處呼叫，當下無風險

#### B18. SizeConfig 拆分（width vs horizontalShift）的脆弱性

- **來源**：Sprint 5.4 SUGGESTION
- **位置**：[src/App.tsx](src/App.tsx) `handleSizeConfigChange`
- **問題**：`width` 不入 history、`horizontalShift` 入 history，靠 App 層的 split 邏輯維持。未來若 SizeConfig 多一個欄位，呼叫端可能漏掉 split
- **建議修法**：把 `horizontalShift` 完全移到自己的 state，或在型別層拆成 sub-object
- **延後理由**：需要型別與多檔重構，等下次有相關需求時再處理

#### B19. Equality check 用 JSON.stringify

- **來源**：Sprint 5.4 SUGGESTION
- **位置**：[src/hooks/useHistory.ts](src/hooks/useHistory.ts) `isEqual`
- **問題**：每次 commit 對 snapshot 整個 stringify。目前 ~3-5KB 可接受
- **延後理由**：當前負載沒問題

---

---

## 來源：Sprint 5.5 Code Review（2026-05-06）

### 🟡 低優先 / UX polish — 暫緩

#### B20. Apply 後輸入框被清空，無法快速重複套用同角度

- **來源**：Sprint 5.5 SUGGESTION
- **位置**：[src/components/TransformActions.tsx](src/components/TransformActions.tsx) `apply()`
- **問題**：使用者輸入 15 → Enter → 套用後輸入框清空，按住 Enter 無法重複套用 15° 等距旋轉
- **建議修法**：保留輸入值，focus 時 select-all；或暴露「last angle」preset
- **延後理由**：UX 設計題，需要使用者偏好確認

#### B21. Apply 按鈕背景的 white 是硬編碼而非 theme token

- **來源**：Sprint 5.5 SUGGESTION
- **位置**：[src/components/TransformActions.module.scss](src/components/TransformActions.module.scss) `.applyButton`
- **問題**：`color: $white;` 不會跟 theme 變化；如果未來 selection-color 變淺，對比度可能不足
- **建議修法**：定義 `--button-text` token 或 selection-color 對應的 on-accent 色
- **延後理由**：theme 系統擴充

#### B22. handleRotateSelection 應抽進 useRotateInteraction

- **來源**：Sprint 5.5 SUGGESTION
- **位置**：[src/components/EditorCanvas.tsx](src/components/EditorCanvas.tsx) `handleRotateSelection`
- **問題**：EditorCanvas 已 895 行，這個 wrapper 應該與 `beginRotate` 共處於 `useRotateInteraction`
- **建議修法**：hook 多回傳 `applyRotation(deg: number)`，drag 與 quick-rotate 共用一條路徑（也方便集中處理 in-flight guard）
- **延後理由**：屬 EditorCanvas 重構（B1）的一部分

#### B23. Tooltip 沒提示「繞 pivot」

- **來源**：Sprint 5.5 SUGGESTION
- **位置**：[src/components/TransformActions.tsx](src/components/TransformActions.tsx)
- **問題**：使用者按 +90 不知道是繞當前 pivot 還是繞 selection 中心
- **建議修法**：tooltip 加後綴「(around current pivot)」
- **延後理由**：UX 措辭，需要 i18n 一併處理

---

---

## 來源：Sprint 5.6 Code Review（2026-05-06）

### 🟡 低優先 — 暫緩

#### B24. handleRotateAll 重建 Set<number> 每次呼叫

- **來源**：Sprint 5.6 SUGGESTION
- **位置**：[src/App.tsx](src/App.tsx) `handleRotateAll`
- **問題**：每次 click 都新建一個包含所有 index 的 Set
- **建議修法**：(a) `geometry.ts` 加 `rotateAllLines(...)` overload；(b) 用 `useMemo` cache `allIndices`
- **延後理由**：scale 不大時 perf 影響忽略

#### B25. Mirror sync 蓋掉 target 旋轉的工作浪費

- **來源**：Sprint 5.6 SUGGESTION
- **位置**：[src/App.tsx](src/App.tsx) + [src/utils/geometry.ts](src/utils/geometry.ts) `rotateLinesAroundPivot`
- **問題**：rotate 後 target 旋轉結果立刻被 `applyMirrorSync` 用 source 旋轉結果覆蓋。功能正確（軸 50,50 與旋轉中心 50,50 commute），但 target 旋轉計算白做
- **建議修法**：rotate ALL 時跳過 mirror target 的旋轉；或 geometry.ts 加註解說明 commutativity
- **延後理由**：行為正確，純 perf nit

#### B26. handleRotateAll useCallback deps 包含 lines

- **來源**：Sprint 5.6 SUGGESTION
- **位置**：[src/App.tsx](src/App.tsx) `handleRotateAll` deps
- **問題**：`lines` 每次拖曳都變 → callback 也每次重建，useCallback 失效
- **建議修法**：用 ref 存 lines；或乾脆移除 useCallback
- **延後理由**：下游沒 React.memo，目前無實際 perf 影響

#### B27. Mirror source「整體旋轉」會同時影響 close（隱藏行為）

- **來源**：Sprint 5.6 SUGGESTION
- **問題**：在 menu 模式按 +90，所有 mirror source 的 close 也跟著旋轉。這是 `rotateLinesAroundPivot` 的既定契約（與單線旋轉一致），但使用者可能不知道
- **建議修法**：tooltip 或 helper text 說明
- **延後理由**：行為設計意圖，等使用者實際體感再決定

---

## 處理流程

完成本檔列出之項目時：
1. 在 commit message 引用對應編號（B1、B2…）
2. 從本檔刪除已完成項
3. 新一輪 fe-review 找到的延後項目用「來源：Sprint X.Y Code Review（YYYY-MM-DD）」分節新增於上方
4. 全部清空時可保留檔案（標註「目前沒有 backlog」）或刪除

---

**最後更新**：2026-05-06
