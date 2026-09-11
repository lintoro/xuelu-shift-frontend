# Antigravity 異地跨電腦開發完整操作指南

本手冊為您在**另一台新電腦（例如筆記型電腦、家中電腦或備用工作站）**使用 **Google Antigravity IDE** 延續「學旅排班系統」開發之標準作業指引。

您可以將此 Markdown 文件**直接剪下或複製帶走**，在新電腦上按步驟執行即可在 5~10 分鐘內建立完全一致的 AI 協作開發環境。

---

## 🧭 異地開發運作架構一覽

```mermaid
graph TD
    subgraph 電腦 A (當前工作站)
        A1[Antigravity IDE] -->|git push| GH[(GitHub 遠端儲存庫)]
    end
    
    subgraph 電腦 B (另一台電腦/新環境)
        GH -->|git clone / pull| B1[Antigravity IDE]
        B1 -->|git push| GH
    end
    
    GH -->|自動 CI/CD 發布| VC[Vercel 線上正式站]
    A1 -.->|連線同一個雲端| GS[(Google Sheets / GAS 後端)]
    B1 -.->|連線同一個雲端| GS
```

- **程式碼核心**：託管於 GitHub `lintoro/xuelu-shift-frontend`。
- **線上發布**：只要任何一台電腦執行 `git push origin main`，Vercel 就會自動打包並更新線上網站。
- **資料庫**：Google 試算表與 Google Apps Script (GAS) 位於雲端，兩台電腦連線的資料是即時同步、完全一致的。

---

## 🚀 第一步：新電腦基礎環境準備 (軟體安裝)

請先在新電腦上下載並安裝以下三款必備工具：

### 1. 安裝 Git
- **下載網址**：https://git-scm.com/downloads
- **安裝要點**：安裝過程中建議勾選「Git Credential Manager」（可自動在瀏覽器中記住 GitHub 登入狀態）。
- 安裝完成後，開啟終端機（PowerShell 或 Command Prompt）設定基本識別資訊：
  ```bash
  git config --global user.name "你的名字或帳號"
  git config --global user.email "你的GitHub信箱"
  ```

### 2. 安裝 Node.js
- **下載網址**：https://nodejs.org/
- **版本建議**：請選擇 **LTS 長期支援版本**（如 Node 18 或 20 以上）。
- 安裝完成後，可在終端機檢查版本確認成功：
  ```bash
  node -v
  npm -v
  ```

### 3. 安裝 Google Antigravity IDE
- **安裝程式**：若新電腦尚未安裝 Antigravity，請至官方管道下載 Antigravity IDE 安裝檔並完成安裝。
- **帳號登入**：啟動 Antigravity 後，使用與目前相同的 Google 帳號進行登入與授權。

---

## 📂 第二步：在新電腦取得專案程式碼與啟動

### 1. 建立專案目錄並 Clone 倉庫
在新電腦中開啟終端機（PowerShell 或 CMD），切換到您想要放置專案的目錄（例如 `C:\Github\ReactApp\` 或桌面）：
```bash
# 1. 建立並進入資料夾 (可依個人喜好選擇路徑)
mkdir C:\Github\ReactApp
cd C:\Github\ReactApp

# 2. 從 GitHub 拉取完整專案
git clone https://github.com/lintoro/xuelu-shift-frontend.git

# 3. 進入專案目錄
cd xuelu-shift-frontend
```

> [!TIP]
> 第一次 `git clone` 或 `git push` 時，系統會彈出瀏覽器要求授權 GitHub 帳號，點擊綠色授權按鈕即可登入，後續將自動保存授權憑證。

### 2. 安裝專案套件 (Dependencies)
在專案根目錄中執行：
```bash
npm install
```
這會自動依據 `package.json` 安裝 Vite、React、Tailwind CSS、Lucide React 圖示庫等全部依賴套件。

### 3. 本地啟動預覽測試
執行開發伺服器：
```bash
npm run dev
```
終端機將輸出本機網址（例如 `http://localhost:5173/`）。打開瀏覽器造訪，若能看到登入畫面，代表專案已在新電腦完全準備就緒！

---

## 🤖 第三步：使用 Antigravity IDE 開啟專案

1. **啟動 Antigravity IDE**。
2. 點選功能表 **File (檔案) ➜ Open Folder (開啟資料夾)**。
3. 選擇剛才 clone 下來的 `xuelu-shift-frontend` 專案資料夾。
4. **專案規則已內建自動生效**：
   - 本專案已在 `.agents/rules/` 目錄中配置好了：
     - `traditional_chinese_policy.md`（**強制繁體中文台灣回應規則**）
     - `gas_deployment_notice.md`（Google Apps Script 雲端部署同步守則）
   - Antigravity 一打開此專案，就會自動載入這兩項規則，在新電腦對話依然會自動以標準繁體中文（台灣）與您協同開發，**完全不需要手動再設定提示詞**！

---

## 🔄 第四步：雙向切換日常開發標準 SOP

為了避免兩台電腦修改發生衝突（Git Conflict），請遵循以下標準作業循環：

### 💻 情境 A：當前電腦 (A) 準備離開時
在當前電腦的 Antigravity 終端機中執行：
```bash
# 1. 檢查有修改的檔案
git status

# 2. 將修改全數加入暫存區
git add .

# 3. 提交進度備註
git commit -m "feat: 今日進度完成，準備切換至另一台電腦"

# 4. 推送到 GitHub
git push origin main
```

---

### 💻 情境 B：到另一台新電腦 (B) 準備開始工作時
在開始寫程式或呼叫 Antigravity 之前，先執行拉取：
```bash
# 確保取得最新遠端代碼
git pull origin main
```
拉取完畢後，即可開始使用 Antigravity 進行編程、除錯或新增功能！

---

### 💻 情境 C：新電腦 (B) 開發完畢後
```bash
git add .
git commit -m "feat: B電腦工作進度更新"
git push origin main
```
*推送到 GitHub 後，Vercel 線上正式站將自動在 30 秒內發布生效！*

---

### 💻 情境 D：回到原電腦 (A) 時
同樣先執行拉取：
```bash
git pull origin main
```
兩台電腦即可永遠保持無縫同步！

---

## ❓ 常見問題與排解指引 (FAQ)

### Q1：新電腦上的環境變數 `.env` 是否需要手動複製？
**不需要！** 本專案的 `.env` 與 `.env.production`（內含 Google Apps Script Web App 呼叫網址）已納入版本控制並推送到 GitHub 倉庫，`git clone` 下來時就已經包含在內，開箱即用。

### Q2：如果在另一台電腦修改了 Google Apps Script 後端代碼 (`src/backend/Code.gs`)？
記得依照本專案既定規範：
1. 複製更新後的 `src/backend/Code.gs`。
2. 前往 Google 試算表 ➜「擴充功能」➜「Apps Script」貼上覆蓋。
3. 點擊「部署」➜「管理部署作業」➜「編輯」➜ 版本選擇「新版本」➜「部署」。

### Q3：如果在兩台電腦同時修改了同一個檔案，導致 `git pull` 提示衝突 (Conflict) 怎麼辦？
只要在 Antigravity 側邊欄對話框輸入：
> *「我剛剛在 git pull 時遇到衝突，請幫我檢查並合併解決衝突。」*

Antigravity 即會自動分析衝突標記（`<<<<<<< HEAD`），保留雙方的最新程式碼並協助完成合併提交。

### Q4：若想把目前電腦的全域自訂 Skills / Rules 完整備份到新電腦？
- 目前電腦全域自訂目錄路徑：`C:\Users\<你的使用者名稱>\.gemini\`
  - `config/rules/`（全域規則）
  - `config/skills/`（全域技能）
- 如有特殊全域技能，可直接將該資料夾透過隨身碟或雲端硬碟拷貝至新電腦的 `C:\Users\<新使用者名稱>\.gemini\` 下即可。
（註：本專案本身使用的規則已內建於 `.agents/rules/`，即使不複製全域資料夾也能正常運作）。
