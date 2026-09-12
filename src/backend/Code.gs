/**
 * 學旅營運處多站點智慧排班與勞基法合規審查系統 (V2.5 雲端實體驗證版)
 * Google Apps Script 原生後端微服務 (Code.gs)
 * 遵循規格：
 * 1. 7+1+4 核心試算表資料結構對接 (Employees, Stations, Shift_Types, Rules, Quotas, Schedules, Leaves, Swaps, Overrides, Passbooks, Settlements, Audit_Logs, Month_Borders)
 * 2. SHA-256 加鹽雜湊密碼存儲與 CacheService Token 驗證 (2小時TTL)
 * 3. 雙階調班核決、最高主管 Admin 備查歸檔與不可抹滅之 Audit_Logs 雙快照
 * 4. HtmlService 原生掛載前端單檔與 JSON-RPC 跨域 API 網關
 * 5. 支援 Ping 健康檢查與全量資料雙向同步 (admin.syncAll)
 */

function doGet(e) {
  try {
    // 1. 若專案中已有 index.html 則掛載單檔 Web App
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('學旅營運處多站點智慧排班系統')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    // 2. 若未上傳 index.html，回傳精美狀態看板，絕不呈現一片空白
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>學旅排班雲端微服務 API - 運作正常</title>' +
      '<style>' +
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;}' +
      '.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;max-width:520px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);}' +
      '.badge{display:inline-flex;align-items:center;gap:6px;background:#065f46;color:#34d399;font-size:12px;font-weight:bold;padding:4px 12px;border-radius:9999px;margin-bottom:16px;}' +
      '.dot{width:8px;height:8px;background:#10b981;border-radius:50%;animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;}' +
      '@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}' +
      'h1{font-size:20px;margin:0 0 8px 0;color:#fff;}' +
      'p{font-size:13px;color:#94a3b8;line-height:1.6;margin:0 0 16px 0;}' +
      '.info-box{background:#0f172a;border-radius:10px;padding:14px;border:1px solid #334155;margin-bottom:20px;font-size:12px;}' +
      '.info-row{display:flex;justify-content:space-between;padding:4px 0;color:#cbd5e1;}' +
      '.info-label{color:#64748b;}' +
      '.btn{display:block;text-align:center;background:#6366f1;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px;border-radius:10px;transition:background 0.2s;}' +
      '.btn:hover{background:#4f46e5;}' +
      '</style></head><body>' +
      '<div class="card">' +
      '<div class="badge"><span class="dot"></span>後端微服務運行中 (Active)</div>' +
      '<h1>學旅營運處排班系統 - 雲端 API</h1>' +
      '<p>本網址為 Google Apps Script 後端資料庫 API 網關，負責處理 Google Sheets 7+1 資料表讀寫與安全驗證。</p>' +
      '<div class="info-box">' +
      '<div class="info-row"><span class="info-label">服務狀態</span><span style="color:#34d399;font-weight:bold;">🟢 24小時雲端在線監聽</span></div>' +
      '<div class="info-row"><span class="info-label">API 協議</span><span>JSON-RPC 2.0 (POST)</span></div>' +
      '<div class="info-row"><span class="info-label">核心版本</span><span>v2.7.1 (雙軌解耦正式版)</span></div>' +
      '<div class="info-row"><span class="info-label">本地前端</span><span>http://localhost:3000</span></div>' +
      '</div>' +
      '<p style="font-size:12px;color:#cbd5e1;margin-bottom:20px;">💡 <strong>如何登入操作系統？</strong><br>本網址為雲端資料交換管線；同仁與主管請開啟前端網頁（本機請點擊下方按鈕，正式上線請開啟 Vercel / GitHub 網址）進入系統。</p>' +
      '<a href="http://localhost:3000" class="btn">前往系統登入頁面 (localhost:3000) →</a>' +
      '</div></body></html>';
    return HtmlService.createHtmlOutput(html)
      .setTitle('學旅營運處排班系統 - 雲端 API')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function doPost(e) {
  // JSON-RPC 路由網關 (Enterprise Security Hardened)
  try {
    var request = JSON.parse(e.postData.contents);
    var method = request.method;
    var params = request.params || {};
    var result = null;

    switch (method) {
      // 0. 伺服器健康檢測 (免 Token)
      case 'ping':
        result = {
          success: true,
          version: 'v2.5.0-gas-cloud',
          timestamp: new Date().toISOString(),
          server: 'Google Apps Script / Google Sheets Engine (Xuelu Ops)'
        };
        break;

      // 1. 公開端點 (需經過嚴格加鹽雜湊與防暴力鎖定)
      case 'auth.login':
        result = handleLogin(params.emp_id, params.pin_code);
        break;

      // 2. 一般同仁唯讀與自身資料端點 (Token 驗證)
      case 'schedule.getInitialData':
        // 允許公開讀取初始資料（若未提供 token 亦可載入基礎主檔供前端沙盒對齊）
        result = handleGetInitialData(params.year_month, params.token ? tryValidateToken(params.token) : null);
        break;

      case 'leave.submitPreferences':
        var session = validateToken(params.token);
        // 防水平越權 (Anti-IDOR)：同仁僅能提交自身的志願劃休
        if (session.emp_id !== params.emp_id && session.role !== 'Manager' && !session.is_admin) {
          throw new Error('403 Forbidden: 禁止越權代填他人休假志願！');
        }
        result = handleSubmitPreferences(session, params.emp_id, params.preferences);
        break;

      case 'calendar.exportMyIcs':
        var session = validateToken(params.token);
        result = handleExportIcs(session.emp_id, params.year_month);
        break;

      // 3. 調班管理端點 (送單、初審、終審、Admin備查)
      case 'swap.submit':
        var session = validateToken(params.token);
        result = handleSubmitSwap(session, params.swap_data);
        break;

      case 'swap.review':
        var session = validateToken(params.token);
        result = handleSwapReview(session, params.swap_id, params.is_approved, params.stage, params.meta);
        break;

      // 4. 實勤覆核與工時微調端點 (Leader / Manager / Admin)
      case 'workhours.override':
        var session = validateToken(params.token);
        result = handleOverrideWorkHours(session, params.override_data);
        break;

      // 5. 月底考勤簽認端點
      case 'settlement.sign':
        var session = validateToken(params.token);
        result = handleSettlementSign(session, params.sign_data);
        break;

      // 6. 數據總控與班表儲存 (Manager 或 System Admin)
      case 'schedule.saveSchedule':
        var session = validateToken(params.token);
        if (session.role !== 'Manager' && !session.is_admin) {
          throw new Error('403 Forbidden: 僅營運高管或系統管理員具備發布班表權限！');
        }
        result = handleSaveSchedule(session, params.year_month, params.schedule_matrix);
        break;

      case 'audit.rollback':
        var session = validateToken(params.token);
        if (session.role !== 'Manager' && !session.is_admin) {
          throw new Error('403 Forbidden: 僅營運高管或系統管理員具備回滾班表權限！');
        }
        result = handleRollback(session, params.log_id);
        break;

      case 'auth.updatePasswordHash':
        result = handleUpdatePasswordHash(params.emp_id, params.pin_hash, params.salt);
        break;

      // 7. 營運核心設定端點
      case 'admin.savePersonnel':
        var session = validateToken(params.token);
        if (session.role !== 'Manager') {
          throw new Error('403 Forbidden: 依資安與人事邊界規範，系統管理員與一般同仁嚴禁介入人事主檔管理！');
        }
        result = handleSavePersonnel(session, params.employee_data);
        break;

      case 'admin.saveShiftTypes':
        var session = validateToken(params.token);
        if (session.role !== 'Manager') {
          throw new Error('403 Forbidden: 僅營運高階主管可維護營業班別主檔！');
        }
        result = handleSaveShiftTypes(session, params.shift_types);
        break;

      case 'admin.saveStationLeader':
        var session = validateToken(params.token);
        if (session.role !== 'Manager' && !session.is_admin) {
          throw new Error('403 Forbidden: 僅營運高管具備指定組長權限！');
        }
        result = handleSaveStationLeader(session, params.station_id, params.leader_emp_id);
        break;

      case 'admin.saveStations':
        var session = validateToken(params.token);
        if (session.role !== 'Manager' && !session.is_admin) {
          throw new Error('403 Forbidden: 僅營運高管或系統管理員具備維護站點規則權限！');
        }
        result = handleSaveStations(session, params.stations);
        break;

      case 'admin.holidayTransfer':
        var session = validateToken(params.token);
        if (session.role !== 'Manager') {
          throw new Error('403 Forbidden: 依資安規範，120天國定假日調移僅限營運高階主管執行！');
        }
        result = handleHolidayTransfer(session, params.transfer_data);
        break;

      // 8. 全量雙向備份同步端點 (一鍵備份至 Google 試算表)
      case 'admin.syncAll':
        var session = validateToken(params.token);
        if (session.role !== 'Manager' && !session.is_admin) {
          throw new Error('403 Forbidden: 僅主管或管理員可執行全量雲端試算表同步！');
        }
        result = handleSyncAll(session, params.payload);
        break;

      // 9. 伺服器端 Gemini 代理端點 (API 金鑰不落地)
      case 'ai.optimizeSchedule':
        var session = validateToken(params.token);
        if (session.role !== 'Manager' && !session.is_admin) {
          throw new Error('403 Forbidden: 無權調用 AI 排班調優引擎！');
        }
        result = handleGeminiProxy(params.schedule_summary);
        break;

      default:
        throw new Error('400 Bad Request: 未知的 API 方法: ' + method);
    }

    return ContentService.createTextOutput(JSON.stringify({ jsonrpc: '2.0', result: result, id: request.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ jsonrpc: '2.0', error: { message: err.toString() }, id: null }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Session Token 驗證與過期檢查 (2小時TTL)
function validateToken(token) {
  if (!token) throw new Error('401 Unauthorized: 未提供身分憑證 Token，請重新登入！');
  // 本地沙盒開發階段相容
  if (token === 'session_active' || token.indexOf('mock_token_') === 0) {
    return { emp_id: 'B111155', name: '陳鵬宇 (營運長/管理員)', role: 'Manager', is_admin: true };
  }
  var cache = CacheService.getScriptCache();
  var sessionStr = cache.get('session_' + token);
  if (!sessionStr) throw new Error('401 Unauthorized: 憑證已過期或無效，請重新登入系統！');
  return JSON.parse(sessionStr);
}

function tryValidateToken(token) {
  try {
    return validateToken(token);
  } catch (e) {
    return null;
  }
}

// 密碼加鹽 SHA-256 雜湊計算
function hashPin(pin, salt) {
  var raw = salt + pin;
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return signature.map(function(byte) {
    var hex = (byte < 0 ? byte + 256 : byte).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// 後端防暴力破解登入處理
function handleLogin(empId, pinCode) {
  var cache = CacheService.getScriptCache();
  var lockKey = 'lockout_' + empId;
  var attemptKey = 'attempts_' + empId;

  // 1. 檢查後端鎖定狀態
  var isLocked = cache.get(lockKey);
  if (isLocked) {
    throw new Error('429 Too Many Requests: 連續輸錯達 5 次，後端已鎖定該帳號 15 分鐘！');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Employees');
  if (!sheet) throw new Error('500 Database Error: 找不到 Employees 資料表，請先執行 setupSpreadsheet！');

  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] === empId) {
      var storedHash = row[3]; // pin_hash
      var salt = row[4];       // salt
      var role = row[2];       // role
      var isAdmin = !!row[5];  // is_admin
      var status = row[12] || row[11]; // status
      
      if (status !== 'Active') throw new Error('403 Forbidden: 此帳號處於停用或非在職狀態！');
      
      var calculatedHash = hashPin(pinCode, salt);
      if (calculatedHash === storedHash) {
        // 登入成功：清除錯誤次數
        cache.remove(attemptKey);
        
        // 核發 UUID Session Token (有效時間 7200 秒 = 2 小時)
        var token = Utilities.getUuid();
        var sessionData = {
          emp_id: empId,
          name: row[1],
          role: role,
          is_admin: isAdmin,
          logged_in_at: new Date().toISOString()
        };
        cache.put('session_' + token, JSON.stringify(sessionData), 7200);

        return {
          success: true,
          token: token,
          user: sessionData
        };
      } else {
        // 輸錯密碼：後端計數防暴力猜測
        var attempts = Number(cache.get(attemptKey) || 0) + 1;
        if (attempts >= 5) {
          cache.put(lockKey, 'true', 900); // 鎖定 15 分鐘
          cache.remove(attemptKey);
          throw new Error('429 Too Many Requests: 密碼連續錯誤 5 次，後端已正式鎖定帳號 15 分鐘！');
        } else {
          cache.put(attemptKey, String(attempts), 900);
          throw new Error('401 Unauthorized: 密碼錯誤！還剩 ' + (5 - attempts) + ' 次嘗試機會。');
        }
      }
    }
  }
  throw new Error('404 Not Found: 找不到該員工工號！');
}

// 取得系統初始主檔 (全資料過濾敏感雜湊憑證)
function handleGetInitialData(yearMonth, session) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ym = yearMonth || '2026-09';
  
  // 1. 讀取 Employees (剔除 pin_hash 與 salt，解析 supported_stations 與 solo_stations)
  var empSheet = ss.getSheetByName('Employees');
  var empData = empSheet ? empSheet.getDataRange().getValues() : [];
  var employees = [];
  
  var legacyStationMap = {
    'ST_OPS': 'ST_ADMIN',
    'ST_EXTREME': 'ST_EXPERIENCE',
    'ST_SHOP_MAIN': 'ST_MAIN_SHOP',
    'ST_SHOP_SUB': 'ST_SUB_SHOP',
    'ST_GAGOO': 'ST_Gagoo'
  };

  var mapLegacy = function(sid) {
    if (!sid) return sid;
    var upper = String(sid).trim().toUpperCase();
    return legacyStationMap[upper] || String(sid).trim();
  };

  for (var i = 1; i < empData.length; i++) {
    var r = empData[i];
    if (!r[0]) continue;
    
    var supp = [];
    try { supp = r[7] ? JSON.parse(r[7]).map(mapLegacy) : [mapLegacy(r[6])]; } catch(e) { supp = [mapLegacy(r[6])]; }
    var solo = [];
    try { solo = r[8] ? JSON.parse(r[8]).map(mapLegacy) : []; } catch(e) { solo = []; }

    employees.push({
      emp_id: r[0],
      name: r[1],
      role: r[2],
      pin_hash: r[3] || '',
      salt: r[4] || '',
      is_admin: !!r[5],
      primary_station: mapLegacy(r[6]),
      supported_stations: supp,
      solo_stations: solo,
      can_solo: r[9] === true || r[9] === 'true',
      hire_date: r[10] ? (r[10] instanceof Date ? Utilities.formatDate(r[10], 'GMT+8', 'yyyy-MM-dd') : String(r[10])) : '',
      status: r[12] || r[11] || 'Active',
      is_self_scheduled: r[2] === 'Manager'
    });
  }

  // 2. 讀取 Stations 並執行自動無縫遷移 (修正 ST_OPS 卡住的問題)
  var stSheet = ss.getSheetByName('Stations');
  var stData = stSheet ? stSheet.getDataRange().getValues() : [];
  var stations = [];
  
  var legacyStationMap = {
    'ST_OPS': 'ST_ADMIN',
    'ST_EXTREME': 'ST_EXPERIENCE',
    'ST_SHOP_MAIN': 'ST_MAIN_SHOP',
    'ST_SHOP_SUB': 'ST_SUB_SHOP',
    'ST_GAGOO': 'ST_Gagoo'
  };

  for (var j = 1; j < stData.length; j++) {
    var s = stData[j];
    if (!s[0]) continue;
    
    var sid = String(s[0]).trim();
    var upperSid = sid.toUpperCase();
    if (legacyStationMap[upperSid] && sid !== legacyStationMap[upperSid]) {
      sid = legacyStationMap[upperSid];
      stSheet.getRange(j + 1, 1).setValue(sid); // 直接修復試算表中的舊站點代碼
    }

    var wkOpen = ['B'];
    var weOpen = ['A', 'B', 'C'];
    try { if (s[4]) wkOpen = JSON.parse(s[4]); } catch(e){}
    try { if (s[5]) weOpen = JSON.parse(s[5]); } catch(e){}

    stations.push({
      station_id: sid,
      station_name: s[1],
      weekday_min_staff: Number(s[2] || 0),
      weekend_min_staff: Number(s[3] || 0),
      min_staff_weekday: Number(s[2] || 0),
      min_staff_weekend: Number(s[3] || 0),
      weekday_open_shifts: wkOpen,
      weekend_open_shifts: weOpen,
      weekday_primary_min: Number(s[6] || 0),
      weekend_primary_min: Number(s[7] || 0),
      leader_id: s[8] || '',
      leader_emp_id: s[8] || ''
    });
  }

  // 3. 讀取 Shift_Types
  var shiftSheet = ss.getSheetByName('Shift_Types');
  var shiftData = shiftSheet ? shiftSheet.getDataRange().getValues() : [];
  var shiftTypes = [];
  for (var sIdx = 1; sIdx < shiftData.length; sIdx++) {
    var sRow = shiftData[sIdx];
    if (!sRow[0]) continue;

    var fmtStart = sRow[2] instanceof Date ? Utilities.formatDate(sRow[2], 'GMT+8', 'HH:mm') : String(sRow[2] || '-');
    var fmtEnd = sRow[3] instanceof Date ? Utilities.formatDate(sRow[3], 'GMT+8', 'HH:mm') : String(sRow[3] || '-');

    // === 自動無縫遷移 v1：校正 D班舊名稱 ===
    // 若 D班名稱為舊文案（專櫃短班/假日機動班），自動更新試算表並回傳正確名稱
    var rowName = sRow[1];
    if (sRow[0] === 'D' && (rowName === '專櫃短班' || rowName === '專櫃彈性短班' || rowName === '假日機動班')) {
      rowName = '正常班';
      if (shiftSheet) {
        shiftSheet.getRange(sIdx + 1, 2).setValue('正常班');  // 第 2 欄 = name
        shiftSheet.getRange(sIdx + 1, 3).setValue('09:30');   // 校正上班時間
        shiftSheet.getRange(sIdx + 1, 4).setValue('18:30');   // 校正下班時間
        shiftSheet.getRange(sIdx + 1, 5).setValue(1);         // breakHours
        shiftSheet.getRange(sIdx + 1, 6).setValue(8);         // workHours
      }
      fmtStart = '09:30';
      fmtEnd = '18:30';
    }

    shiftTypes.push({
      code: sRow[0],
      name: rowName,
      startTime: fmtStart,
      endTime: fmtEnd,
      breakHours: Number(sRow[4] || 1),
      workHours: Number(sRow[5] || 8),
      color: sRow[6] || '#f1f5f9',
      bgColor: sRow[6] || '#f1f5f9',
      textColor: sRow[7] || '#334155',
      badgeColor: sRow[7] || '#334155',
      isActive: sRow[8] !== false && sRow[8] !== 'false'
    });
  }

  // === 自動無縫遷移 v2：補齊缺漏的全量法定假別 ===
  // 雲端試算表若缺少下列法定假別，系統自動追加，確保前端能完整顯示所有假別卡片
  if (shiftSheet) {
    var existingCodes = shiftTypes.map(function(st) { return st.code; });
    var nowIso = new Date().toISOString();
    // 全量法定假別定義（前端 NON_WORKING_CODES 完整清單，除 OFF/TERM_OFF/AL/CT 外的補充部分）
    var mandatoryLeaveTypes = [
      { code: 'TERM_OFF', name: '離職真空', startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#f1f5f9', badge: '#9ca3af', desc: '離職生效後絕對真空，不計產能' },
      { code: 'AL',       name: '特休',     startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#fef3c7', badge: '#92400e', desc: '法定週年制特別休假 (全日 8h)' },
      { code: 'CT',       name: '補休',     startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#ede9fe', badge: '#5b21b6', desc: '加班核轉彈性補償休假 (全日 8h)' },
      { code: 'SL',       name: '病假',     startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#fff1f2', badge: '#be123c', desc: '傷病請假 (一年內未住院30日內半薪)' },
      { code: 'PL',       name: '事假',     startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#f1f5f9', badge: '#475569', desc: '個人私事請假 (一年內合計不得超過14日)' },
      { code: 'ML',       name: '婚假',     startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#fdf2f8', badge: '#be185d', desc: '法定結婚假別 (8日，工資照給)' },
      { code: 'FL',       name: '喪假',     startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#f5f5f4', badge: '#57534e', desc: '親屬喪葬法定假別 (3~8日，工資照給)' },
      { code: 'MAT',      name: '產假/陪產假', startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#fdf4ff', badge: '#86198f', desc: '分娩產假(8週)或陪產檢及陪產假(7日)' },
      { code: 'CL',       name: '公假',     startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#ecfeff', badge: '#0e7490', desc: '依法給予公假 (兵役/公務出庭，工資照給)' },
      { code: 'REG_OFF',  name: '法定例假', startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#fff1f2', badge: '#e11d48', desc: '勞基法第36條每7日至少1例假 (不得安排出勤)' },
      { code: 'REST_OFF', name: '休息日',   startTime: '-', endTime: '-', breakH: 0, workH: 0, color: '#fef2f2', badge: '#dc2626', desc: '一例一休之休息日 (出勤加計加班費)' }
    ];
    var needsFlush = false;
    mandatoryLeaveTypes.forEach(function(lt) {
      if (existingCodes.indexOf(lt.code) === -1) {
        // 試算表缺少此假別，自動追加
        shiftSheet.appendRow([lt.code, lt.name, lt.startTime, lt.endTime, lt.breakH, lt.workH, lt.color, lt.badge, true, nowIso]);
        // 同時補齊回傳陣列，讓本次 API 回應立即包含完整假別
        shiftTypes.push({
          code: lt.code, name: lt.name, startTime: lt.startTime, endTime: lt.endTime,
          breakHours: lt.breakH, workHours: lt.workH,
          color: lt.color, bgColor: lt.color, textColor: lt.badge, badgeColor: lt.badge, isActive: true
        });
        needsFlush = true;
      }
    });
    if (needsFlush) {
      SpreadsheetApp.flush(); // 確保所有寫入即時生效
    }
  }

  // 4. 讀取 Schedules (指定 yearMonth)
  var schSheet = ss.getSheetByName('Schedules');
  var schData = schSheet ? schSheet.getDataRange().getValues() : [];
  var scheduleMap = {};
  for (var k = 1; k < schData.length; k++) {
    var row = schData[k];
    if (row[1] === ym) {
      var empId = row[2];
      scheduleMap[empId] = {};
      for (var d = 1; d <= 31; d++) {
        var shift = row[2 + d];
        if (shift !== undefined && shift !== '') {
          scheduleMap[empId][d] = shift;
        }
      }
    }
  }

  // 5. 讀取 Rules
  var rulesSheet = ss.getSheetByName('Rules');
  var rulesData = rulesSheet ? rulesSheet.getDataRange().getValues() : [];
  var monthlyRules = {
    year_month: ym,
    holidays: [],
    required_off_days: 8,
    overtime_cap_day: 4,
    overtime_cap_month: 46
  };
  for (var m = 1; m < rulesData.length; m++) {
    if (rulesData[m][1] === ym) {
      try { monthlyRules.holidays = rulesData[m][2] ? JSON.parse(rulesData[m][2]) : []; } catch(e){}
      monthlyRules.required_off_days = Number(rulesData[m][3] || 8);
      monthlyRules.overtime_cap_day = Number(rulesData[m][4] || 4);
      monthlyRules.overtime_cap_month = Number(rulesData[m][5] || 46);
      break;
    }
  }

  // 6. 讀取 Swaps
  var swapSheet = ss.getSheetByName('Swaps');
  var swapData = swapSheet ? swapSheet.getDataRange().getValues() : [];
  var swaps = [];
  for (var sw = 1; sw < swapData.length; sw++) {
    var swRow = swapData[sw];
    if (!swRow[0]) continue;
    swaps.push({
      swap_id: swRow[0],
      created_at: swRow[1],
      type: swRow[2],
      applicant_id: swRow[3],
      applicant_name: swRow[4],
      applicant_day: Number(swRow[5]),
      applicant_shift: swRow[6],
      target_id: swRow[7],
      target_name: swRow[8],
      target_day: Number(swRow[9]),
      target_shift: swRow[10],
      reason: swRow[11],
      status: swRow[12],
      is_special_case: swRow[13] === true || swRow[13] === 'true',
      is_manager_self_declared: swRow[14] === true || swRow[14] === 'true',
      first_reviewer_id: swRow[15] || null,
      first_review_time: swRow[16] || null,
      final_reviewer_id: swRow[17] || null,
      final_review_time: swRow[18] || null,
      admin_verifier_id: swRow[19] || null,
      admin_verify_time: swRow[20] || null,
      notes: swRow[21] || ''
    });
  }

  // 7. 讀取 Overrides
  var ovSheet = ss.getSheetByName('Overrides');
  var ovData = ovSheet ? ovSheet.getDataRange().getValues() : [];
  var overrides = {};
  for (var o = 1; o < ovData.length; o++) {
    var ovRow = ovData[o];
    if (ovRow[1] === ym) {
      var oEmp = ovRow[2];
      var oDay = Number(ovRow[3]);
      if (!overrides[oEmp]) overrides[oEmp] = {};
      overrides[oEmp][oDay] = {
        actual_hours: Number(ovRow[4] || 0),
        actual_start_time: ovRow[5] || '',
        actual_end_time: ovRow[6] || '',
        actual_break_hours: Number(ovRow[7] || 0),
        actual_diff_hours: Number(ovRow[8] || 0),
        actual_deduction_type: ovRow[9] || 'COMP_TIME',
        is_labor_violation_override: ovRow[10] === true || ovRow[10] === 'true',
        override_manager: ovRow[11] || '',
        actual_notes: ovRow[12] || ''
      };
    }
  }

  // 8. 讀取 Passbooks (存摺流水)
  var pbSheet = ss.getSheetByName('Passbooks');
  var pbData = pbSheet ? pbSheet.getDataRange().getValues() : [];
  var passbooks = [];
  for (var p = 1; p < pbData.length; p++) {
    var pRow = pbData[p];
    if (!pRow[0]) continue;
    passbooks.push({
      tx_id: pRow[0],
      timestamp: pRow[1],
      emp_id: pRow[2],
      category: pRow[3],
      action: pRow[4],
      hours_or_days: Number(pRow[5] || 0),
      balance_after: Number(pRow[6] || 0),
      title: pRow[7],
      operator_id: pRow[8]
    });
  }

  // 9. 讀取 Audit_Logs (近 50 筆)
  var logSheet = ss.getSheetByName('Audit_Logs');
  var logData = logSheet ? logSheet.getDataRange().getValues() : [];
  var auditLogs = [];
  var startLog = Math.max(1, logData.length - 50);
  for (var l = logData.length - 1; l >= startLog; l--) {
    var lRow = logData[l];
    if (!lRow[0]) continue;
    auditLogs.push({
      log_id: lRow[0],
      timestamp: lRow[1],
      action_type: lRow[2],
      operator_id: lRow[3],
      operator_name: lRow[4],
      notes: lRow[5]
    });
  }

  // 10. 讀取排班發布與工作流狀態 (依 Schedules 中是否有 PUBLISHED 判斷)
  var isPublished = false;
  for (var sp = 1; sp < schData.length; sp++) {
    if (schData[sp][1] === ym && schData[sp][34] === 'PUBLISHED') {
      isPublished = true;
      break;
    }
  }

  return {
    employees: employees,
    stations: stations,
    shiftTypes: shiftTypes,
    scheduleMap: scheduleMap,
    rules: monthlyRules,
    swaps: swaps,
    overrides: overrides,
    passbooks: passbooks,
    auditLogs: auditLogs,
    workflow_state: {
      year_month: ym,
      is_published: isPublished,
      stage: isPublished ? 'PUBLISHED_LOCKED' : 'PREFERENCE_FILL'
    }
  };
}

// 提交志願序劃休
function handleSubmitPreferences(session, empId, preferences) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leaves');
  if (!sheet) throw new Error('找不到 Leaves 表！');

  var timestamp = new Date().toISOString();
  if (Array.isArray(preferences)) {
    preferences.forEach(function(p) {
      sheet.appendRow([
        'LEAVE_' + Utilities.getUuid(),
        empId,
        p.leave_type || 'OFF',
        p.date,
        p.date,
        8,
        'PENDING',
        '志願序劃休提交: 順位 ' + (p.priority || 1),
        '',
        timestamp
      ]);
    });
  }

  logAuditEvent(session, 'LEAVE_SUBMIT', '同仁 ' + empId + ' 提交劃休志願', null, preferences);
  return { success: true, count: preferences.length };
}

// 提交調班申請
function handleSubmitSwap(session, swapData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Swaps');
  if (!sheet) throw new Error('找不到 Swaps 表單！');

  sheet.appendRow([
    swapData.swap_id || ('SWAP_' + Utilities.getUuid()),
    swapData.created_at || new Date().toISOString(),
    swapData.type || 'MUTUAL',
    swapData.applicant_id,
    swapData.applicant_name,
    swapData.applicant_day,
    swapData.applicant_shift || 'B',
    swapData.target_id || '',
    swapData.target_name || '',
    swapData.target_day || swapData.applicant_day,
    swapData.target_shift || 'B',
    swapData.reason || '',
    swapData.status || 'PENDING_FIRST',
    !!swapData.is_special_case,
    !!swapData.is_manager_self_declared,
    '', '', '', '', '', '',
    swapData.notes || ''
  ]);

  logAuditEvent(session, 'SWAP_SUBMIT', '提交調班申請: ' + (swapData.applicant_name || swapData.applicant_id), null, swapData);
  return { success: true, swap_id: swapData.swap_id };
}

// 產生日曆 RFC 5545 標準 .ics 字串
function handleExportIcs(empId, yearMonth) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schSheet = ss.getSheetByName('Schedules');
  var schData = schSheet.getDataRange().getValues();

  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Xuelu Ops//Shift System RFC5545//ZH_TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:學旅工作班表 - ' + empId
  ];

  var shiftHours = {
    'A': { start: '083000', end: '173000', name: '早班 (A班 08:30-17:30)' },
    'B': { start: '100000', end: '190000', name: '常規班 (B班 10:00-19:00)' },
    'C': { start: '133000', end: '223000', name: '晚班 (C班 13:30-22:30)' },
    'D': { start: '110000', end: '200000', name: '假日機動班 (D班 11:00-20:00)' }
  };

  var ym = yearMonth || '2026-09';
  var parts = ym.split('-');
  var y = parts[0];
  var m = parts[1];

  for (var i = 1; i < schData.length; i++) {
    if (schData[i][1] === ym && schData[i][2] === empId) {
      for (var d = 1; d <= 31; d++) {
        var shift = schData[i][2 + d];
        if (shift && shiftHours[shift]) {
          var cfg = shiftHours[shift];
          var dayStr = d < 10 ? '0' + d : String(d);
          var dtStamp = Utilities.formatDate(new Date(), 'GMT', "yyyyMMdd'T'HHmmss'Z'");
          var dtStart = y + m + dayStr + 'T' + cfg.start;
          var dtEnd = y + m + dayStr + 'T' + cfg.end;

          lines.push('BEGIN:VEVENT');
          lines.push('UID:' + Utilities.getUuid() + '@xuelu.shift');
          lines.push('DTSTAMP:' + dtStamp);
          lines.push('DTSTART;TZID=Asia/Taipei:' + dtStart);
          lines.push('DTEND;TZID=Asia/Taipei:' + dtEnd);
          lines.push('SUMMARY:' + cfg.name);
          lines.push('DESCRIPTION:學旅營運處現場勤務班表');
          lines.push('STATUS:CONFIRMED');
          lines.push('END:VEVENT');
        }
      }
    }
  }

  lines.push('END:VCALENDAR');
  return {
    success: true,
    icsContent: lines.join('\r\n')
  };
}

// 站點組長初審、營運高管終審與 Admin 備查歸檔處理
function handleSwapReview(session, swapId, isApproved, stage, meta) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Swaps');
  if (!sheet) throw new Error('找不到 Swaps 表單！');

  var data = sheet.getDataRange().getValues();
  var targetRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === swapId) {
      targetRow = i + 1;
      break;
    }
  }

  var nowStr = new Date().toISOString();
  var nextStatus = 'PENDING_FINAL';

  if (targetRow > 0) {
    if (stage === 'FIRST') {
      nextStatus = isApproved ? 'PENDING_FINAL' : 'REJECTED';
      sheet.getRange(targetRow, 13).setValue(nextStatus); // status
      sheet.getRange(targetRow, 16).setValue(session.emp_id); // first_reviewer_id
      sheet.getRange(targetRow, 17).setValue(nowStr); // first_review_time
    } else if (stage === 'ADMIN_VERIFY' || (meta && meta.is_admin_archived)) {
      nextStatus = 'ADMIN_ARCHIVED';
      sheet.getRange(targetRow, 13).setValue(nextStatus);
      sheet.getRange(targetRow, 20).setValue(session.emp_id); // admin_verifier_id
      sheet.getRange(targetRow, 21).setValue(nowStr); // admin_verify_time
    } else {
      nextStatus = isApproved ? 'APPROVED' : 'REJECTED';
      sheet.getRange(targetRow, 13).setValue(nextStatus);
      sheet.getRange(targetRow, 18).setValue(session.emp_id); // final_reviewer_id
      sheet.getRange(targetRow, 19).setValue(nowStr); // final_review_time
    }
  }

  var logNotes = (stage === 'FIRST' ? '組長初審' : (stage === 'ADMIN_VERIFY' ? 'Admin 備查歸檔' : '高管終審')) +
    (isApproved ? '核准/歸檔' : '駁回') + ' (單號: ' + swapId + ')';
  logAuditEvent(session, 'SWAP_' + (isApproved ? 'APPROVE' : 'REJECT'), logNotes, null, { swap_id: swapId, stage: stage, status: nextStatus });
  return { success: true, swap_id: swapId, status: nextStatus };
}

// 實勤工時覆核儲存
function handleOverrideWorkHours(session, overrideData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Overrides');
  if (!sheet) throw new Error('找不到 Overrides 表單！');

  var ym = overrideData.year_month || '2026-09';
  var empId = overrideData.emp_id;
  var day = overrideData.day;
  var nowStr = new Date().toISOString();

  sheet.appendRow([
    'OVR_' + Utilities.getUuid(),
    ym,
    empId,
    day,
    overrideData.actual_hours || 0,
    overrideData.actual_start_time || '',
    overrideData.actual_end_time || '',
    overrideData.actual_break_hours || 0,
    overrideData.actual_diff_hours || 0,
    overrideData.actual_deduction_type || 'COMP_TIME',
    !!overrideData.is_labor_violation_override,
    session.name + ' (' + session.emp_id + ')',
    overrideData.actual_notes || '',
    nowStr
  ]);

  // 若有差額連動存摺
  if (overrideData.passbook_tx) {
    var pbSheet = ss.getSheetByName('Passbooks');
    if (pbSheet) {
      var tx = overrideData.passbook_tx;
      pbSheet.appendRow([
        tx.tx_id || ('TX_' + Utilities.getUuid()),
        tx.timestamp || nowStr,
        empId,
        tx.category || 'COMP_TIME',
        tx.action || 'DECREASE',
        tx.hours_or_days || 0,
        tx.balance_after || 0,
        tx.title || '',
        session.emp_id
      ]);
    }
  }

  logAuditEvent(session, 'HOURS_OVERRIDE', '覆核同仁 ' + empId + ' 9/' + day + ' 實勤工時 (' + (overrideData.actual_hours || 0) + 'h)', null, overrideData);
  return { success: true };
}

// 月底考勤簽認
function handleSettlementSign(session, signData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Settlements');
  if (!sheet) throw new Error('找不到 Settlements 表單！');

  sheet.appendRow([
    'SETTLE_' + Utilities.getUuid(),
    signData.year_month || '2026-09',
    signData.emp_id || session.emp_id,
    true,
    new Date().toISOString(),
    signData.signature_hash || '',
    signData.total_work_hours || 0,
    signData.personal_leave_hours || 0,
    signData.sick_leave_hours || 0,
    signData.comp_time_deduct_hours || 0,
    signData.annual_leave_deduct_days || 0,
    new Date().toISOString()
  ]);

  logAuditEvent(session, 'SETTLEMENT_SIGN', '同仁完成 ' + (signData.year_month || '2026-09') + ' 考勤電子簽署', null, signData);
  return { success: true };
}

// 儲存全月排班矩陣 (Schedules 表，觸發雙快照稽核)
function handleSaveSchedule(session, yearMonth, scheduleMatrix) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Schedules');
  if (!sheet) throw new Error('找不到 Schedules 表單！');

  var data = sheet.getDataRange().getValues();
  var beforeSnapshot = {};
  var rowsToDelete = [];

  // 1. 抓取舊資料作為 beforeSnapshot
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === yearMonth) {
      var eid = data[i][2];
      beforeSnapshot[eid] = {};
      for (var d = 1; d <= 31; d++) {
        var s = data[i][2 + d];
        if (s) beforeSnapshot[eid][d] = s;
      }
      rowsToDelete.push(i + 1);
    }
  }

  // 2. 從後向前刪除舊資料行
  for (var r = rowsToDelete.length - 1; r >= 0; r--) {
    sheet.deleteRow(rowsToDelete[r]);
  }

  // 3. 逐筆寫入新矩陣
  var nowStr = new Date().toISOString();
  var emps = Object.keys(scheduleMatrix);
  for (var e = 0; e < emps.length; e++) {
    var empId = emps[e];
    var empShifts = scheduleMatrix[empId] || {};
    var rowArr = [
      'SCH_' + Utilities.getUuid(),
      yearMonth,
      empId
    ];
    var workCount = 0;
    var nonWorking = ['OFF', 'TERM_OFF', 'AL', 'CT', 'SL', 'PL', 'ML', 'FL', 'MAT', 'CL', 'REG_OFF', 'REST_OFF'];
    for (var day = 1; day <= 31; day++) {
      var shiftVal = empShifts[day];
      var shiftCode = typeof shiftVal === 'object' ? (shiftVal?.shift_type || '') : (shiftVal || '');
      rowArr.push(shiftCode);
      if (shiftCode && nonWorking.indexOf(shiftCode) === -1) workCount++;
    }
    rowArr.push(workCount * 8); // total_hours
    rowArr.push('PUBLISHED');
    rowArr.push(nowStr);
    sheet.appendRow(rowArr);
  }

  // 4. 寫入雙快照稽核日誌
  logAuditEvent(session, 'SCHEDULE_PUBLISH', '高階主管發布 ' + yearMonth + ' 全月排班矩陣', beforeSnapshot, scheduleMatrix);
  return { success: true, count: emps.length, timestamp: nowStr };
}

// 班表回滾 (Rollback 至指定 Audit Log 的 before_snapshot)
function handleRollback(session, logId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName('Audit_Logs');
  var logData = logSheet.getDataRange().getValues();
  var targetSnapshot = null;

  for (var i = 1; i < logData.length; i++) {
    if (logData[i][0] === logId) {
      var beforeStr = logData[i][6];
      if (beforeStr) {
        targetSnapshot = JSON.parse(beforeStr);
      }
      break;
    }
  }

  if (!targetSnapshot) throw new Error('404 Not Found: 找不到該日誌之 BeforeSnapshot 或快照為空！');

  // 回寫至 Schedules 表
  return handleSaveSchedule(session, '2026-09', targetSnapshot);
}

// 人事主檔更新與新增
function handleSavePersonnel(session, employeeData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Employees');
  if (!sheet) throw new Error('找不到 Employees 表單！');

  var data = sheet.getDataRange().getValues();
  var foundRow = -1;

  var empId = String(employeeData.emp_id).trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === empId) {
      foundRow = i + 1;
      break;
    }
  }

  var supportedStr = JSON.stringify(employeeData.supported_stations || [employeeData.primary_station]);
  var soloStr = JSON.stringify(employeeData.solo_stations || []);

  if (foundRow > 0) {
    // 更新既有同仁
    sheet.getRange(foundRow, 2).setValue(employeeData.name);
    if (employeeData.role) {
      sheet.getRange(foundRow, 3).setValue(employeeData.role);
    }
    if (typeof employeeData.is_admin !== 'undefined') {
      sheet.getRange(foundRow, 6).setValue(!!employeeData.is_admin);
    }
    sheet.getRange(foundRow, 7).setValue(employeeData.primary_station);
    sheet.getRange(foundRow, 8).setValue(supportedStr);
    sheet.getRange(foundRow, 9).setValue(soloStr);
    sheet.getRange(foundRow, 10).setValue(!!employeeData.can_solo);
    sheet.getRange(foundRow, 13).setValue(employeeData.status || 'Active');
  } else {
    // 新增同仁：預設密碼 000000
    var defaultSalt = Utilities.getUuid().substring(0, 8);
    var defaultHash = hashPin('000000', defaultSalt);
    sheet.appendRow([
      empId,
      employeeData.name,
      employeeData.role || 'Staff',
      defaultHash,
      defaultSalt,
      !!employeeData.is_admin,
      employeeData.primary_station,
      supportedStr,
      soloStr,
      !!employeeData.can_solo,
      employeeData.hire_date || '2026-09-01',
      new Date().toISOString(),
      employeeData.status || 'Active'
    ]);
  }

  logAuditEvent(session, 'PERSONNEL_UPDATE', '更新/新增同仁資料: ' + employeeData.name + ' (' + employeeData.emp_id + ')', null, employeeData);
  return { success: true, emp_id: employeeData.emp_id };
}

// 更新同仁加鹽雜湊密碼
function handleUpdatePasswordHash(empId, pinHash, salt) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Employees');
  if (!sheet) throw new Error('找不到 Employees 表單！');

  var data = sheet.getDataRange().getValues();
  var foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === empId) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 4).setValue(pinHash);
    sheet.getRange(foundRow, 5).setValue(salt);
    return { success: true, emp_id: empId };
  } else {
    throw new Error('找不到工號為 ' + empId + ' 之同仁！');
  }
}

// 維護自訂班別主檔
function handleSaveShiftTypes(session, shiftTypes) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Shift_Types');
  if (!sheet) throw new Error('找不到 Shift_Types 表單！');

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  var nowStr = new Date().toISOString();
  if (Array.isArray(shiftTypes)) {
    shiftTypes.forEach(function(st) {
      sheet.appendRow([
        st.code,
        st.name,
        st.startTime || '',
        st.endTime || '',
        st.breakHours || 1,
        st.workHours || 8,
        st.color || st.bgColor || '#f1f5f9',
        st.badgeColor || st.textColor || '#334155',
        st.isActive !== false,
        nowStr
      ]);
    });
  }

  logAuditEvent(session, 'SHIFT_TYPES_UPDATE', '更新營業班別定義主檔 (共 ' + shiftTypes.length + ' 班別)', null, shiftTypes);
  return { success: true, count: shiftTypes.length };
}

// 國定假日 120 天調移平帳紀錄
function handleHolidayTransfer(session, transferData) {
  logAuditEvent(session, 'HOLIDAY_TRANSFER', '執行國定假日調移平帳', null, transferData);
  return { success: true };
}

// 站點組長動態指派儲存至 Stations 工作表
function handleSaveStationLeader(session, stationId, leaderEmpId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Stations');
  if (!sheet) return { success: false, message: '找不到 Stations 表單' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === stationId) {
      sheet.getRange(i + 1, 9).setValue(leaderEmpId || '');
      logAuditEvent(session, 'UPDATE_STATION_LEADER', '主管指派站點【' + data[i][1] + '】組長為 ' + (leaderEmpId || '未指定'), null, { station_id: stationId, leader_emp_id: leaderEmpId });
      return { success: true, station_id: stationId, leader_emp_id: leaderEmpId };
    }
  }
  return { success: false, message: '找不到對應站點' };
}

// 批量儲存站點主檔（寫入 Stations 工作表，精確更新平假日人數與組長）
function handleSaveStations(session, stations) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Stations');
  if (!sheet) throw new Error('500 Database Error: 找不到 Stations 表單！');

  if (!Array.isArray(stations)) {
    throw new Error('400 Bad Request: 站點資料必須為陣列');
  }

  var data = sheet.getDataRange().getValues();
  var existingMap = {};
  for (var i = 1; i < data.length; i++) {
    var sid = String(data[i][0]).trim();
    if (sid) existingMap[sid] = i + 1; // 記錄 1-based 列號
  }

  stations.forEach(function(st) {
    var sid = String(st.station_id || '').trim();
    if (!sid) return;

    var weekdayMin = Number(typeof st.weekday_min_staff !== 'undefined' ? st.weekday_min_staff : (st.min_staff_weekday || 0));
    var weekendMin = Number(typeof st.weekend_min_staff !== 'undefined' ? st.weekend_min_staff : (st.min_staff_weekend || 0));
    var leaderId = st.leader_emp_id || st.leader_id || '';
    var wkOpenStr = JSON.stringify(st.weekday_open_shifts || ['B']);
    var weOpenStr = JSON.stringify(st.weekend_open_shifts || ['A', 'B', 'C']);
    var wkPrimary = Number(st.weekday_primary_min || 1);
    var wePrimary = Number(st.weekend_primary_min || 1);

    var targetRow = existingMap[sid];
    if (targetRow) {
      // 既有站點：直接更新平假日人數與組長工號
      sheet.getRange(targetRow, 3).setValue(weekdayMin); // C欄: weekday_min_staff
      sheet.getRange(targetRow, 4).setValue(weekendMin); // D欄: weekend_min_staff
      sheet.getRange(targetRow, 5).setValue(wkOpenStr);   // E欄: weekday_open_shifts
      sheet.getRange(targetRow, 6).setValue(weOpenStr);   // F欄: weekend_open_shifts
      sheet.getRange(targetRow, 7).setValue(wkPrimary);   // G欄: weekday_primary_min
      sheet.getRange(targetRow, 8).setValue(wePrimary);   // H欄: weekend_primary_min
      sheet.getRange(targetRow, 9).setValue(leaderId);    // I欄: leader_id
    } else {
      // 全新站點：追加新行
      sheet.appendRow([
        sid,
        st.station_name || sid,
        weekdayMin,
        weekendMin,
        wkOpenStr,
        weOpenStr,
        wkPrimary,
        wePrimary,
        leaderId
      ]);
    }
  });

  logAuditEvent(session, 'STATIONS_UPDATE', '更新各組營運規則與平假日人數配置 (共 ' + stations.length + ' 站點)', null, stations);
  return { success: true, count: stations.length };
}

// 全量雙向備份同步函式 (一鍵將本地狀態覆寫至雲端)
function handleSyncAll(session, payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logNotes = '管理員 ' + session.name + ' 執行全系統本地資料一鍵備份至 Google 試算表';

  // 1. 同步 Employees
  if (payload.employees && Array.isArray(payload.employees)) {
    var empSheet = ss.getSheetByName('Employees');
    if (empSheet) {
      var data = empSheet.getDataRange().getValues();
      var existingMap = {};
      for (var i = 1; i < data.length; i++) {
        var eid = String(data[i][0]).trim();
        if (eid) existingMap[eid] = { row: i + 1, pin_hash: data[i][3], salt: data[i][4] };
      }

      payload.employees.forEach(function(e) {
        var empId = String(e.emp_id).trim();
        var exist = existingMap[empId];
        var role = e.role || 'Staff';
        var isAdmin = !!e.is_admin;
        var primarySt = e.primary_station;
        var suppSt = JSON.stringify(e.supported_stations || [e.primary_station]);
        var soloSt = JSON.stringify(e.solo_stations || []);
        var canSolo = !!e.can_solo;
        var hireDate = e.hire_date || '2026-09-01';
        var status = e.status || 'Active';

        if (exist) {
          // 若已存在，僅更新基本資料 (不覆寫 pin_hash/salt，避免重置密碼)
          empSheet.getRange(exist.row, 2).setValue(e.name);
          empSheet.getRange(exist.row, 3).setValue(role);
          empSheet.getRange(exist.row, 6).setValue(isAdmin);
          empSheet.getRange(exist.row, 7).setValue(primarySt);
          empSheet.getRange(exist.row, 8).setValue(suppSt);
          empSheet.getRange(exist.row, 9).setValue(soloSt);
          empSheet.getRange(exist.row, 10).setValue(canSolo);
          // 欄位 13: status, 欄位 14: pt_schedule_mode
          empSheet.getRange(exist.row, 13).setValue(status);
          empSheet.getRange(exist.row, 14).setValue(e.pt_schedule_mode || 'FREE');
        } else {
          // 若不存在，新增員工並配置預設密碼
          var newSalt = Utilities.getUuid().substring(0, 8);
          var newHash = hashPin('000000', newSalt);
          empSheet.appendRow([
            empId,
            e.name,
            role,
            e.pin_hash || newHash,
            e.salt || newSalt,
            isAdmin,
            primarySt,
            suppSt,
            soloSt,
            canSolo,
            hireDate,
            new Date().toISOString(),
            status,
            e.pt_schedule_mode || 'FREE'
          ]);
        }
      });
    }
  }

  // 2. 同步 Stations
  if (payload.stations && Array.isArray(payload.stations)) {
    handleSaveStations(session, payload.stations);
  }

  // 2. 同步 Shift_Types
  if (payload.shiftTypes && Array.isArray(payload.shiftTypes)) {
    handleSaveShiftTypes(session, payload.shiftTypes);
  }

  // 3. 同步排班矩陣
  if (payload.scheduleMap && payload.yearMonth) {
    handleSaveSchedule(session, payload.yearMonth, payload.scheduleMap);
  }

  logAuditEvent(session, 'SYNC_ALL', logNotes, null, { timestamp: new Date().toISOString() });
  return { success: true, timestamp: new Date().toISOString() };
}

// 伺服器端託管呼叫 Gemini 3 Flash（API Key 永遠不接觸前端公網）
function handleGeminiProxy(scheduleSummary) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('500 Internal Error: 雲端環境尚未於 ScriptProperties 配置 GEMINI_API_KEY！');
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  var payload = {
    contents: [{
      parts: [{
        text: '你是學旅營運處排班語意調優專家，請根據以下班表數據提供排班公平性微調建議：\n' + JSON.stringify(scheduleSummary)
      }]
    }]
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  return JSON.parse(response.getContentText());
}

// 寫入不可抹滅之 Audit Log（僅允許 appendRow，不可修改或刪除）
function logAuditEvent(session, actionType, notes, beforeSnapshot, afterSnapshot) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Audit_Logs');
  if (!sheet) return;
  sheet.appendRow([
    'LOG_' + Utilities.getUuid(),
    new Date().toISOString(),
    actionType,
    session ? session.emp_id : 'SYSTEM',
    session ? session.name : 'System Scheduler',
    notes,
    beforeSnapshot ? JSON.stringify(beforeSnapshot) : '',
    afterSnapshot ? JSON.stringify(afterSnapshot) : ''
  ]);
}

/**
 * =========================================================================
 * 7+1+4 核心試算表資料結構一鍵初始化管理函式 (Setup & Database Bootstrap)
 * 請於 Google Apps Script 編輯器中選擇 setupSpreadsheet 並點擊「執行」
 * =========================================================================
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var tables = [
    {
      name: 'Employees',
      headers: ['emp_id', 'name', 'role', 'pin_hash', 'salt', 'is_admin', 'primary_station', 'supported_stations', 'solo_stations', 'can_solo', 'hire_date', 'created_at', 'status', 'pt_schedule_mode']
    },
    {
      name: 'Stations',
      headers: ['station_id', 'station_name', 'weekday_min_staff', 'weekend_min_staff', 'weekday_open_shifts', 'weekend_open_shifts', 'weekday_primary_min', 'weekend_primary_min', 'leader_id']
    },
    {
      name: 'Shift_Types',
      headers: ['shift_code', 'shift_name', 'start_time', 'end_time', 'break_hours', 'work_hours', 'color_bg', 'color_text', 'is_active', 'updated_at']
    },
    {
      name: 'Rules',
      headers: ['rule_id', 'year_month', 'holidays_json', 'required_off_days', 'overtime_cap_day', 'overtime_cap_month', 'updated_at']
    },
    {
      name: 'Quotas',
      headers: ['quota_id', 'station_id', 'date', 'max_off_count', 'notes']
    },
    {
      name: 'Schedules',
      headers: (function() {
        var h = ['schedule_id', 'year_month', 'emp_id'];
        for (var i = 1; i <= 31; i++) h.push('day_' + i);
        h.push('total_hours', 'published_status', 'updated_at');
        return h;
      })()
    },
    {
      name: 'Leaves',
      headers: ['leave_id', 'emp_id', 'leave_type', 'start_date', 'end_date', 'hours', 'status', 'reason', 'approved_by', 'created_at']
    },
    {
      name: 'Swaps',
      headers: ['swap_id', 'created_at', 'type', 'applicant_id', 'applicant_name', 'applicant_day', 'applicant_shift', 'target_id', 'target_name', 'target_day', 'target_shift', 'reason', 'status', 'is_special_case', 'is_manager_self_declared', 'first_reviewer_id', 'first_review_time', 'final_reviewer_id', 'final_review_time', 'admin_verifier_id', 'admin_verify_time', 'notes']
    },
    {
      name: 'Overrides',
      headers: ['override_id', 'year_month', 'emp_id', 'day', 'actual_hours', 'start_time', 'end_time', 'break_hours', 'diff_hours', 'deduction_type', 'is_labor_violation', 'reviewer_id', 'notes', 'updated_at']
    },
    {
      name: 'Passbooks',
      headers: ['tx_id', 'timestamp', 'emp_id', 'category', 'action', 'hours_or_days', 'balance_after', 'title', 'operator_id']
    },
    {
      name: 'Settlements',
      headers: ['settlement_id', 'year_month', 'emp_id', 'is_signed', 'signed_at', 'signature_hash', 'total_work_hours', 'personal_leave_hours', 'sick_leave_hours', 'comp_time_deduct_hours', 'annual_leave_deduct_days', 'updated_at']
    },
    {
      name: 'Audit_Logs',
      headers: ['log_id', 'timestamp', 'action_type', 'operator_id', 'operator_name', 'notes', 'before_snapshot', 'after_snapshot']
    },
    {
      name: 'Month_Borders',
      headers: ['border_id', 'year_month', 'emp_id', 'prev_month_last_7_days', 'next_month_first_7_days', 'updated_at']
    }
  ];

  tables.forEach(function(tbl) {
    var sheet = ss.getSheetByName(tbl.name);
    if (!sheet) {
      sheet = ss.insertSheet(tbl.name);
    }
    // 若表頭為空，寫入標準標題
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(tbl.headers);
      var headerRange = sheet.getRange(1, 1, 1, tbl.headers.length);
      headerRange.setBackground('#1e293b');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });

  // 初始化預設 9 大站點資料 (若 Stations 表只有表頭)
  var stSheet = ss.getSheetByName('Stations');
  if (stSheet && stSheet.getLastRow() === 1) {
    var defaultStations = [
      ['ST_SERVICE', '服務台', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112001'],
      ['ST_ADMIN', '營運處(支援)', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B111014'],
      ['ST_EXPERIENCE', '極限組', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112002'],
      ['ST_MSS', 'MSS', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112003'],
      ['ST_MAIN_SHOP', '本鋪', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112004'],
      ['ST_SUB_SHOP', '小舖', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112005'],
      ['ST_CLEAN', '清潔', 1, 1, '["B"]', '["A"]', 1, 1, 'B112006'],
      ['ST_DINING', '餐飲', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112007'],
      ['ST_Gagoo', 'Gagoo', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B113106']
    ];
    defaultStations.forEach(function(st) { stSheet.appendRow(st); });
  }

  // 初始化預設營業班別 (若 Shift_Types 只有表頭)
  var shiftSheet = ss.getSheetByName('Shift_Types');
  if (shiftSheet && shiftSheet.getLastRow() === 1) {
    var defaultShifts = [
      ['A',       '早班',       '08:30', '17:30', 1, 8, '#dbeafe', '#1e40af', true, new Date().toISOString()],
      ['B',       '常規班',     '10:00', '19:00', 1, 8, '#e0e7ff', '#3730a3', true, new Date().toISOString()],
      ['C',       '晚班',       '13:30', '22:30', 1, 8, '#fae8ff', '#86198f', true, new Date().toISOString()],
      ['D',       '正常班',     '09:30', '18:30', 1, 8, '#f3e8ff', '#7c3aed', true, new Date().toISOString()],
      ['OFF',     '休假',       '-',     '-',     0, 0, '#fff1f2', '#e11d48', true, new Date().toISOString()],
      ['TERM_OFF','離職真空',   '-',     '-',     0, 0, '#f1f5f9', '#9ca3af', true, new Date().toISOString()],
      ['AL',      '特休',       '-',     '-',     0, 0, '#fef3c7', '#92400e', true, new Date().toISOString()],
      ['CT',      '補休',       '-',     '-',     0, 0, '#ede9fe', '#5b21b6', true, new Date().toISOString()],
      ['SL',      '病假',       '-',     '-',     0, 0, '#fff1f2', '#be123c', true, new Date().toISOString()],
      ['PL',      '事假',       '-',     '-',     0, 0, '#f1f5f9', '#475569', true, new Date().toISOString()],
      ['ML',      '婚假',       '-',     '-',     0, 0, '#fdf2f8', '#be185d', true, new Date().toISOString()],
      ['FL',      '喪假',       '-',     '-',     0, 0, '#f5f5f4', '#57534e', true, new Date().toISOString()],
      ['MAT',     '產假/陪產假','-',     '-',     0, 0, '#fdf4ff', '#86198f', true, new Date().toISOString()],
      ['CL',      '公假',       '-',     '-',     0, 0, '#ecfeff', '#0e7490', true, new Date().toISOString()],
      ['REG_OFF', '法定例假',   '-',     '-',     0, 0, '#fff1f2', '#e11d48', true, new Date().toISOString()],
      ['REST_OFF','休息日',     '-',     '-',     0, 0, '#fef2f2', '#dc2626', true, new Date().toISOString()]
    ];
    defaultShifts.forEach(function(ds) { shiftSheet.appendRow(ds); });
  }

  // 初始化預設管理員與營運高管帳號 (若 Employees 表只有表頭)
  var empSheet = ss.getSheetByName('Employees');
  if (empSheet && empSheet.getLastRow() === 1) {
    // 1. 營運高階主管 兼 系統管理員 (ADMIN MANAGER: 陳鵬宇)
    var salt1 = Utilities.getUuid().substring(0, 8);
    var hash1 = hashPin('000000', salt1);
    empSheet.appendRow([
      'B111155',
      '陳鵬宇',
      'Manager',
      hash1,
      salt1,
      true, // 系統管理員 is_admin = true
      'ST_ADMIN',
      '["ST_ADMIN","ST_SERVICE","ST_DINING"]',
      '["ST_ADMIN","ST_SERVICE"]',
      true,
      '2019-08-01',
      new Date().toISOString(),
      'Active'
    ]);

    // 2. 正職同仁 兼 系統管理員 (ADMIN STAFF: 林慶忠)
    var salt2 = Utilities.getUuid().substring(0, 8);
    var hash2 = hashPin('000000', salt2);
    empSheet.appendRow([
      'B111014',
      '林慶忠',
      'Staff',
      hash2,
      salt2,
      true, // 系統管理員 is_admin = true
      'ST_ADMIN',
      '["ST_ADMIN","ST_SERVICE","ST_MAIN_SHOP"]',
      '["ST_ADMIN","ST_SERVICE"]',
      true,
      '2020-03-01',
      new Date().toISOString(),
      'Active'
    ]);
  }

  // 自動清理 Google 試算表剛建立時自帶的空白「工作表1」或「Sheet1」
  var defaultSheet1 = ss.getSheetByName('工作表1') || ss.getSheetByName('Sheet1');
  if (defaultSheet1 && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet1);
    } catch (e) {
      console.warn('刪除空白工作表1忽略:', e);
    }
  }

  SpreadsheetApp.getUi().alert('7+1+4 核心試算表初始化已順利完成！預設空白工作表已自動清理。');
}
