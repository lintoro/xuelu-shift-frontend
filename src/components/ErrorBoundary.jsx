import React from 'react';

/**
 * React Error Boundary：攔截所有子元件的渲染崩潰，
 * 避免白屏，改為呈現可讀的錯誤訊息供除錯。
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] 攔截到渲染崩潰:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #ef4444',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%'
          }}>
            <h1 style={{ color: '#ef4444', fontSize: '20px', margin: '0 0 12px 0' }}>
              ⚠️ 系統渲染異常 (Runtime Error)
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              系統偵測到畫面渲染過程中發生錯誤，已攔截避免白屏。以下為錯誤詳情：
            </p>
            <div style={{
              background: '#0f172a',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid #334155',
              marginBottom: '16px',
              fontSize: '12px',
              fontFamily: 'Consolas, Monaco, monospace',
              color: '#fbbf24',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {this.state.error && this.state.error.toString()}
              {'\n\n'}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>
            <button
              onClick={() => {
                // 清除 localStorage 可能的壞資料
                try {
                  localStorage.removeItem('xuelu_employees_v1');
                  localStorage.removeItem('xuelu_employees_v2');
                  localStorage.removeItem('xuelu_audit_logs_v1');
                  localStorage.removeItem('xuelu_holiday_consents_v1');
                  localStorage.removeItem('xuelu_shift_types_v1');
                } catch (e) {}
                window.location.reload();
              }}
              style={{
                display: 'block',
                width: '100%',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔄 清除快取並重新載入
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
