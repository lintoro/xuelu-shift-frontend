// src/utils/sessionUtils.js

const STORAGE_KEY_SESSION_USER = 'xuelu_session_user';
const STORAGE_KEY_REMEMBER_3DAYS = 'xuelu_remember_3days';
const STORAGE_KEY_EXPIRES_AT = 'xuelu_session_expires_at';

// 3 天毫秒數 (72 小時)
export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// 公用電腦閒置自動登出時間 (15 分鐘)
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * 儲存同仁登入 Session
 * @param {Object} user 登入同仁資料
 * @param {boolean} remember3Days 是否勾選「保持登入 3 天（個人裝置專用）」
 */
export function saveUserSession(user, remember3Days = false) {
  if (typeof window === 'undefined' || !user) return;

  const serialized = JSON.stringify(user);

  if (remember3Days) {
    // 個人裝置專用：保持 3 天免輸入 PIN 碼
    const expiresAt = Date.now() + THREE_DAYS_MS;
    try {
      localStorage.setItem(STORAGE_KEY_SESSION_USER, serialized);
      localStorage.setItem(STORAGE_KEY_REMEMBER_3DAYS, 'true');
      localStorage.setItem(STORAGE_KEY_EXPIRES_AT, String(expiresAt));
      // 同步清理 sessionStorage
      sessionStorage.removeItem(STORAGE_KEY_SESSION_USER);
    } catch (e) {
      console.warn('[Session] localStorage 寫入失敗:', e);
    }
  } else {
    // 預設公用電腦模式：存入 sessionStorage，關閉分頁即抹除，絕不留存 localStorage
    try {
      sessionStorage.setItem(STORAGE_KEY_SESSION_USER, serialized);
      // 徹底清空 localStorage 中的 Session 快取
      localStorage.removeItem(STORAGE_KEY_SESSION_USER);
      localStorage.removeItem(STORAGE_KEY_REMEMBER_3DAYS);
      localStorage.removeItem(STORAGE_KEY_EXPIRES_AT);
    } catch (e) {
      console.warn('[Session] sessionStorage 寫入失敗:', e);
    }
  }
}

/**
 * 載入有效的使用者 Session (防越權與過期安全驗證)
 * @returns {Object|null}
 */
export function loadValidUserSession() {
  if (typeof window === 'undefined') return null;

  // 1. 優先檢查公用電腦模式的當前分頁 (sessionStorage)
  try {
    const sessionStr = sessionStorage.getItem(STORAGE_KEY_SESSION_USER);
    if (sessionStr) {
      return JSON.parse(sessionStr);
    }
  } catch (e) {
    console.warn('[Session] sessionStorage 讀取異常:', e);
  }

  // 2. 檢查個人裝置 3 天保持模式 (localStorage)
  try {
    const isRemembered = localStorage.getItem(STORAGE_KEY_REMEMBER_3DAYS) === 'true';
    const expiresAtStr = localStorage.getItem(STORAGE_KEY_EXPIRES_AT);
    const localUserStr = localStorage.getItem(STORAGE_KEY_SESSION_USER);

    if (isRemembered && expiresAtStr && localUserStr) {
      const expiresAt = Number(expiresAtStr);
      if (!isNaN(expiresAt) && Date.now() < expiresAt) {
        // 尚未超過 3 天效期，安全放行
        return JSON.parse(localUserStr);
      } else {
        // 已超過 3 天效期，自動安全清理
        console.info('[Session] 個人 3 天登入已過期，自動安全登出');
        clearUserSession();
        return null;
      }
    }
  } catch (e) {
    console.warn('[Session] localStorage 讀取異常:', e);
  }

  return null;
}

/**
 * 安全清除使用者登入 Session
 */
export function clearUserSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY_SESSION_USER);
    localStorage.removeItem(STORAGE_KEY_SESSION_USER);
    localStorage.removeItem(STORAGE_KEY_REMEMBER_3DAYS);
    localStorage.removeItem(STORAGE_KEY_EXPIRES_AT);
  } catch (e) {
    console.warn('[Session] 清理 Session 異常:', e);
  }
}

/**
 * 檢查當前是否處於 3 天保持模式
 */
export function isRemember3DaysActive() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY_REMEMBER_3DAYS) === 'true';
  } catch {
    return false;
  }
}
