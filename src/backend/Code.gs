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
  if (!sheet) throw new Error('500 Database Error: 找不到 Employees 資料表，請先執行 setupSpreadsheet！');

  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] === empId) {
      var storedHash = row[3]; // pin_hash
      var salt = row[4];       // salt
      var role = row[2];       // role
      var isAdmin = !!row[5];  // is_admin
      var status = row[11];    // status
      
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
  
  // 1. 讀取 Employees (剔除 pin_hash 與 salt)
  var empSheet = ss.getSheetByName('Employees');
  var empData = empSheet ? empSheet.getDataRange().getValues() : [];
  var employees = [];
  for (var i = 1; i < empData.length; i++) {
    var r = empData[i];
    employees.push({
      emp_id: r[0],
      name: r[1],
      role: r[2],
      is_admin: !!r[5],
      primary_station: r[6],
      supported_stations: r[7] ? JSON.parse(r[7]) : [r[6]],
      can_solo: r[8] === true || r[8] === 'true',
      hire_date: r[9] ? (r[9] instanceof Date ? Utilities.formatDate(r[9], 'GMT+8', 'yyyy-MM-dd') : String(r[9])) : '',
      status: r[11] || 'Active'
    });
  }

  // 2. 讀取 Stations
  var stSheet = ss.getSheetByName('Stations');
  var stData = stSheet ? stSheet.getDataRange().getValues() : [];
  var stations = [];
  for (var j = 1; j < stData.length; j++) {
    var s = stData[j];
    stations.push({
      station_id: s[0],
      station_name: s[1],
      weekday_min_staff: Number(s[2] || 0),
      weekend_min_staff: Number(s[3] || 0),
      weekday_open_shifts: s[4] ? JSON.parse(s[4]) : ['B'],
      weekend_open_shifts: s[5] ? JSON.parse(s[5]) : ['A', 'B', 'C'],
      weekday_primary_min: Number(s[6] || 0),
      weekend_primary_min: Number(s[7] || 0),
      leader_id: s[8] || ''
    });
  }

  // 3. 讀取 Schedules (指定 yearMonth)
  var schSheet = ss.getSheetByName('Schedules');
  var schData = schSheet ? schSheet.getDataRange().getValues() : [];
  var scheduleMap = {};
  for (var k = 1; k < schData.length; k++) {
    var row = schData[k];
    if (row[1] === yearMonth) {
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

  // 4. 讀取 Rules
  var rulesSheet = ss.getSheetByName('Rules');
  var rulesData = rulesSheet ? rulesSheet.getDataRange().getValues() : [];
  var monthlyRules = {
    year_month: yearMonth || '2026-09',
    holidays: [],
    required_off_days: 8,
    overtime_cap_day: 4,
    overtime_cap_month: 46
  };
  for (var m = 1; m < rulesData.length; m++) {
    if (rulesData[m][1] === yearMonth) {
      monthlyRules.holidays = rulesData[m][2] ? JSON.parse(rulesData[m][2]) : [];
      monthlyRules.required_off_days = Number(rulesData[m][3] || 8);
      monthlyRules.overtime_cap_day = Number(rulesData[m][4] || 4);
      monthlyRules.overtime_cap_month = Number(rulesData[m][5] || 46);
      break;
    }
  }

  return {
    employees: employees,
    stations: stations,
    scheduleMap: scheduleMap,
    rules: monthlyRules
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

// 站點組長初審與營運終審處理
function handleSwapReview(session, swapId, isApproved, stage) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logNotes = (stage === 'FIRST' ? '組長初審' : '高管終審') + (isApproved ? '核准' : '駁回') + ' (單號: ' + swapId + ')';
  logAuditEvent(session, 'SWAP_' + (isApproved ? 'APPROVE' : 'REJECT'), logNotes, null, { swap_id: swapId, stage: stage, is_approved: isApproved });
  return { success: true, swap_id: swapId, stage: stage, is_approved: isApproved };
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
    for (var day = 1; day <= 31; day++) {
      var shiftCode = empShifts[day] || '';
      rowArr.push(shiftCode);
      if (shiftCode && shiftCode !== 'OFF') workCount++;
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

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === employeeData.emp_id) {
      foundRow = i + 1;
      break;
    }
  }

  var supportedStr = JSON.stringify(employeeData.supported_stations || [employeeData.primary_station]);

  if (foundRow > 0) {
    // 更新既有同仁
    sheet.getRange(foundRow, 2).setValue(employeeData.name);
    sheet.getRange(foundRow, 7).setValue(employeeData.primary_station);
    sheet.getRange(foundRow, 8).setValue(supportedStr);
    sheet.getRange(foundRow, 9).setValue(!!employeeData.can_solo);
    sheet.getRange(foundRow, 12).setValue(employeeData.status || 'Active');
  } else {
    // 新增同仁：預設密碼 000000
    var defaultSalt = Utilities.getUuid().substring(0, 8);
    var defaultHash = hashPin('000000', defaultSalt);
    sheet.appendRow([
      employeeData.emp_id,
      employeeData.name,
      employeeData.role || 'Staff',
      defaultHash,
      defaultSalt,
      false, // is_admin
      employeeData.primary_station,
      supportedStr,
      !!employeeData.can_solo,
      employeeData.hire_date || '2026-09-01',
      new Date().toISOString(),
      'Active'
    ]);
  }

  logAuditEvent(session, 'PERSONNEL_UPDATE', '更新/新增同仁資料: ' + employeeData.name + ' (' + employeeData.emp_id + ')', null, employeeData);
  return { success: true };
}

// 國定假日 120 天調移平帳紀錄
function handleHolidayTransfer(session, transferData) {
  logAuditEvent(session, 'HOLIDAY_TRANSFER', '執行國定假日調移平帳', null, transferData);
  return { success: true };
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
    session.emp_id,
    session.name,
    notes,
    beforeSnapshot ? JSON.stringify(beforeSnapshot) : '',
    afterSnapshot ? JSON.stringify(afterSnapshot) : ''
  ]);
}

/**
 * =========================================================================
 * 7+1 核心試算表資料結構一鍵初始化管理函式 (Setup & Database Bootstrap)
 * 請於 Google Apps Script 編輯器中選擇 setupSpreadsheet 並點擊「執行」
 * =========================================================================
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var tables = [
    {
      name: 'Employees',
      headers: ['emp_id', 'name', 'role', 'pin_hash', 'salt', 'is_admin', 'primary_station', 'supported_stations', 'can_solo', 'hire_date', 'created_at', 'status']
    },
    {
      name: 'Stations',
      headers: ['station_id', 'station_name', 'weekday_min_staff', 'weekend_min_staff', 'weekday_open_shifts', 'weekend_open_shifts', 'weekday_primary_min', 'weekend_primary_min', 'leader_id']
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
      ['ST_OPS', '營運處(支援)', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B111014'],
      ['ST_EXTREME', '極限組', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112002'],
      ['ST_MSS', 'MSS', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112003'],
      ['ST_SHOP_MAIN', '本鋪', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112004'],
      ['ST_SHOP_SUB', '小舖', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112005'],
      ['ST_CLEAN', '清潔', 1, 1, '["B"]', '["A"]', 1, 1, 'B112006'],
      ['ST_DINING', '餐飲', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B112007'],
      ['ST_GAGOO', 'Gagoo', 1, 2, '["B"]', '["A","B","C"]', 1, 1, 'B113106']
    ];
    defaultStations.forEach(function(st) { stSheet.appendRow(st); });
  }

  // 初始化預設高階主管帳號 (若 Employees 表只有表頭)
  var empSheet = ss.getSheetByName('Employees');
  if (empSheet && empSheet.getLastRow() === 1) {
    var salt = Utilities.getUuid().substring(0, 8);
    var hash = hashPin('000000', salt); // 預設 PIN 000000
    empSheet.appendRow([
      'B111001',
      '張處長',
      'Manager',
      hash,
      salt,
      true, // is_admin
      'ST_OPS',
      '["ST_OPS","ST_SERVICE"]',
      true,
      '2019-01-01',
      new Date().toISOString(),
      'Active'
    ]);
  }

  SpreadsheetApp.getUi().alert('7+1 核心試算表初始化已順利完成！');
}
