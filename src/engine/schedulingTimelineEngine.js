// src/engine/schedulingTimelineEngine.js
/**
 * 學旅營運處全月排班生命週期時限排程引擎 (Scheduling Timeline Lifecycle Engine)
 * 遵循營運主管嚴格規範：
 * 1. 每月 10 日開始：MANAGER 設定下月排班設定（調移、休假規則、指定各組別當月組長等）
 * 2. 每月 12 日開始：開放下個月排班劃選，一般員工開始預訂志願序
 * 3. 每月 18 日開始：協調衝突，站點組長 (Leader) 進行初審
 * 4. 每月 20 日開始：MANAGER 覆審與全場調度
 * 5. 每月 24 日前：最後需於 24 日前完成全場排定截止
 * 6. 每月 25 日：完成下月正式班表公告與全員簽回確認
 * 7. 當月底最後一天：主管完成當月出勤確認與實勤微調覆核
 * 8. 次月 2 日：全員完成當月實勤考勤結算最終簽認對帳
 * 9. 平時常態：隨時可進行線上調班申請、組長初審、高管終審/Admin 備查與出勤覆核
 */

export const TIMELINE_STAGES = [
  {
    id: 'MANAGER_PRECONFIG',
    step: 1,
    title: '主管下月排班設定',
    shortTitle: '10日 主管設定',
    periodText: '每月 10 日 ~ 11 日',
    startDay: 10,
    endDay: 11,
    responsibleRole: 'Manager',
    roleLabel: '營運高管 (Manager)',
    keyTasks: [
      '設定下月份各站排班法規參數與休假天數',
      '規劃全年度 120 天國定假日調移平帳',
      '指定完成下月份各組別當月組長 (Leader) 人選',
      '營業班別時間與工時自訂審視'
    ],
    themeColor: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
  },
  {
    id: 'EMPLOYEE_PREFERENCE',
    step: 2,
    title: '開放員工劃選預訂',
    shortTitle: '12日 員工劃選',
    periodText: '每月 12 日 ~ 17 日',
    startDay: 12,
    endDay: 17,
    responsibleRole: 'Staff/PT',
    roleLabel: '一般同仁 (正職/PT)',
    keyTasks: [
      '正職同仁線上登記 1~4 順位劃休志願',
      '計時 PT 同仁意向報班預訂',
      '系統即時比對站點每日劃休配額上限 (Daily Quotas)',
      '檢核同仁特休與補休存摺可用額度'
    ],
    themeColor: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
  },
  {
    id: 'LEADER_REVIEW',
    step: 3,
    title: '組長初審與衝突協調',
    shortTitle: '18日 組長初審',
    periodText: '每月 18 日 ~ 19 日',
    startDay: 18,
    endDay: 19,
    responsibleRole: 'Leader',
    roleLabel: '站點組長 (Leader)',
    keyTasks: [
      '檢視所轄組別同仁志願衝突透視鏡',
      '協調站點最低人力門檻與同日劃休衝突',
      '落實同組審核與利益迴避原則',
      '送交站點組長初審核定意見'
    ],
    themeColor: 'indigo',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
  },
  {
    id: 'MANAGER_FINAL_REVIEW',
    step: 4,
    title: '高管覆審與全場調度',
    shortTitle: '20日 高管覆審',
    periodText: '每月 20 日 ~ 23 日',
    startDay: 20,
    endDay: 23,
    responsibleRole: 'Manager',
    roleLabel: '營運高管 (Manager)',
    keyTasks: [
      '全館 9 大營業門市人力綜合平衡與跨組支援調度',
      '啟動確定性啟發式演算法 / AI 排班調優',
      '勞動基準法 7 休 1、四週變形與 11h 輪班間隔合規檢核',
      '準備全月正式排班矩陣發布'
    ],
    themeColor: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  },
  {
    id: 'SCHEDULE_DEADLINE',
    step: 5,
    title: '全場排定完成截止',
    shortTitle: '24日 排定截止',
    periodText: '每月 24 日前',
    startDay: 24,
    endDay: 24,
    isDeadline: true,
    responsibleRole: 'Manager',
    roleLabel: '營運高管 (Manager)',
    keyTasks: [
      '最後需於 24 日前完成全場排定發布 (剛性截止門檻)',
      '全月班表狀態標註為已發布 (PUBLISHED)',
      '寫入不可抹滅稽核快照 Audit Log (雙快照備查)'
    ],
    themeColor: 'rose',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
  },
  {
    id: 'SCHEDULE_SIGNOFF',
    step: 6,
    title: '全體下月班表公告簽回',
    shortTitle: '25日 全員簽回',
    periodText: '每月 25 日',
    startDay: 25,
    endDay: 25,
    responsibleRole: 'All',
    roleLabel: '全體同仁 (全員簽回)',
    keyTasks: [
      '下月份正式班表全館公告',
      '25 日完成全員出勤班表電子簽回確認',
      '匯出同仁專屬 RFC 5545 行事曆 (.ics) 與 CSV 清冊'
    ],
    themeColor: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    id: 'MONTH_END_ACTUAL',
    step: 7,
    title: '當月出勤確認與實勤覆核',
    shortTitle: '月底 出勤確認',
    periodText: '當月底最後一天',
    isMonthEnd: true,
    responsibleRole: 'Manager/Leader',
    roleLabel: '營運主管 / 站點組長',
    keyTasks: [
      '主管確認完成當月全月份出勤確實紀錄',
      '實勤微調覆核 (核定延長工時 / 4大假別扣抵)',
      '事假(扣全薪)、病假(扣半薪)、補休特休存摺額度比對',
      '高階主管針對違規超時出勤進行三度確認放行'
    ],
    themeColor: 'cyan',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800'
  },
  {
    id: 'NEXT_MONTH_SIGNOFF',
    step: 8,
    title: '全員考勤結算簽認對帳',
    shortTitle: '次月2日 考勤簽認',
    periodText: '次月 2 日',
    isNextMonthDay2: true,
    responsibleRole: 'All',
    roleLabel: '全體同仁 (結算簽認)',
    keyTasks: [
      '全員完成當月考勤結算電子簽回確認閉環',
      '核對全月總工時、事假時數、病假時數與補休特休沖抵天數',
      '產出不可竄改簽署金鑰 Hash 並匯出人事計薪報表'
    ],
    themeColor: 'teal',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
  }
];

/**
 * 計算指定月份的最後一天 (大月31, 小月30, 二月28/29)
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 根據給定日期判斷所屬的排班生命週期階段
 * @param {Date|string} dateInput - 日期物件或 'YYYY-MM-DD' 字串
 * @returns {Object} 包含當前階段、進度、倒數資訊與關鍵說明
 */
export function getTimelineStatus(dateInput = new Date()) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate(); // 1-31
  const daysInCurMonth = getDaysInMonth(year, month);

  // 1. 判斷是否為次月 2 日簽認階段 (若是當月 1~2 日，代表正在進行上月考勤之「次月2日全員簽回」)
  if (day >= 1 && day <= 2) {
    const stage = TIMELINE_STAGES.find(s => s.id === 'NEXT_MONTH_SIGNOFF');
    const remainingHours = Math.max(0, (2 - day) * 24 + (23 - d.getHours()));
    return {
      currentStage: stage,
      stageIndex: 7, // 0-indexed
      isNextMonthSettlementPeriod: true,
      day: day,
      daysInMonth: daysInCurMonth,
      statusLabel: day === 2 ? '⚠️ 今日為次月2日：考勤結算簽認最後截止日！' : '進行中：次月考勤結算全員簽認對帳期',
      isOverdue: false,
      deadlineText: `${month}月2日 23:59 全員完成考勤簽回`,
      actionGuidance: '全體同仁請於今日內核對上月出勤明細並完成電子簽署。'
    };
  }

  // 2. 判斷是否為「當月底出勤確認日」 (當月最後一天)
  if (day === daysInCurMonth) {
    const stage = TIMELINE_STAGES.find(s => s.id === 'MONTH_END_ACTUAL');
    return {
      currentStage: stage,
      stageIndex: 6,
      day: day,
      daysInMonth: daysInCurMonth,
      statusLabel: '⚠️ 今日為當月最後一天：完成全月出勤確認與實勤覆核！',
      isOverdue: false,
      deadlineText: `今日 ${month}/${day} 23:59 前主管完成覆核`,
      actionGuidance: '營運主管與站點組長請務必完成當月實勤覆核與請假折抵。'
    };
  }

  // 3. 判斷 10 ~ 25 日期間各特定排班階段
  if (day >= 10 && day <= 11) {
    const stage = TIMELINE_STAGES.find(s => s.id === 'MANAGER_PRECONFIG');
    const daysLeft = 12 - day;
    return {
      currentStage: stage,
      stageIndex: 0,
      day: day,
      daysInMonth: daysInCurMonth,
      statusLabel: `階段 1/8：主管排班設定期 (距開放同仁預訂尚餘 ${daysLeft} 天)`,
      isOverdue: false,
      deadlineText: `${month}月11日 23:59 前完成規則設定與組長指派`,
      actionGuidance: '營運高管 (Manager) 請設定下月調移、劃休規則與指定當月組長。'
    };
  }

  if (day >= 12 && day <= 17) {
    const stage = TIMELINE_STAGES.find(s => s.id === 'EMPLOYEE_PREFERENCE');
    const daysLeft = 18 - day;
    return {
      currentStage: stage,
      stageIndex: 1,
      day: day,
      daysInMonth: daysInCurMonth,
      statusLabel: `階段 2/8：開放同仁預訂志願劃休中 (尚餘 ${daysLeft} 天)`,
      isOverdue: false,
      deadlineText: `${month}月17日 23:59 員工劃選截止`,
      actionGuidance: '正職同仁請提交劃休志願序，計時同仁請登錄報班意向。'
    };
  }

  if (day >= 18 && day <= 19) {
    const stage = TIMELINE_STAGES.find(s => s.id === 'LEADER_REVIEW');
    const daysLeft = 20 - day;
    return {
      currentStage: stage,
      stageIndex: 2,
      day: day,
      daysInMonth: daysInCurMonth,
      statusLabel: `階段 3/8：組長初審與衝突協調期 (尚餘 ${daysLeft} 天)`,
      isOverdue: false,
      deadlineText: `${month}月19日 23:59 組長初審截止`,
      actionGuidance: '各站點組長請檢視同仁衝突透視鏡並提交初審意見。'
    };
  }

  if (day >= 20 && day <= 23) {
    const stage = TIMELINE_STAGES.find(s => s.id === 'MANAGER_FINAL_REVIEW');
    const daysLeft = 24 - day;
    return {
      currentStage: stage,
      stageIndex: 3,
      day: day,
      daysInMonth: daysInCurMonth,
      statusLabel: `階段 4/8：高管覆審與全場調度期 (距 24 日排定截止尚餘 ${daysLeft} 天)`,
      isOverdue: false,
      deadlineText: `⚠️ 必須於 ${month}月24日前 完成全場排定！`,
      actionGuidance: '營運長全面統籌 9 大門市排班，啟動演算法/AI調優並進行合規檢驗。'
    };
  }

  if (day === 24) {
    const stage = TIMELINE_STAGES.find(s => s.id === 'SCHEDULE_DEADLINE');
    return {
      currentStage: stage,
      stageIndex: 4,
      day: day,
      daysInMonth: daysInCurMonth,
      statusLabel: '⚠️ 階段 5/8：今日為全場排定完成截止日！',
      isOverdue: false,
      deadlineText: `今日 ${month}/24 23:59 班表鎖定發布截止`,
      actionGuidance: '高階主管請務必於今日完成下月排班矩陣發布與雙快照留存。'
    };
  }

  if (day === 25) {
    const stage = TIMELINE_STAGES.find(s => s.id === 'SCHEDULE_SIGNOFF');
    return {
      currentStage: stage,
      stageIndex: 5,
      day: day,
      daysInMonth: daysInCurMonth,
      statusLabel: '階段 6/8：今日為全員下月班表公告簽回日！',
      isOverdue: false,
      deadlineText: `今日 ${month}/25 23:59 全員簽回截止`,
      actionGuidance: '下月份正式班表已公告，請全體同仁於今日完成電子簽回。'
    };
  }

  // 4. 其他常態運作日常 (3~9日 或 26~月底前一天)：日常勤務與調班審核期
  return {
    currentStage: {
      id: 'DAILY_OPERATIONS',
      step: 0,
      title: '常態勤務與日常調班期',
      shortTitle: '平時 日常調班',
      periodText: '平時日常運作',
      responsibleRole: 'All',
      roleLabel: '全體同仁與主管',
      keyTasks: [
        '平時隨時可進行同仁對調 / 找人代班 / 個人自調挪休',
        '站點組長初審與營運高管終審 / Admin 行政合規備查',
        '門市主管出勤每日確實覆核與工時追蹤'
      ],
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
    },
    stageIndex: day < 10 ? -1 : 6,
    day: day,
    daysInMonth: daysInCurMonth,
    statusLabel: '平時常態運作：隨時可進行線上調班與出勤確實覆核',
    isOverdue: false,
    deadlineText: day < 10 ? `距 10 日主管下月排班設定尚餘 ${10 - day} 天` : `距月底出勤確認尚餘 ${daysInCurMonth - day} 天`,
    actionGuidance: '日常門市勤務穩定運作中，同仁如有需求可送出線上調班申請。'
  };
}

/**
 * 檢查在給定日期與角色下，某項排班操作是否處於合法開放時限
 * @param {string} action - 'SUBMIT_PREFERENCE' | 'LEADER_FIRST_REVIEW' | 'MANAGER_SCHEDULE_SETUP' | 'PUBLISH_SCHEDULE' | 'MONTH_END_CONFIRM'
 * @param {string} role - 'Manager' | 'Leader' | 'Staff' | 'PT'
 * @param {Date|string} dateInput - 當前日期
 * @returns {Object} { allowed: boolean, reason: string, isExceptionAllowed: boolean }
 */
export function checkActionTimelineEligibility(action, role, dateInput = new Date()) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  const day = d.getDate();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const daysInCurMonth = getDaysInMonth(year, month);
  const isManager = role === 'Manager';

  switch (action) {
    // 員工劃休：規範 12 日開始開放
    case 'SUBMIT_PREFERENCE':
      if (day < 12) {
        return {
          allowed: isManager, // 主管可特權測試
          reason: `劃休志願序將於每月 12 日正式開放預訂（目前為 ${month}/${day}，營運主管設定中）。`,
          isExceptionAllowed: isManager
        };
      }
      if (day > 17) {
        return {
          allowed: isManager,
          reason: `一般同仁劃休預訂已於 17 日截止（目前為 ${month}/${day}，已進入組長審查與協調階段）。`,
          isExceptionAllowed: isManager
        };
      }
      return { allowed: true, reason: '目前處於劃休志願預訂開放期 (12~17日)。' };

    // 組長初審：規範 18 日開始
    case 'LEADER_FIRST_REVIEW':
      if (day < 18) {
        return {
          allowed: isManager,
          reason: `組長初審與衝突協調期將於每月 18 日正式展開（目前同仁劃休登記中）。`,
          isExceptionAllowed: isManager
        };
      }
      return { allowed: true, reason: '組長初審作業開放中。' };

    // 主管設定與指定組長：規範 10 日開始
    case 'MANAGER_SCHEDULE_SETUP':
      if (day < 10) {
        return {
          allowed: isManager,
          reason: `下月份排班設定與當月組長指派依規於每月 10 日展開（目前距開放尚有 ${10 - day} 天）。`,
          isExceptionAllowed: isManager
        };
      }
      return { allowed: true, reason: '主管排班設定作業已開放。' };

    // 班表排定發布：規範 24 日前需排定完成
    case 'PUBLISH_SCHEDULE':
      return {
        allowed: true,
        reason: day <= 24 
          ? `合規時限內發布 (規範於 24 日前排定完成，目前為 ${month}/${day})。`
          : `⚠️ 注意：已超過每月 24 日排定完成之標準時限 (目前為 ${month}/${day})，請立即發布！`
      };

    // 月底實勤出勤確認：規範月底最後一天完成
    case 'MONTH_END_CONFIRM':
      if (day !== daysInCurMonth) {
        return {
          allowed: isManager,
          reason: `當月出勤確認與實勤覆核結算依規於月底最後一天 (${daysInCurMonth}日) 進行。`,
          isExceptionAllowed: isManager
        };
      }
      return { allowed: true, reason: '今日為月底出勤確認日，開放主管覆核。' };

    default:
      return { allowed: true, reason: '常態運作允許執行。' };
  }
}
