# MorphBar 專案開發規劃

## 專案概述

MorphBar 是一個漢堡選單圖示動畫生成器，允許使用者視覺化設計 menu ↔ close 狀態的變形動畫，並自動生成 HTML/CSS/JS 程式碼。

---

## 目前專案狀態

### ✅ 已完成功能

- [x] 基礎編輯器：拖曳控制點編輯路徑
- [x] 雙狀態切換：Menu / Close 模式
- [x] 即時預覽：ControlsSidebar 顯示動畫效果
- [x] 程式碼生成：支援 checkbox 和 class 兩種方法
- [x] 自訂 class 名稱
- [x] 點對點對應視覺化：Hover 時顯示連接線和對應點高亮
- [x] Grid snap：5px 網格吸附
- [x] Shift 鍵軸向鎖定:水平/垂直移動限制
- [x] 重置功能
- [x] 面板切換：Design / Code
- [x] **多點路徑系統**：每條線段支援多個錨點（不再限制 2 點）
- [x] **三種編輯工具**：Select（選擇拖曳）、Pen+（新增點）、Pen-（刪除點）
- [x] **點編輯功能**：
  - 點擊路徑中間插入新點
  - 點擊頭尾點後可延伸新點
  - Pen+ 新增的點可立即拖曳
  - 刪除點時至少保留 2 點
- [x] **視覺回饋強化**：
  - Hover 點時放大並提高亮度
  - Focus 點時顯示脈動光暈
  - Pen+ 預覽顯示 + icon
  - Pen- hover 可刪除點時顯示 - icon
  - Crosshair cursor（Pen+ 模式下 focus 頭尾點時）
- [x] **Toast 通知系統**：使用 react-toastify 顯示錯誤訊息

### 📊 目前架構限制

1. **線段數量固定**：硬編碼為 3 條線（`type Lines = [LineState, LineState, LineState]`）
2. ~~**點數固定**：每條線固定 2 個端點（`menu: [Point, Point]`）~~ ✅ 已解決（支援多點路徑）
3. **無樣式自訂**：線條顏色、粗細、背景色等無法調整
4. **單點編輯**：一次只能拖曳一個點

---

## 功能需求清單與難度評估

### 🟢 第一階段：低風險功能（不改核心架構）

| 編號 | 功能                       | 難度 | 優先級 | 狀態    |
| ---- | -------------------------- | ---- | ------ | ------- |
| 1    | 反轉線段                   | ⭐   | High   | ✅ 完成 |
| 14   | 對調線段位置               | ⭐   | Medium | ✅ 完成 |
| 15   | Light Mode 主題切換        | ⭐   | High   | ✅ 完成 |
| 12   | Code 增加輸出大小設定      | ⭐⭐ | Medium | ✅ 完成 |
| 4    | 增加線段數量（最多 10 條） | ⭐⭐ | High   | ✅ 完成 |

#### 功能細節

**1. 反轉線段** ⭐

- **說明**：交換線段的起點和終點
- **影響範圍**：
  - 新增按鈕於 ControlsSidebar
  - 簡單的陣列操作：`[p1, p2]` → `[p2, p1]`
- **UI 位置**：每條線段旁的操作按鈕

**14. 對調線段位置** ⭐

- **說明**：交換線段在陣列中的順序（影響渲染層級）
- **實作方式**：
  - 下拉選單選擇兩條線段
  - 或拖曳排序 UI
- **影響**：線段顏色順序會改變

**15. Light Mode 主題切換** ⭐

- **說明**：提供亮色/暗色主題切換
- **實作方式**：
  - Header 新增主題切換按鈕（使用 Lucide 圖示：Sun/Moon）
  - 使用 CSS 變數管理色彩系統
  - LocalStorage 儲存使用者偏好
- **影響範圍**：
  - 全域樣式變數
  - 編輯器背景與網格顏色
  - 控制面板配色
  - 程式碼面板配色

**12. Code 輸出大小設定** ⭐⭐

- **說明**：允許設定生成程式碼中的 SVG 尺寸
- **UI 位置**：Code Panel
- **修改檔案**：
  - `src/utils/generator.ts:92-96` - CSS 中的 width/height
  - 新增 `size` 參數到 `generateCode` 函數

**4. 增加線段數量（最多 10 條）** ⭐⭐

- **說明**：動態新增/刪除線段
- **架構變更**：
  - `type Lines = LineState[]` （移除固定長度限制）
  - 新增顏色配置系統（目前只有 3 色：red/cyan/yellow）
- **UI 設計**：
  - "+ Add Line" 按鈕
  - 每條線段旁的 "🗑️ Delete" 按鈕
  - 顏色選擇器（或自動循環顏色）

---

### 🟡 第二階段：中等難度（部分改架構）

| 編號 | 功能                         | 難度         | 優先級 | 狀態      |
| ---- | ---------------------------- | ------------ | ------ | --------- |
| 3    | 鏡射（水平/垂直）            | ⭐⭐⭐       | Medium | ✅ 完成 |
| 6    | Menu/Close 水平移動距離      | ⭐⭐⭐       | Low    | ✅ 完成 |
| 2    | 快速調整 Hamburger 間距      | ⭐⭐⭐       | Low    | ✅ 完成（模板系統） |
| 13   | Preview 區塊（不同顏色預覽） | ⭐⭐⭐⭐     | Medium | ✅ 完成 |
| 5    | 對齊輔助線                   | ⭐⭐⭐⭐⭐   | High   | ✅ 完成 |
| 11   | Style Panel（樣式設定）      | ⭐⭐⭐⭐⭐   | High   | ✅ 完成 |
| 7    | 框選複數點移動               | ⭐⭐⭐⭐⭐⭐ | Medium | ✅ 完成 |

#### 功能細節

**2. 快速調整 Hamburger 間距** ⭐⭐⭐ ✅

- **決策（2026-05-03）**：採用模板系統作為「初始化/重置工具」（非即時調整）
  - 拒絕原選項 A（即時調整與自由編輯衝突）與選項 B（自動偵測不可預測）
  - 採變體：模板僅在 LineManager 透過 `Load Template` 按鈕載入
- **已實作模板**：
  - Hamburger → X（含 Line Spacing 參數）
  - Hamburger → Arrow（含 Line Spacing 參數）
  - Hamburger → Plus（含 Line Spacing 參數）
  - Two Lines → X（含 Line Spacing 參數）
- **UI 流程**：
  1. LineManager header → `Load Template` 按鈕（Layout icon）
  2. Modal：模板挑選器（4 卡片）→ Menu/Close 雙預覽 → 參數 slider
  3. 警示文字：「Applying a template will replace all current lines and clear all mirror groups. This action cannot be undone.」
  4. 使用者點 `Apply Template` 才實際覆寫；`Cancel` 或點背景關閉不影響當前狀態
- **檔案**：
  - `src/types/index.ts` - 新增 `Template`、`TemplateParam`
  - `src/utils/templates.ts` - 模板定義與 generator
  - `src/components/TemplateModal.tsx` + `.module.scss` - Modal 元件（含 `TemplatePreviewSvg` 內部子元件）
  - `src/components/LineManager.tsx` - 整合 `Load Template` 按鈕
  - `src/App.tsx` - `handleLoadTemplate` callback（重設 lines + mirrorGroups）

**3. 鏡射管理系統（MirrorManager）** ⭐⭐⭐

- **功能說明**：集中管理所有鏡射關係，支援即時同步鏡射（調整 Source 會自動更新 Target）
- **方案選擇**：採用**方案二**（獨立的 MirrorManager 區塊）
  - ✅ 集中管理所有鏡射關係，清晰可視
  - ✅ 支援 1對多鏡射（一個 Source → 多個 Target）
  - ✅ 支援多個獨立鏡射 Group 同時存在
  - ✅ 未來可擴充「角度吸附」、「放射狀對稱」
  - ✅ 符合專業繪圖軟體的操作邏輯（如 Clip Studio Paint）

- **資料結構**：

  ```typescript
  interface MirrorGroup {
    id: string;
    direction: 'horizontal' | 'vertical';
    sourceLine: number; // 線段 index
    targetLines: number[]; // 可以多個 target

    // 未來擴充預留
    // type?: 'axis' | 'radial';
    // axis?: { x: number; y: number; angle: number };
    // angleSnap?: number;
  }

  interface AppState {
    lines: Lines;
    mirrorGroups: MirrorGroup[]; // 新增
  }
  ```

- **UI 結構**：

  ```
  ControlsSidebar
  ├── LineManager (現有)
  ├── MirrorManager (新增) ← 新區塊
  │   ├── [+ Add Mirror Group] 按鈕
  │   └── Mirror Groups 列表
  │       ├── Group 1
  │       │   ├── Direction: [水平 | 垂直]
  │       │   ├── Source: Line 1
  │       │   ├── Targets: Line 2, Line 3
  │       │   └── [Remove Group] 按鈕
  │       └── Group 2...
  ```

- **操作流程**：
  1. 點擊「+ Add Mirror Group」
  2. 選擇 Source Line（下拉選單）
  3. 選擇 Direction（水平/垂直按鈕）
  4. 選擇 Target Line(s)（多選）
  5. 建立後在 MirrorManager 顯示
  6. 拖曳 Source Line 的點時，自動更新所有 Target Lines

- **視覺回饋**：
  - LineManager 中顯示標籤：
    - Source 線段：🔵 藍色「S」標籤
    - Target 線段：🟢 綠色「T」標籤
  - 未啟用鏡射的線段：無標籤

- **鏡射邏輯**：
  - 單向同步：調整 Source → 影響 Target，但調整 Target → 不影響 Source
  - 鏡射軸：固定為畫布中心（水平軸 y=50，垂直軸 x=50）
  - 數學公式：
    - 水平鏡射：`newY = 100 - oldY`, `newX = oldX`
    - 垂直鏡射：`newX = 100 - oldX`, `newY = oldY`

- **未來擴充：角度吸附（Clip Studio Paint 風格）**

  ```typescript
  interface MirrorGroup {
    // ... 現有欄位
    type: 'axis' | 'radial'; // 新增類型

    // 當 type === 'radial' 時使用
    radialConfig?: {
      centerX: number; // 放射中心
      centerY: number;
      divisions: number; // 幾等分 (例如 4 = 90度一份)
      angleSnap: number; // 角度吸附 (例如 15度)
    };
  }
  ```

- **實作階段**：
  - **Phase 1: 基礎架構**（本次實作）
    - 建立 `MirrorManager.tsx` 元件
    - 新增 `mirrorGroups` state 到 `App.tsx`
    - 實作 Group 新增/刪除
    - 實作即時鏡射邏輯（拖曳時觸發）
  - **Phase 2: UI 優化**
    - LineManager 加入 Source/Target 標籤
    - 改善下拉選單/多選 UI
  - **Phase 3: 未來擴充**
    - 新增 `radial` 類型支援
    - 實作角度吸附

**6. 動畫水平位移效果** ⭐⭐⭐

- **說明**：在動畫過程中整個圖標會水平位移，增加動態效果（視覺上從原位移動再回到原位）
- **實作方式**：
  - 在生成的 HTML 中添加 `<g>` 包裹層
  - 使用 CSS `transform: translateX()` 實現位移
  - 位移與線條變形同時發生
  - 動畫結束時回到原位（使用者看到的最終位置不變）
- **UI 控制**：
  - Slider 或 Number Input：-100 ~ 100 (px)
  - 預設值：0 (無位移)
  - 位置：Code Panel > Animation Settings
- **影響範圍**：
  - `src/utils/generator.ts` - HTML 和 CSS 生成邏輯
  - `src/types/index.ts` - 新增 AnimationConfig 或擴充 SizeConfig
  - `src/components/CodePanel.tsx` - 新增控制 UI
- **參考範例**：
  ```css
  .svg-group {
    transition: transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1);
  }
  .is-active .svg-group {
    transform: translateX(-45px);
  }
  ```

**5. 對齊輔助線** ⭐⭐⭐⭐⭐

- **功能**：拖曳時顯示虛線輔助對齊
- **偵測項目**：
  - 水平對齊（相同 y 座標）
  - 垂直對齊（相同 x 座標）
  - 中心對齊（x=50, y=50）
  - 與其他點對齊
- **實作要點**：
  - 設定容差範圍（例如 ±2px）
  - 即時計算效能優化
  - Snap to guide 功能

**11. Style Panel** ⭐⭐⭐⭐⭐

- **11.1 線段樣式**：
  - 顏色選擇器
  - 粗細調整（stroke-width）
  - **架構變更**：需在 `LineState` 新增 `style` 欄位
- **11.2 背景與外框**：
  - 背景色
  - 外框設定（border, border-radius）
- **11.3 全域樣式**：
  - 需新增 `GlobalStyle` 型別
  - 影響 Code 生成輸出

**13. Preview 區塊** ⭐⭐⭐⭐

- **功能**：即時預覽實際動畫效果
- **設計**：
  - 主題切換：Light / Dark / Custom
  - 實際可點擊的動畫
  - 顯示在 Design 或 Code 面板？
- **挑戰**：需整合實際的 CSS 動畫

**7. 框選複數點移動** ⭐⭐⭐⭐⭐⭐

- **功能**：
  - 矩形框選多個點
  - Shift+Click 多選
  - 同步拖曳所有選中的點
- **架構變更**：
  - `draggedPoint` → `draggedPoints: DraggedPoint[]`
  - 計算相對位移
- **UI 參考**：Figma / Illustrator 的框選

---

### 🔴 第三階段：高難度（需要重構核心）

| 編號 | 功能                       | 難度                 | 優先級 | 狀態        |
| ---- | -------------------------- | -------------------- | ------ | ----------- |
| 10   | Transform 工具 + Undo/Redo | ⭐⭐⭐⭐⭐⭐⭐⭐     | High   | 🟡 進行中   |
| 9    | 形狀生成（圓/方/菱形）     | ⭐⭐⭐⭐⭐⭐⭐⭐     | Low    | 📝 待開發   |
| 8    | 增加轉折點（多點路徑）     | ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ | High   | 🟡 部分完成 |

#### 功能細節

**8. 增加轉折點（多點路徑系統）** 🟡 部分完成

- ✅ **Phase 1: 多點路徑架構（已完成）**
  - 已完成架構重構，支援動態數量的錨點
  - 型別系統支援 `anchor` 和 `control` 兩種點（目前僅使用 anchor）

- **已完成的架構變更**：

  ```typescript
  interface PathPoint {
    x: number;
    y: number;
    type: 'anchor' | 'control'; // 錨點 vs 控制點
  }

  interface LineState {
    menu: PathPoint[]; // 從固定 2 點改為動態陣列
    close: PathPoint[];
  }
  ```

- **已實作功能**：
  - ✅ `EditorCanvas.tsx` - 多點路徑渲染（直線連接）
  - ✅ `generator.ts` - 支援多點路徑的程式碼生成
  - ✅ 三種編輯工具：Select / Pen+ / Pen-
  - ✅ 點擊路徑插入新點（自動找最近線段）
  - ✅ 頭尾點延伸功能
  - ✅ 點 Focus 狀態與視覺回饋
  - ✅ Toast 錯誤提示（刪除限制）

- ⏳ **Phase 2: 貝茲曲線控制點（待實作）**
  - 新增 control 類型的點
  - 拖曳錨點時自動生成/調整控制點
  - SVG 路徑改用 C（cubic bezier）命令
  - 控制點手把的視覺化與拖曳

**10. Transform 工具 + Undo/Redo** ⭐⭐⭐⭐⭐⭐⭐⭐ 🟡 進行中

- **總體目標**：建立一個 Figma / Moveable 風格的「Transform 工具」，可在 canvas 上直接選取、移動、縮放、旋轉線段；並補上 Undo/Redo 為所有 Design panel 操作保底
- **命名決策（2026-05-06）**：採用「**Transform**」（原規劃名為「Rotate」，因功能擴充至多操作改名）
- **架構**：在 Toolbar 新增第 4 個工具「Transform」(R)；單一工具下支援多種操作

#### Sprint 5.1 — 旋轉（Rotate）✅ 已完成（待 Code Review）

- ✅ 新增 `Tool = 'rotate'`（將於 Sprint 5.2 改名為 `'transform'`）
- ✅ 線段選取：點擊 path 任意位置、Shift+點擊多選、點空白清除、Esc 清除
- ✅ Mirror target 線段不可選；Mirror source 旋轉時 menu/close 同步轉
- ✅ 選擇框（dashed bbox + 高亮選中線段）+ 旋轉 handle + Pivot
- ✅ 拖曳旋轉 handle：15° snap（容差 ±3°）、即時角度顯示、snap 時 handle 變色
- ✅ Pivot：可拖曳、雙擊重置、9 點吸附（4 角 + 4 邊中 + 中心，容差 ±3 SVG units）
- ✅ Cursor：Hover handle 顯示 RotateCw cursor；拖曳期間於 `<body>` 加 class 維持 cursor
- ✅ 選擇框配色採用 Figma 藍 (`#0d99ff`)；角度 label 縮小 50%
- ✅ Bug fix：SVG `overflow: visible` 讓 handle/pivot 超出 viewBox 仍可點擊

新增檔案：
- `src/components/SelectionBox.tsx`
- `src/hooks/useLineSelection.ts`
- `src/hooks/useRotateInteraction.ts`
- `src/utils/geometry.ts`（含 `computeBoundingBox`、`computeMultiLineBoundingBox`、`rotateLinesAroundPivot`、`snapAngle`、`snapPivotToBoundingBox`、`SELECTION_PADDING`）

#### Sprint 5.2 — 移動（Translate）📝 待開發

- 在 bbox 內任意位置 mousedown + 拖曳 → 平移選中線段
- Cursor 進入 bbox：`move`
- Mirror source：menu / close 同步平移
- 工具改名 `'rotate'` → `'transform'`，icon 視需要更新

#### Sprint 5.3 — 縮放（Scale）📝 待開發

- 8 個縮放控制點（4 corner + 4 edge midpoint）渲染在 bbox
- Drag corner → 雙軸縮放；Drag edge → 單軸縮放
- 錨點（縮放原點）= 對角 / 對邊中點
- 按住 Shift = 等比縮放
- Mirror source：menu / close 同步縮放
- Cursor：`nwse-resize` / `nesw-resize` / `ns-resize` / `ew-resize`
- 數學：`scalePoints(points, sx, sy, anchor)`

#### Sprint 5.4 — Undo / Redo 📝 待開發

- **覆蓋範圍決策（2026-05-06）**：所有 **Design panel** 變更（採選項 c 但排除 Code Panel 項目）
  - ✅ 蓋：`lines`、`mirrorGroups`、`styleConfig`、`sizeConfig.horizontalShift`
  - ❌ 不蓋：`method`、`classNameConfig`、`sizeConfig.width`（皆屬 Code Panel）
- 實作：
  - 新增 `useHistory<T>` hook（內含 `past[]` / `present` / `future[]`）
  - `App.tsx` 用 history 包裹 design state
  - Push 時機：drag 結束、按鈕 click、input blur — 拖曳每幀 NOT push
  - 鍵盤：Ctrl+Z（Mac: ⌘Z）= undo；Ctrl+Shift+Z 或 Ctrl+Y = redo
  - 視需要在 Toolbar / Header 加 undo/redo 按鈕
- 注意事項：
  - 拖曳進行中按 undo 應 no-op 或先結束拖曳再 undo
  - History 上限（避免記憶體無上限）：建議 50–100 步
  - sizeConfig 結構問題：`width` 與 `horizontalShift` 同物件，需在 restore 時部分套用

#### Sprint 5.5 — 快捷旋轉 + 角度輸入 📝 待開發

- 在 Transform 工具的 contextual 區（toolbar 第二排或 selection 旁）顯示：
  - ⟲ 90°、⟳ 90°、180° 三顆按鈕（作用於目前選取，繞 pivot 轉）
  - 角度數值輸入（Enter 立即套用，無 ghost preview）

#### Sprint 5.6 — 整體旋轉（ControlsSidebar）📝 待開發

- ControlsSidebar > Animation Settings 新增 3 顆按鈕：⟲ 90°、⟳ 90°、180°
- 作用對象：當前 mode 的**所有線段**（不需選取）
- 旋轉中心：canvas 中心 (50, 50)

**9. 形狀生成** ⭐⭐⭐⭐⭐⭐⭐⭐

- **支援形狀**：
  - 圓形：三角函數計算圓周點
  - 正方形 / 菱形：幾何計算
- **參數**：尺寸、位置
- **問題**：
  - 套用到 menu 還是 close？
  - 如何保持兩狀態的對應關係？

---

## 建議開發順序

### ✅ Sprint 1：動態線段系統 ✨ (已完成)

**目標**：讓線段數量可擴充

- [x] 功能 #15：Light Mode 主題切換
- [x] 功能 #4：增加線段數量（最多 10 條）
- [x] 功能 #1：反轉線段
- [x] 功能 #14：對調線段位置
- [x] 功能 #12：Code 輸出大小設定

**實際完成時間**：Sprint 1 完成
**風險**：低 ✓

---

### Sprint 2：編輯體驗優化 🎨

**目標**：提升編輯器易用性

- [x] 功能 #5：對齊輔助線
- [x] 功能 #3：鏡射功能
- [x] 功能 #6：水平移動距離調整

**預估時間**：2-3 天
**風險**：中等（效能優化需注意）

---

### Sprint 3：樣式自訂系統 🎨 ✅ (已完成)

**目標**：讓使用者自訂視覺樣式

- [x] Animation Settings (Horizontal Shift) 移至 Design Panel
- [x] 功能 #11：Style Panel
  - [x] 11.1 線段顏色、粗細（全域 + per-line override toggle）
  - [x] 11.2 背景色（含 Transparent toggle）
  - [x] 11.3 外框設定（width / color / radius）
- [x] 功能 #13：Preview 區塊
  - [x] 主題切換（Dark / Light / Custom）
  - [x] 修復 `.preview-svg path` 全域樣式覆寫 bug
  - [x] 修復 className 寫死 bug（class mode 動態 selector）
  - [x] 抽出 FloatingPreview 元件

**實際完成時間**：Sprint 3 完成
**架構變更**：
- 新增 `StyleConfig` 型別、`LineState` 加 `id` / `strokeWidth?`
- 新增 `PreviewThemeConfig` 型別、`utils/previewTheme.ts` 單一真相
- `SizeConfig` 移除 `strokeWidth`（搬至 `StyleConfig`）

---

### Sprint 4：進階編輯功能 🚀

**目標**：專業級編輯能力

- [x] 功能 #7：框選複數點移動 ✅
- [ ] 功能 #10：Transform 工具 + Undo/Redo（已拆分為 Sprint 5.x，見下）
- [ ] 功能 #9：形狀生成（移至 Sprint 6）

**狀態**：部分完成；功能 #10 因範圍擴大獨立為 Sprint 5

---

### Sprint 5：Transform 工具系統 🎯（進行中）

**目標**：在 Toolbar 提供一個統一的「Transform 工具」，支援選取/移動/縮放/旋轉，並補上 Undo/Redo

| 子 Sprint | 內容 | 狀態 |
| --------- | ---- | ---- |
| 5.1 | 旋轉（Rotate）：handle 拖曳、15° snap、角度顯示、9 點 pivot snap、配色 | ✅ 已完成（待 review） |
| 5.2 | 移動（Translate）：bbox 內拖曳平移選取線段 | 📝 待開發 |
| 5.3 | 縮放（Scale）：8 個 handles + Shift 等比 | 📝 待開發 |
| 5.4 | Undo / Redo：Design panel 範圍 | 📝 待開發 |
| 5.5 | 快捷旋轉 + 角度數值輸入（作用於選取） | 📝 待開發 |
| 5.6 | 整體旋轉（ControlsSidebar，繞 canvas 中心） | 📝 待開發 |

**預估時間**：5–7 天
**風險**：中–高
**詳細功能規格**：見上方「功能 #10」段落

---

### Sprint 6：形狀生成 🔵

**目標**：快速建立常見形狀

- [ ] 功能 #9：形狀生成（圓 / 方 / 菱形）

**預估時間**：2-3 天
**風險**：高

---

### 🔥 獨立評估：轉折點功能

**功能 #8：增加轉折點**

**⚠️ 重要決策點**：

- 此功能需要**完全重構核心型別系統**
- 會影響 80% 的現有程式碼
- 建議獨立分支開發，或在專案早期決定是否實作

**如果要做，必須最先做！**

---

## 待確認的設計決策

### 1. 功能 #2：Hamburger 間距調整 ✅ 已決策（2026-05-03）

- [x] 選擇方案：採用「模板系統作為初始化/重置工具」（變體 A）
- [x] 預設模板：Hamburger→X、Hamburger→Arrow、Hamburger→Plus、Two Lines→X
- [x] 全數模板支援 Line Spacing 參數調整

### 2. 功能 #8：轉折點

- **Phase 1（多點直線路徑）**：✅ 已完成
- **Phase 2（貝茲曲線）**：⏸ **暫緩 / 移至 Backlog**（決策日期 2026-05-03）
  - 理由：影響 80% 程式碼、漢堡選單動畫 95% 都是直線、控制點手把學習成本偏離「快速生成」定位
  - 型別系統已預留 `'control'` 欄位，未來收到具體使用者需求再評估
- [ ] 允許 menu/close 有不同點數嗎？（待 Phase 2 重啟時決議）
- [ ] 支援的曲線類型？（待 Phase 2 重啟時決議）

### 3. 功能 #11：Style Panel ✅ 已決策

- [x] 樣式是「全域」還是「每條線獨立」？ → **預設全域，checkbox 控制是否 per-line override**
- [ ] 需要支援漸變色嗎？ → 暫緩，未列入 Sprint 3

### 4. 功能 #13：Preview 位置 ✅ 已決策

- [x] Preview 要獨立面板還是整合到現有面板？ → **保留浮動 Preview，不另開面板**
- [x] 需要多少預設主題？ → **三種：Dark / Light / Custom（自選色）**

### 5. 功能 #10：Transform 工具命名 ✅ 已決策（2026-05-06）

- [x] 工具名稱 → **Transform**（原為 Rotate；因擴充至多操作改名）
- [x] 旋轉互動模式 → **Canvas 直接操作**（取代原本 sidebar popover）
- [x] 多選互動 → 點擊替換、Shift+ 點擊 toggle、點空白清除、Esc 清除
- [x] Pivot 行為 → 可拖曳、雙擊重置、9 點吸附（4 角 + 4 邊中 + 中心）
- [x] 快捷旋轉按鈕位置 → Transform 工具內（contextual），作用於選取
- [x] 整體旋轉位置 → ControlsSidebar > Animation Settings，作用於所有線段

### 6. 功能 #10：Undo / Redo 範圍 ✅ 已決策（2026-05-06）

- [x] 蓋的範圍：所有 Design panel 變更 → `lines`、`mirrorGroups`、`styleConfig`、`sizeConfig.horizontalShift`
- [x] 不蓋的範圍：所有 Code panel 變更 → `method`、`classNameConfig`、`sizeConfig.width`
- [x] 鍵盤：Ctrl/Cmd + Z = undo；Ctrl/Cmd + Shift + Z 或 Ctrl + Y = redo
- [x] History push 時機 → drag 結束、click action、input blur（拖曳中每幀 NOT push）
- [x] History 上限 → 暫定 50–100 步

---

## 技術債務與重構建議

### 近期可做

1. **型別系統**：`Lines` 改為動態陣列
2. **顏色系統**：移除硬編碼的 3 色限制
3. **元件拆分**：EditorCanvas 過於龐大，考慮拆分
4. **主題系統**：建立 CSS 變數架構，支援 Light/Dark Mode

### 長期規劃

1. **狀態管理**：考慮引入 Zustand/Jotai（當功能複雜化後）
2. **效能優化**：大量點時的渲染優化
3. **Undo/Redo**：操作歷史記錄

---

## 檔案結構概覽

```
src/
├── components/
│   ├── EditorCanvas.tsx          # 主編輯器（拖曳、渲染）
│   ├── EditorCanvas.module.scss  # 編輯器樣式
│   ├── ControlsSidebar.tsx       # 控制面板
│   ├── CodePanel.tsx             # 程式碼面板
│   └── ui/
│       ├── Button.tsx
│       └── SegmentedControl.tsx
├── utils/
│   └── generator.ts              # 程式碼生成核心
├── types/
│   └── index.ts                  # 型別定義
└── App.tsx                       # 主應用程式
```

---

## 版本歷程

### v1.0.0

- ✅ 基礎編輯器
- ✅ 點對點對應視覺化
- ✅ Lucide 圖示庫整合

### v1.1.0 (當前版本) - 多點路徑系統

- ✅ 多點路徑系統（PathPoint 架構重構）
- ✅ 三種編輯工具：Select / Pen+ / Pen-
- ✅ 路徑編輯功能（插入、延伸、刪除點）
- ✅ 視覺回饋強化（Hover、Focus、Preview、Icon）
- ✅ Toast 通知系統

### v1.2.0 - 動態線段系統 ✅

- ✅ Sprint 1 功能全部完成
- ✅ Light/Dark Mode 主題切換
- ✅ 動態線段數量（1-10 條線段）
- ✅ 反轉線段功能
- ✅ 對調線段位置
- ✅ Code 輸出大小設定
- ✅ Preview 移至 EditorCanvas 浮動顯示

### v1.3.0 - 編輯體驗優化 ✅

- ✅ Sprint 2 功能全部完成
- ✅ 對齊輔助線
- ✅ 鏡射管理系統（MirrorManager）
- ✅ 動畫水平位移效果（Horizontal Shift）

### v1.4.0 - 樣式自訂系統 ✅

- Sprint 3 功能
- Animation Settings 移至 Design Panel
- Style Panel（線段顏色/粗細、背景、外框）
- Preview 主題切換（Dark / Light / Custom）
- FloatingPreview 元件抽出

### v1.5.0 (進行中) - Transform 工具系統

- Sprint 5 功能（分為 5.1–5.6 子 Sprint）
- Sprint 5.1 旋轉（Rotate）✅ 已完成（待 Code Review）
  - Canvas 直接操作的旋轉工具
  - Figma 風格選擇框 + handle + pivot
  - 15° snap、9 點 pivot snap、Figma 藍配色
  - 旋轉 cursor 與全域 cursor lock
- Sprint 5.2 移動（Translate）📝
- Sprint 5.3 縮放（Scale）📝
- Sprint 5.4 Undo / Redo 📝
- Sprint 5.5 快捷旋轉 + 角度輸入 📝
- Sprint 5.6 整體旋轉 📝

---

## 參考資源

- 靈感來源：[Zaku's Pen on CodePen](https://codepen.io/Zaku/pen/ejLNJL)
- GitHub Repo：[reginna-chao/morphbar](https://github.com/reginna-chao/morphbar)
- 圖示庫：[Lucide Icons](https://lucide.dev/)

---

**最後更新**：2026-05-06
**維護者**：@reginna-chao
