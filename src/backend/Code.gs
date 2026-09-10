/**
 * 學旅營運處多站點智慧排班與勞基法合規審查系統 (V2.3)
 * Google Apps Script 原生後端微服務 (Code.gs)
 * 遵循企劃案規格：
 * 1. 7+1 核心試算表資料結構對接 (Employees, Stations, Rules, Quotas, Schedules, Leaves, Audit_Logs, Month_Borders)
 * 2. SHA-256 加鹽雜湊密碼存儲與 CacheService Token 驗證 (2小時TTL)
 * 3. 雙階核決與不可抹滅之 Audit_Logs 雙快照
 * 4. HtmlService 原生掛載前端單檔，零伺服器維護成本 ($0 Serverless)
 */

function doGet(e) {
  // 掛載 React 單檔 Web App
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('學旅營運處多站點智慧排班系統')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  // JSON-RPC 路由網關 (Enterprise Security Hardened)
  try {
    var request = JSON.parse(e.postData.contents);
    var method = request.method;
    var params = request.params || {};
    var result = null;

    switch (method) {
      // 1. 公開端點 (需經過嚴格加鹽雜湊與防暴力鎖定)
      case 'auth.login':
        result = handleLogin(params.emp_id, params.pin_code);
        break;

      // 2. 一般同仁唯讀與自身資料端點 (Token 驗證)
      case 'schedule.getInitialData':
        var session = validateToken(params.token);
        result = handleGetInitialData(params.year_month, session);
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
        // 防水平越權 (Anti-IDOR)：只能匯出自己的排班日曆
        result = handleExportIcs(session.emp_id, params.year_month);
        break;

      // 3. 站點初審與調班端點 (Leader 以上)
      case 'swap.review':
        var session = validateToken(params.token);
        result = handleSwapReview(session, params.swap_id, params.is_approved, params.stage);
        break;

      // 4. 數據總控與回滾端點 (Manager 或 System Admin)
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

      // 5. 營運高階核心專屬端點 (嚴格限制僅 Manager，Admin 亦嚴禁存取！)
      case 'admin.savePersonnel':
        var session = validateToken(params.token);
        if (session.role !== 'Manager') {
          throw new Error('403 Forbidden: 依資安與人事邊界規範，系統管理員與一般同仁嚴禁介入人事主檔管理！');
        }
        result = handleSavePersonnel(session, params.employee_data);
        break;

      case 'admin.holidayTransfer':
        var session = validateToken(params.token);
        if (session.role !== 'Manager') {
          throw new Error('403 Forbidden: 依資安規範，120天國定假日調移僅限營運高階主管執行！');
        }
        result = handleHolidayTransfer(session, params.transfer_data);
        break;

      // 6. 伺服器端 Gemini 代理端點 (API 金鑰不落地，永遠存於 ScriptProperties)
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
  var cache = CacheService.getScriptCache();
  var sessionStr = cache.get('session_' + token);
  if (!sessionStr) throw new Error('401 Unauthorized: 憑證已過期或無效，請重新登入系統！');
  return JSON.parse(sessionStr);
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
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] === empId) {
      var storedHash = row[3]; // pin_hash
      var salt = row[4];       // salt
      var role = row[2];       // role
      var isAdmin = !!row[5];  // is_admin
      var status = row[11];     // status
      
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
  sheet.appendRow([
    'LOG_' + Utilities.getUuid(),
    new Date().toISOString(),
    actionType,
    session.emp_id,
    session.name,
    notes,
    beforeSnapshot ? JSON.stringify(beforeSnapshot) : '',
    afterSnapshot ? JSON.stringify(afterSnapshot) : ''
  ]);
}
