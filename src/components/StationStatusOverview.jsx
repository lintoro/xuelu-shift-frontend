import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Users, UserCheck } from 'lucide-react';

export default function StationStatusOverview({ stations, validation, selectedDay = 1 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-bold text-slate-800">9 大營業站點即時人力檢驗（第 {selectedDay} 天現況）</h2>
          <span className="text-xs text-slate-500">三級燈號：🟢 正常 · 🟡 機動支援 · 🔴 嚴重空窗</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {stations.map(station => {
          const status = validation?.stationDailyStatus?.[station.station_id]?.[selectedDay] || {
            level: 'GREEN',
            count: 0,
            minRequired: station.min_staff_weekday,
            hasSolo: true
          };

          const isGreen = status.level === 'GREEN';
          const isYellow = status.level === 'YELLOW';
          const isRed = status.level === 'RED';

          return (
            <div
              key={station.station_id}
              className={`rounded-lg border p-3 transition-all ${
                isGreen
                  ? 'bg-slate-50/70 border-slate-200 text-slate-800'
                  : isYellow
                  ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold truncate">{station.station_name}</span>
                {isGreen && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {isYellow && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                {isRed && <XCircle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />}
              </div>

              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center space-x-1 text-slate-600">
                  <Users className="w-3.5 h-3.5" />
                  <span>在勤 / 門檻:</span>
                </div>
                <span className="font-bold">
                  {status.count} / {status.minRequired} 人
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 text-slate-600">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>獨立顧站:</span>
                </div>
                <span className={`text-[11px] font-semibold ${status.hasSolo ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {station.requires_solo_staff ? (status.hasSolo ? '已具備' : '缺少') : '不強制'}
                </span>
              </div>

              {isYellow && status.supportOptions?.length > 0 && (
                <div className="mt-2 text-[10px] bg-amber-100/70 p-1.5 rounded border border-amber-200 text-amber-800">
                  支援人選: {status.supportOptions.slice(0, 2).join('、')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
