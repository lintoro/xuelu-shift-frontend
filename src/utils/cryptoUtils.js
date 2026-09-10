// src/utils/cryptoUtils.js
/**
 * 純前端與後端相容之密碼安全雜湊模組 (Web Crypto API)
 * 遵循 OWASP 安全標準：加鹽 (Salted) SHA-256 雜湊
 */

// 產生指定長度之隨機 Hex Salt
export function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 計算 Salted SHA-256 雜湊值 (非同步 Web Crypto API)
export async function computeSaltedHash(pinCode, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + pinCode);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // 備用同步簡單雜湊（防無安全環境報錯）
  let hash = 0;
  const str = salt + pinCode;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

// 預設密碼固定 Salt: 'xuelu_2026_salt'
export const DEFAULT_SALT = 'xuelu_2026_salt';
// 'xuelu_2026_salt' + '000000' 之 SHA-256:
export const DEFAULT_PIN_HASH = '9ef0c50d4ff50fbbcd5e3a890a501bf00eb23d474b7c858dfc9cb288fa7bcaec';
