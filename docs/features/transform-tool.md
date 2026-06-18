# Transform 工具系統（v1.5.0）

> Sprint 5.1–5.6 在 branch `feat/transform-tool` 完成。Roadmap 對應「功能 #10 — Transform 工具 + Undo/Redo」。

## 概述

MorphBar 原本只有 Select / Pen+ / Pen- 三個工具用於編輯個別 anchor 點。Sprint 5 引入一個 **Figma / Moveable 風格的 Transform 工具**，操作對象從「個別點」上升到「整條線段（甚至多條）」，並支援：

- 線段選取（單選、Shift 多選、點 path 任意位置）
- 拖曳 handle 旋轉（含 15° snap、即時角度顯示）
- bbox 內拖曳平移（含 5px 網格 + 對齊輔助線 snap）
- 8 個 scale handles 縮放（含 Shift 等比、負縮放翻轉）
- Pivot（可拖曳、9 點吸附、雙擊重置）
- Undo / Redo（涵蓋所有 Design panel 變更）
- 快捷旋轉按鈕（contextual：作用於選取；ControlsSidebar：整體繞 canvas 中心）

---

## 工具切換

| 工具 | 快捷鍵 | Icon | 功能 |
|------|--------|------|------|
| Select | V | MousePointer | 點編輯（既有） |
| Pen+ | A | GitBranchPlus | 加點（既有） |
| Pen- | D | GitBranchMinus | 刪點（既有） |
| **Transform** | **R** | **Move** | **線段層級的選取 / 移動 / 縮放 / 旋轉** |

快捷鍵需符合：modifier 必須全為 false（不可 Ctrl/Cmd/Alt）、target 不可為 input/textarea/select/contentEditable。Esc 在 Transform 工具下：有選取則清空選取，無選取則退回 Select 工具。

---

## 架構

### 主要檔案

```
src/
├── components/
│   ├── EditorCanvas.tsx        # 主畫布，整合所有 hooks
│   ├── SelectionBox.tsx        # 選擇框 + handle + 8 scale handles + pivot
│   ├── TransformActions.tsx    # Contextual 快捷旋轉面板（Sprint 5.5）
│   ├── GlobalRotationButtons.tsx # ControlsSidebar 整體旋轉（Sprint 5.6）
│   └── UndoRedoControls.tsx    # 浮動 undo/redo 按鈕（Sprint 5.4）
├── hooks/
│   ├── useLineSelection.ts     # 線段層級選取 state（與 useBoxSelection 分離）
│   ├── useRotateInteraction.ts # 旋轉 handle 拖曳
│   ├── useTranslateInteraction.ts # 平移拖曳
│   ├── useScaleInteraction.ts  # 縮放 handle 拖曳
│   ├── useHistory.ts           # 泛型歷史 stack（useReducer 版）
│   ├── useDesignHistory.ts     # Domain wrapper，含 mirror sync
│   └── useOutsideClick.ts      # popover 通用 dismiss hook
└── utils/
    └── geometry.ts             # 全部數學：bbox / rotate / translate / scale / snap
```

### 資料流（旋轉示例）

```
useRotateInteraction.onMove
  → onLinesChange(rotated)        // setLive，不入 history
  → ... (60fps)
useRotateInteraction.onUp
  → onCommit()                    // 一次性 push 到 history
```

---

## Sprint 5.1 — Rotate（旋轉）

### 選取模型
- **state**：`Set<number>`（線段 index），於 `useLineSelection` hook 管理
- **互動**：click path/anchor → 單選；Shift+click → 多選 toggle；click 空白 → 清空；Esc → 清空
- **Mirror target 不可選**；selection 在進入 Transform 工具時清空 point selection，反之亦然
- **Selection prune**：當 lines 縮短或 mirror group 改變時，自動移除無效 indices

### 選擇框視覺
- 視覺 bbox = unpadded bbox + `SELECTION_PADDING = 3` SVG units
- 顏色：`var(--selection-color)` (`#0d99ff` dark / `#0070cc` light theme)
- 選中線段：halo 高亮（drop-shadow）

### 旋轉 handle
- 位置：padded bbox top-center 上方 8 SVG units，圓形 r=2.5
- 拖曳：以 pivot 為圓心，計算當前角度與起始角度差
- **Snap**：每 15° 一個 snap 點，容差 ±3°，snap 時 handle 變色（`.selectionHandleSnapping`）
- **Cursor**：hover 顯示自訂 RotateCw SVG cursor（data URI）；拖曳期間 `<body>` 加 `is-rotating` class 全域鎖
- **角度 label**：拖曳時於游標旁顯示 `+45.0°` / `+45°`（snap 時整數，否則 1 位小數）
- **起點 ≈ pivot 守衛**：`Math.hypot(dx0, dy0) < 0.5` 時拒絕進入旋轉，避免 atan2(0,0) jitter

### Pivot
- **state**：`Point | null`，null 表示自動跟 bbox 中心
- **拖曳**：自由移動，clamp 在 `[-50, 150]` 內（避免拖出視窗無法救回）
- **9 點吸附**：4 角 + 4 邊中 + 中心，容差 ±3 SVG units（Euclidean）
- **雙擊重置**：setPivotPos(null)
- **重置時機**：mode 變或 selection 變空（不在每次點線段時重置 → 多選 shift+click 不會清掉自訂 pivot）
- **Hover 視覺**：十字線變白變粗（`<g className={styles.pivot}>:hover .selectionPivot`）

### Mirror source 旋轉
- 旋轉 mirror source 時 menu + close 同步轉（在 `rotateLinesAroundPivot` 內邏輯）
- `applyMirrorSync` 在 commit 時自動把 target 從 rotated source 重新導出

### 重要 bug fixes
- **SVG `overflow: visible`**：讓 handle / pivot 超出 viewBox 仍可看到且可點
- **`computeBoundingBox` 只計算 anchor**：control points 不影響 bbox（為未來 Bezier 預留）
- **`BoundingBox` 加 `rawWidth / rawHeight`**：避免 `MIN_BBOX_SIZE = 1` 在 degenerate 線段時遮蔽 epsilon 守衛

---

## Sprint 5.2 — Translate（平移）

- 工具改名 `'rotate'` → `'transform'`，icon `RotateCw` → `Move`
- **進入 translate 的條件**：
  - 點到**已選**線段的 path/anchor → 立即進入 translate
  - 點到 bbox 內**空白**（`.bboxDragArea` 透明 hit rect）→ 立即進入 translate
  - 點到**未選**線段 → 維持 select-replace 行為（不立即拖曳，**簡化 MVP**）
- **Snap**：以 originBbox top-left 為 group 的 reference point，傳給既有的 `useAlignmentGuides.computeSnap`（整合 5px 網格 + 對齊輔助線）
- **Shift 軸鎖**：`|rawDx| > |rawDy|` → 鎖 y；反之鎖 x
- **Mirror source**：menu / close 同步平移
- **Pivot**：custom pivot 加 `(dx, dy)`；default pivot 自動跟 bbox 中心
- **Body class**：`is-translating` 全域 `cursor: grabbing`

---

## Sprint 5.3 — Scale（縮放）

### Handle 配置（8 個）
```
tl ── tc ── tr
│     │     │
ml ── (no center handle) ── mr
│     │     │
bl ── bc ── br
```

- 視覺位置：padded bbox 角落 / 邊中（3 SVG units 方形）
- **Cursor**：4 個方向（nwse / nesw / ns / ew），拖曳期間 body class `is-scaling-{方向}` 全域鎖

### 錨點（Figma 風）
- Drag 角落 → 對角為錨點（**unpadded geometry corner**）
- Drag 邊中 → 對邊中為錨點
- **Alt held = 對稱縮放**：錨點改為 bbox 中心，雙邊同時動（Sprint 5.7）
- 視覺 handle 在 padded frame，數學錨點在 unpadded geometry：用「virtual handle point」+ mouse-to-handle offset 橋接（Sprint 5.7 修正）

### Scale 邏輯
- 維持 `virtualPt = pt + mouseToHandleOffset`（offset 在 mousedown 凍結）
- `sx = (virtualPt.x - anchor.x) / (originVirtualHandle.x - anchor.x)`
- `sy = (virtualPt.y - anchor.y) / (originVirtualHandle.y - anchor.y)`
- 邊中 handle 只影響一軸（另一軸強制 1.0）
- **負縮放**：拖過錨點 → s 變負 → 線段翻轉（允許）
- **Shift = 等比縮放**（corners only）：以 `Math.max(|sx|, |sy|)` 為大小，各軸保留各自的 sign（決策：簡單實作，未嚴格對齊 Figma 的「以較大絕對值軸的 sign 套用雙軸」— 列入 B7 backlog）
- **Shift + Alt**：等比 + 從中心對稱
- **Degenerate axis 守衛**：`bbox.rawWidth < epsilon` → x 軸強制 1.0；y 同理

### Mirror source 縮放
- menu + close 同步縮放

### Pivot
- custom pivot 跟著縮放：`pivot' = anchor + (pivot - anchor) * s`
- Alt 切換時 anchor 從對角變中心，pivot 也跟著切換錨點（行為一致，但會「跳」一下；見 B30）

### Handle 大小
- `HANDLE_SQUARE_HALF = 1`（2 SVG units 寬），Sprint 5.7 從 1.5 縮小

---

## Sprint 5.4 — Undo / Redo

### 涵蓋範圍（決策 2026-05-06）

| 入 history | 不入 history |
|-----------|------------|
| `lines` | `method`（Code Panel） |
| `mirrorGroups` | `classNameConfig`（Code Panel） |
| `styleConfig` | `sizeConfig.width`（Code Panel） |
| `sizeConfig.horizontalShift`（Design） | UI state（mode、activeTool、selection、pivot） |

> `sizeConfig` 在 App.tsx 內被拆：`renderSize.width` 用普通 useState，`horizontalShift` 放在 history snapshot 裡。組合的 `sizeConfig` 用 useMemo 拼回去。

### 鍵盤
- `Ctrl/Cmd+Z` = undo
- `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` = redo
- **守衛**：HTMLInputElement / HTMLTextAreaElement / HTMLSelectElement / `target.isContentEditable`、以及 `isInteractionActive()`（檢查 body class）

### UI
- 浮動於編輯區左下 `<UndoRedoControls />`，lucide Undo2 / Redo2
- 按鈕 disabled 反映 canUndo / canRedo

### 實作要點
- **useHistory**：用 `useReducer` 確保 past/present/future 原子更新；`lastCommittedRef` 在 callback 同步（避免 reducer 內部副作用）；JSON.stringify 等價判斷去重
- **API**：`setLive`（live 更新不 push）+ `commit`（push 目前 present）+ `commitWith(updater)`（set + push 一氣呵成，給 commit boundary 用）
- **限制**：50 步
- **memoization**：`useHistory` 與 `useDesignHistory` 的回傳值都用 `useMemo`，避免 App 的 keydown listener 在每次 render 都 unbind/rebind

### 19 個 commit boundary

| 來源 | 動作 |
|------|------|
| EditorCanvas drag end | per-point drag、rotate handle、translate、scale |
| EditorCanvas one-shot | pen+ 插入、pen+ 延伸 head、pen+ 延伸 tail、pen- 刪除 |
| LineManager | add / delete / reverse / swap / template apply |
| MirrorManager | 每次群組變動 |
| StylePanel | stroke color blur、stroke width pointer-up、background toggle、background color blur、border 各 blur |
| Animation Settings | horizontal shift pointer-up |
| Reset | handleReset |
| Sprint 5.5 / 5.6 | quick-rotate buttons / global rotation buttons |

### In-flight drag 守衛
- 拖曳期間按 Ctrl+Z 會破壞 origin snapshot → history hotkey 與整體旋轉按鈕都檢查 `isInteractionActive()`（body class `is-rotating` / `is-translating` / `is-scaling-*` / `is-point-dragging` / `is-marqueeing`）

---

## Sprint 5.5 — Contextual 快捷旋轉 + 角度輸入

### TransformActions component
- 位置：Toolbar 下方左對齊，獨立浮動區塊（不在 Toolbar 同一 panel 內）
- 顯示條件：`activeTool === 'transform'` AND `selectedLines.size > 0`
- 拖曳進行中 disabled

### 內容
- 3 顆 preset buttons（RotateCcw / RotateCw / Repeat）：-90 / +90 / 180
- 角度輸入框：`type="text"` + `inputMode="decimal"`（為處理 locale comma），Enter 套用
- `parseAngle()` 驗證：
  - 嚴格 regex `/^[+-]?\d+(\.\d+)?$/`（拒絕 `45.5.2`、`45abc`）
  - 自動把 `,` 換成 `.`
  - 拒絕 `NaN` / `Infinity`
  - `% 360 === 0` 視為 no-op
- 作用對象：當前選取，繞 `effectivePivot`
- Mirror source 自動同步 menu / close（由 `rotateLinesAroundPivot` 處理）
- 每次套用 = 1 個 history snapshot

---

## Sprint 5.6 — 整體旋轉（ControlsSidebar）

### GlobalRotationButtons component
- 位置：ControlsSidebar > Animation Settings 區，Horizontal Shift 上方
- 3 顆 buttons：-90 / +90 / 180
- 不需選取
- 作用對象：當前 mode 的**所有線段**
- 旋轉中心：canvas 中心 `(50, 50)`

### Mirror 與 canvas 中心的 commutativity
- Mirror 軸 `x=50` / `y=50` 通過 canvas 中心 (50, 50)
- 任何繞 (50, 50) 的旋轉與 mirror 都 commute
- 所以 `applyMirrorSync` 在旋轉後 re-derive targets，結果與「旋轉 mirror 的 target」幾何相同

### 守衛
- `isInteractionActive()`：拖曳進行中按鈕 no-op
- `lines.length === 0`：空線段時 no-op

---

## Sprint 5.9 — Group-level Alignment Guides（對齊輔助線重做）

### 動機
Sprint 5.2 的 translate snap 用 bbox top-left 當單一參考點，這不是設計工具的慣例（通常用物件中心或多個 reference）。Scale 則完全沒有對齊輔助線。本 sprint 重建對齊系統，translate 與 scale 共用。

### 新 hook：`src/hooks/useGroupAlignmentGuides.ts`
**保留**舊的 `useAlignmentGuides`（給點層級拖曳用），不修改。

### 選取物的 6 個 reference 值
- **x 軸**：left edge / **center** / right edge
- **y 軸**：top edge / **center** / bottom edge

### 對齊目標（在 drag start 時計算一次）
- Canvas 水平中線 `y = 50`、垂直中線 `x = 50`
- 每條**非選取**線段的 bbox：left / center / right + top / center / bottom（共 6 個值）
- Mirror target 線段算進去（有實際幾何位置）
- Canvas 邊緣 (0/100) **不算**

### 規則
- **Tolerance**：1.5 SVG units
- **優先序**：center 對 center > edge 對 edge；同類比距離；center reference 永遠贏（priority logic）
- **Translate snap**：6 個 reference 全部檢查，找最佳對齊，調整 dx/dy；未對齊的軸 fallback 5px 網格
- **Scale snap**：只檢查**正在動的那一邊**（依 handle id 對應 `MOVING_EDGES`）；Alt 對稱縮放時**跳過** snap（單邊 snap 在對稱情境會強迫挑側，違反使用者意圖）

### 視覺
重用既有 `<GuidesLayer>`，輔助線通過匹配位置橫跨全 canvas；canvas 中心線用 `.guideLineCenter` 樣式區別。

### Degenerate 線段處理
- 無 anchor 的線段：跳過（避免污染 `(0, 0)` target）
- 單 anchor 線段：只 emit 中心點（padding 對稱 → center 精確）
- Collinear 線段（rawWidth=0 或 rawHeight=0）：只 emit 中心點 + 另一軸的 left/right 或 top/bottom

### 整合
- `useTranslateInteraction`：移除 `pivot` 參數（無用）；改用 `snapTranslate`
- `useScaleInteraction`：新增 `snapScale`；Alt 時不呼叫
- `EditorCanvas`：用 ref bridges 解 hook 依賴循環；merge `[...activeGuides, ...groupGuides]` 給 `<GuidesLayer>`

---

## Sprint 5.10 — Figma-style Rotation Interaction（旋轉觸發改造）

### 動機
原本 Sprint 5.1 的旋轉專屬 handle（bbox 上方圓形 + 連接線）使用者覺得難用。改為 Figma 慣例：滑鼠移到角落**外側**時 cursor 變旋轉 icon。

### 移除
- bbox 上方的旋轉 handle 圓形 + 連接線
- SCSS：`.selectionHandle` / `.selectionHandleSnapping` / `.selectionConnector`
- SelectionBox 的 `isSnapping` prop（無視覺 handle 可變色）

### 新增：4 個 corner-outside hit zones
- 每個 zone 是 6×6 SVG units 的透明 `<rect>`
- 位置：padded bbox 4 個角落**對外**延伸（tl 在 `(left-6, top-6)`、tr 在 `(right, top-6)` 等）
- Class `.rotateZone`：`fill: transparent; pointer-events: all; cursor: $rotate-cursor`
- 4 個 zone 共用同一個 `onRotateZoneMouseDown` handler
- **無 keyboard handler**（mouse-only 互動，與 Figma 一致）；keyboard 旋轉走 TransformActions 快捷按鈕 / 角度輸入

### Paint order（重要）
`bboxDragArea → selectionBox border → rotateZones → scaleHandles → pivot group`

Rotate zone 與 corner scale handle 有 1×1 sliver 重疊（在 padded corner）；scale handle 後畫，所以 hit-test 贏。**邊中 scale handle**（tc/bc/ml/mr）位於 bbox 邊中點，與 corner-outside rotate zone 幾何不重疊。

### Tiny bbox（去掉的 guard）
原本想加閾值「padded width/height < 12 不顯示 zones」，但實測發現**單一水平線段 padded height=7 < 12** 會讓 rotation 完全消失。事實上 rotate zones 與邊中 scale handles 永不重疊（位置不同），加上 Z-order 處理 corner sliver，guard 完全不必要。**移除**。

### 既有功能保留
- `useRotateInteraction` 內部邏輯、15° snap、起點 ≈ pivot 守衛、Pivot 拖曳、9 點吸附
- 角度 label（拖曳時跟手顯示，integer at snap / 1-decimal otherwise）
- `body.is-rotating` 全域 cursor lock

### Sprint 5.1 段落注意
本文件第 81–87 行描述「旋轉 handle 位置 bbox 上方 8 SVG units、圓形 r=2.5」**已被 5.10 移除**。當前旋轉觸發機制以本節為準。

---

## 重要決策記錄（按時序）

| 日期 | 決策 | 來源 |
|------|------|------|
| 2026-05-06 | 工具命名「Transform」（取代 Rotate，因功能擴充） | 使用者選擇 |
| 2026-05-06 | Rotate 互動模式：canvas 直接操作（取代原本 sidebar popover） | 使用者要求 |
| 2026-05-06 | 點 path 任意位置選取（不限 anchor） | 使用者採納建議 |
| 2026-05-06 | 多選互動：點擊替換 + Shift+ 點擊 toggle + Esc 清空 | 使用者採納建議 |
| 2026-05-06 | Pivot 行為：可拖曳 + 雙擊重置 + 9 點吸附 | 使用者要求拖曳能力 |
| 2026-05-06 | 快捷旋轉位置：Transform 工具的 contextual area（5.5）+ ControlsSidebar 整體（5.6） | 使用者分 A/B 兩種旋轉 |
| 2026-05-06 | 角度輸入：Enter 直接套用，無 ghost preview | 使用者採納方案 1 |
| 2026-05-06 | Scale 錨點：對角（Figma 風） | 使用者採納預設 |
| 2026-05-06 | 允許負縮放（翻轉） | 使用者採納預設 |
| 2026-05-06 | Translate snap：5px 網格 + 對齊輔助線 | 使用者要求 |
| 2026-05-06 | Translate 拖曳不顯示 (+dx, +dy) label；Scale 同理；Rotate 仍顯示角度 | 使用者偏好 |
| 2026-05-06 | 點到未選線段：先選再拖（簡化 MVP，非 Figma 一次拖完） | 使用者採納預設 |
| 2026-05-06 | Undo/Redo 涵蓋：Design Panel 全部、Code Panel 完全不含 | 使用者選擇 (c) 但排除 Code Panel |
| 2026-05-06 | Undo/Redo UI：浮動於編輯區左下 | 使用者指定 |
| 2026-05-06 | 選擇框顏色採 Figma 藍 `#0d99ff`（暗）/ `#0070cc`（亮） | 使用者要求對比 |
| 2026-05-06 | Pivot hover 視覺：白色十字線（不要背景 halo，避免殘影） | 使用者第二次調整 |
| 2026-05-22 | Scale 錨點修正：unpadded geometry corner + virtual handle offset，對角不再位移 | 使用者實測回饋 |
| 2026-05-22 | Scale 加 Alt = 對稱縮放（從 bbox 中心） | 使用者要求 |
| 2026-05-22 | Scale handle 視覺尺寸 1.5 → 1.0（2/3 縮小） | 使用者偏好 |
| 2026-05-22 | 整體旋轉先採方案 B (Shift modifier)，後決定改 A (checkbox) | 使用者偏好顯性 UI 開關 |
| 2026-05-29 | 對齊輔助線改採 6 個 bbox reference（left/center/right + top/center/bottom），translate 與 scale 共用；Mirror target 算進對齊目標 | 使用者指出原本 top-left 基準不符慣例 |
| 2026-05-29 | 旋轉觸發改 Figma 風：移除專屬 handle，corner-outside 6 SVG units 範圍內顯示 rotate cursor | 使用者實測覺得專屬 handle 難用 |
| 2026-05-29 | Rotate zones 無 tiny-bbox guard：rotate zones 與邊中 scale handles 幾何不重疊，guard 多餘且會讓單一水平線段消失旋轉觸發 | 實測 bug：水平線段選取時 rotate zones 不顯示 |

---

## 視覺 / cursor 規範

| 場景 | Cursor |
|------|--------|
| Transform 工具 + hover 線段 path | pointer |
| Hover bbox interior（`.bboxDragArea`） | move |
| Hover rotate zone（corner-outside 6 SVG units，Sprint 5.10） | 自訂 RotateCw SVG（白色填、黑色外框，深淺皆可見） |
| Drag rotation 期間 | 同上（透過 `body.is-rotating` 全域鎖） |
| Drag translation 期間 | grabbing |
| Drag scale 期間 | nwse-resize / nesw-resize / ns-resize / ew-resize（依 handle 方向） |
| Hover pivot 十字 | move（並顯示白色加粗的十字視覺） |

---

## 待決設計問題 / Open Design Questions

### Q1. 整體旋轉 + Menu 單獨轉（2026-05-22 提出，等待決策）

**使用者情境**：
> 「我想要在轉成 Menu 的時候整個 icon 轉 +-90 / +-180，這個可能要配合整體旋轉調整」

**目前 Sprint 5.6 整體旋轉行為**：

| 線段類型 | menu 模式按 +90 後 |
|---------|-------------------|
| 一般線段 | 只有 menu 轉，close 不動 ✅（符合需求） |
| **Mirror source** | menu + close 都轉（因為 source 內建「成對」規則） |
| **Mirror target** | 跟著 source（也跟著兩邊都轉） |

**問題**：使用者**沒用 mirror** 時現有行為已符合需求；**有用 mirror** 時，「menu 整體旋轉」會連帶讓 close 也轉，使用者期待 close 保留原樣。

### 候選方案

| 方案 | 行為 | 實作量 | 優缺 |
|------|------|--------|------|
| **A. ControlsSidebar 加 toggle** | 「Rotate current mode only」勾選後 → 忽略 mirror source 的成對規則 | 小 | UI 多一個選項，學習成本 |
| **B. Shift modifier**（已建議） | Shift+click 整體旋轉按鈕 = 只轉當前 mode（忽略 mirror）；普通 click = 維持現狀 | 小 | 符合 Figma 慣例；tooltip 補說明 |
| **C. 不寫新功能，提示使用者** | 暫時拆 mirror → 旋轉 → 再加 mirror | 0 | 流程繁瑣，但保留現有行為 |

**先前建議**：方案 B（Shift modifier）— 符合 Figma 慣例、UI 不變、組合直覺。

### 使用者決策（2026-05-22）

最初採方案 **B（Shift modifier）**並完成 Sprint 5.8；隨後使用者偏好顯性 UI 開關，於 Sprint 5.8b 改採方案 **A（checkbox toggle）**。

### Sprint 5.8b 實作結果 ✅

- [src/App.tsx](../../src/App.tsx)：新增 `rotateCurrentModeOnly` state（UI preference，不入 history、不持久化），`handleRotateAll(deg)` 讀此 state 決定要不要把 `sourceIndices` 改傳 `new Set()` 給 `rotateLinesAroundPivot`
- [src/components/ControlsSidebar.tsx](../../src/components/ControlsSidebar.tsx)：在 Animation Settings > Rotate All group 內，於 `<GlobalRotationButtons />` 下方加上 checkbox「Rotate current mode only」，含 tooltip 說明「Useful with mirror groups」
- [src/components/GlobalRotationButtons.tsx](../../src/components/GlobalRotationButtons.tsx)：`onRotate` 簽名還原為 `(deg) => void`，移除 `e.shiftKey` 讀取
- **`rotateLinesAroundPivot`、`applyMirrorSync`、geometry 均未修改** ✓

### 行為總結

| 操作 | 一般線段 | Mirror source | Mirror target |
|------|---------|--------------|--------------|
| Checkbox 未勾選 | 只轉 mode | 兩邊都轉 | 跟著 source（兩邊都轉） |
| **Checkbox 已勾選** | 只轉 mode | **只轉 mode** | 跟著 source（只該 mode） |

### 技術備註

實作關鍵在於：**整體旋轉只有「需不需要把 mirror source 視為 source」的差別**，由 caller 控制 `sourceIndices` 即可達成。

- 維持現狀：傳入真實 source 集合 → source 兩邊都轉
- 「只轉當前 mode」：傳入 `new Set()` → 所有線段（包含 source）都只轉當前 mode

`applyMirrorSync` 之後仍會跑，因為它逐欄位（menu vs close）同步：target.menu 從 rotated source.menu 鏡射；target.close 從**未動的** source.close 鏡射 → close 保持原樣。**幾何上結果正確**（rotation 繞 (50,50) 與 mirror 軸 commute）。

### Pre-existing 注意事項（記入 B31）

`applyMirrorSync` 沒對鏈式 mirror group 做依賴排序。一條線同時為 group A target 與 group B source 時，iteration 順序會影響結果。**此問題與 Sprint 5.8 無關，普通旋轉也有此問題**。

---

## 已知技術債（詳見 `REVIEW_BACKLOG.md`）

| 編號 | 主要項目 | 嚴重度 |
|------|---------|--------|
| **B1** | EditorCanvas.tsx 超過 200 行上限（目前 ~900+）— 需單獨重構 sprint | **High** |
| B2 | useCanvasRender.ts、geometry.ts、EditorCanvas.module.scss 也略超 200 | Medium |
| B3 | Rotate drag 期間 mirror group 變動的 race condition（極低機率） | Low |
| B4 | 重複旋轉的 FP 漂移累積 | Low |
| B5–B6 | 微小邊界 case | Low |
| B7 | Scale Shift 等比的 sign 規則未嚴格對齊 Figma | Low |
| B8 | SelectionBox prop sprawl | Medium |
| B9–B11 | Cursor 類別、未來 leak、race condition | Low |
| B12 | 手動 QA：custom pivot 經負縮放後位置 | Medium（測試項） |
| B13–B19 | Undo/Redo 微調（API、perf、UX） | Low–Medium |
| B20–B23 | Sprint 5.5 polish | Low |
| B24–B27 | Sprint 5.6 polish 與行為說明 | Low |

最大宗：**B1 EditorCanvas 重構**，建議單獨開新 sprint 處理。其他 backlog 等使用者實測後再排序。

---

## Commit history（branch `feat/transform-tool`）

```
2cd6778 docs: mark Sprint 5.1-5.6 complete in ROADMAP
a5add5d feat: add global rotation buttons in ControlsSidebar (Sprint 5.6)
ac15576 feat: contextual quick-rotate buttons and angle input (Sprint 5.5)
7d750b6 feat: add undo/redo for Design panel changes (Sprint 5.4)
94e7400 feat: add scale handles to Transform tool (Sprint 5.3)
3af439c feat: add translate to Transform tool (Sprint 5.2)
81ac58d docs: plan Sprint 5 Transform tool and add REVIEW_BACKLOG
48b087c feat: add canvas-based rotate tool (Sprint 5.1)
ba39f85 refactor: extract LineRow, LineSwapPopover, useOutsideClick from LineManager
```

> `ba39f85` 是 Sprint 5.1 開發中為了滿足 LineManager 200 行上限做的提取，與 transform 功能無直接關係但留下來。

分支尚未 push，無 PR。

---

## 接續工作建議（按優先序）

1. **手動瀏覽器測試**（清單見 session 結尾 manual-test checklist；可在 IDE 開啟 ROADMAP.md 與本文件交叉對照）
2. **修 B1 EditorCanvas 重構**：拆 `usePenAddTool` / `usePenRemoveTool` / `useSelectTool` / `useCanvasKeyboard` 等 hooks
3. **批次處理 REVIEW_BACKLOG**：依手動測試發現的痛點挑選
4. **Sprint 6 形狀生成**（圓 / 方 / 菱形）— ROADMAP 下一項
5. **Push 並開 PR**：`git push -u origin feat/transform-tool`
