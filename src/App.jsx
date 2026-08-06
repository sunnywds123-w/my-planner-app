import React, { useState, useEffect, useMemo } from 'react';
import { Pill, Sparkles, FileText, Plus, X, Trash2, Pencil, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Check, Copy, Settings, GripVertical, Calendar, Clock, BarChart3, Heart, Download, Upload, Database, Eraser, Star } from 'lucide-react';
import { DndContext, closestCenter, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// localStorage shim（取代 Claude artifact 嘅 window.storage）
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      const v = localStorage.getItem(key);
      return v === null ? null : { value: v };
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
      return { value };
    },
    delete: async (key) => {
      localStorage.removeItem(key);
      return { deleted: true };
    },
    list: async (prefix) => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }
      return { keys };
    },
  };
}



const DEFAULT_ACTIVITIES = [
  { id: 'work', label: '工作', emoji: '💼', color: '#3b82f6', important: false },
  { id: 'play', label: '玩樂', emoji: '🎮', color: '#ec4899', important: false },
  { id: 'rest', label: '休息', emoji: '☕', color: '#a855f7', important: false },
  { id: 'teach', label: '教學', emoji: '🎓', color: '#f59e0b', important: false },
  { id: 'study', label: '學習', emoji: '📚', color: '#10b981', important: false },
  { id: 'meal', label: '食飯', emoji: '🍽️', color: '#ef4444', important: false },
  { id: 'training', label: '訓練', emoji: '🏋️', color: '#0891b2', important: false },
];

const COLOR_PALETTE = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#0891b2', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#78716c', '#1c1917'];
const ACTIVITY_EMOJIS = ['✨', '🎯', '💼', '🎮', '☕', '🎓', '📚', '🍽️', '🏋️', '💪', '🧘', '🛒', '🚗', '🏠', '💤', '📞', '✈️', '🎬', '🍳', '🐶', '🎵', '📝', '🌱', '⚽', '🎸', '🛏️', '🌅', '🧴'];
const SLOT_EMOJIS = ['🌅', '☀️', '🌤️', '🌆', '🌙', '⭐', '💪', '🏃', '🧘', '🍽️', '☕', '🥤', '💊', '⏰'];

// 新增活動類別嘅「快速加入」預設（配合 self-improvement daily building blocks）
const PRESET_ACTIVITIES = [
  { label: '起身', emoji: '🌅', color: '#f59e0b' },
  { label: '保養', emoji: '🧴', color: '#ec4899' },
  { label: '學習', emoji: '📚', color: '#10b981' },
  { label: '食飯', emoji: '🍽️', color: '#ef4444' },
  { label: '訓練', emoji: '🏋️', color: '#0891b2' },
  { label: '工作', emoji: '💼', color: '#3b82f6' },
  { label: '瞓覺', emoji: '🛏️', color: '#6366f1' },
  { label: '反思', emoji: '📝', color: '#84cc16' },
];

const DEFAULT_SUPPLEMENT_SLOTS = [
  { id: 'breakfast', label: '早餐後', emoji: '🌅', time: '08:00', items: [{ id: 'vitc', name: '維他命 C' }, { id: 'fishoil', name: '魚油' }] },
  { id: 'pre-workout', label: '訓練前', emoji: '💪', time: '16:00', items: [{ id: 'creatine', name: '肌酸' }] },
  { id: 'bedtime', label: '睡前', emoji: '🌙', time: '23:00', items: [{ id: 'mag', name: '鎂' }] },
];

// 護膚時間預設
const DEFAULT_SKINCARE_TIMES = { am: '07:00', pm: '22:00' };

const DEFAULT_SKINCARE = {
  am: [{ id: 'am-1', name: '潔面' }, { id: 'am-2', name: '化妝水' }, { id: 'am-3', name: '精華' }, { id: 'am-4', name: '保濕' }, { id: 'am-5', name: '防曬' }],
  pm: [{ id: 'pm-1', name: '卸妝' }, { id: 'pm-2', name: '潔面' }, { id: 'pm-3', name: '化妝水' }, { id: 'pm-4', name: '精華' }, { id: 'pm-5', name: '面霜' }],
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = [
  { id: 0, label: '一', full: '星期一' },
  { id: 1, label: '二', full: '星期二' },
  { id: 2, label: '三', full: '星期三' },
  { id: 3, label: '四', full: '星期四' },
  { id: 4, label: '五', full: '星期五' },
  { id: 5, label: '六', full: '星期六' },
  { id: 6, label: '日', full: '星期日' },
];

const ACTIVITIES_KEY = 'activities-v5';
const TEMPLATE_KEY = 'plan-template-v1'; // 週 template: { "0-9": "work", ... }
const SLOTS_KEY = 'supp-slots-v1';
const SKINCARE_KEY = 'skincare-v1';
const SKINCARE_TIMES_KEY = 'skincare-times-v1';
const HEALTH_RECORD_PREFIX = 'health:'; // health:YYYY-MM-DD = { supps:{}, skincare:{}, windDown:{}, steps:boolean }
const SETTINGS_KEY = 'settings-v1'; // { morningStart, morningEnd, windDownStart, sleepTarget, waterGoal, proteinGoal } — 新 key，冇舊資料需要 migrate
const WATER_PREFIX = 'water:'; // water:YYYY-MM-DD = { total: number, log: [{time, ml}] } — 新 key，冇舊資料需要 migrate
const PROTEIN_PREFIX = 'protein:'; // protein:YYYY-MM-DD = { total: number, log: [{time, g}] } — 新 key，冇舊資料需要 migrate

const RECORD_KEY_RE = /^(health|water):(\d{4}-\d{2}-\d{2})$/;

// 掃描所有 health:/water: 記錄 key，揀返日期範圍內、指定類型嘅
async function scanDateRecords(startStr, endStr, types) {
  const listResult = await window.storage.list();
  const keys = listResult?.keys || [];
  const matched = { health: [], water: [] };
  keys.forEach(key => {
    const m = key.match(RECORD_KEY_RE);
    if (!m) return;
    const [, type, dateStr] = m;
    if (!types[type]) return;
    if (dateStr >= startStr && dateStr <= endStr) matched[type].push(key);
  });
  return matched;
}

const DEFAULT_SETTINGS = {
  morningStart: '07:00',
  morningEnd: '09:00',
  windDownStart: '23:00',
  sleepTarget: '00:00',
  waterGoal: 2000,
  proteinGoal: 150,
};

const STEPS_GOAL = 10000;

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDateZh = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
const fmtWeekday = (d) => ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
const isSameDate = (a, b) => fmtDate(a) === fmtDate(b);
const formatHour = (h) => `${h.toString().padStart(2, '0')}:00`;
// 將 JS day (0=Sun) 轉做我哋嘅 (0=Mon, 6=Sun)
const jsDayToMonIdx = (d) => d === 0 ? 6 : d - 1;

// ============ 純 function：NowCard 同 window.getWidgetSummary 共用 ============

// 由 template 讀返「而家」同「下一個」轉時段嘅活動
function findCurrentAndNextActivity(activities, template, todayIdx, currentHour) {
  const currentActId = template[`${todayIdx}-${currentHour}`];
  const currentAct = currentActId ? activities.find(a => a.id === currentActId) : null;
  let nextHour = null;
  let nextAct = null;
  for (let h = currentHour + 1; h < 24; h++) {
    const actId = template[`${todayIdx}-${h}`];
    if (actId && actId !== currentActId) {
      nextHour = h;
      nextAct = activities.find(a => a.id === actId);
      break;
    }
  }
  return { currentAct, nextHour, nextAct };
}

// 邊個 supplement 時段最接近而家（兩個鐘內）—— 跟 SupplementsSection 個 nowSlotId 一樣嘅邏輯
function nearestSupplementSlot(slots, now) {
  if (!slots || slots.length === 0) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let nearest = null, nearestDiff = Infinity;
  slots.forEach(s => {
    const [h, m] = (s.time || '08:00').split(':').map(Number);
    const diff = Math.abs(h * 60 + m - nowMin);
    if (diff < nearestDiff) { nearestDiff = diff; nearest = s; }
  });
  return nearestDiff <= 120 ? nearest : null;
}

// 而家係 am 定 pm 護膚時段（兩個鐘內）—— 跟 SkincareSection 個 nowPeriod 一樣嘅邏輯
function nearestSkincarePeriod(skincareTimes, now) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [ah, am] = (skincareTimes.am || '07:00').split(':').map(Number);
  const [ph, pm] = (skincareTimes.pm || '22:00').split(':').map(Number);
  const amDiff = Math.abs(ah * 60 + am - nowMin);
  const pmDiff = Math.abs(ph * 60 + pm - nowMin);
  if (Math.min(amDiff, pmDiff) > 120) return null;
  return amDiff < pmDiff ? 'am' : 'pm';
}

export default function App() {
  const [tab, setTab] = useState('focus');
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [template, setTemplate] = useState({}); // 週 template
  const [slots, setSlots] = useState(DEFAULT_SUPPLEMENT_SLOTS);
  const [skincare, setSkincare] = useState(DEFAULT_SKINCARE);
  const [skincareTimes, setSkincareTimes] = useState(DEFAULT_SKINCARE_TIMES);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, t, s, k, st, se] = await Promise.all([
          window.storage.get(ACTIVITIES_KEY).catch(() => null),
          window.storage.get(TEMPLATE_KEY).catch(() => null),
          window.storage.get(SLOTS_KEY).catch(() => null),
          window.storage.get(SKINCARE_KEY).catch(() => null),
          window.storage.get(SKINCARE_TIMES_KEY).catch(() => null),
          window.storage.get(SETTINGS_KEY).catch(() => null),
        ]);
        if (a?.value) {
          // Migration：舊資料冇 important 欄位，fallback 做 false，唔會令類別消失或者出錯
          const parsedActs = JSON.parse(a.value);
          setActivities(parsedActs.map(act => ({ ...act, important: !!act.important })));
        }
        if (t?.value) setTemplate(JSON.parse(t.value));
        if (s?.value) {
          const parsed = JSON.parse(s.value);
          // Migration：舊資料冇 time field，加返 default
          const migrated = parsed.map(sl => ({ ...sl, time: sl.time || '08:00' }));
          setSlots(migrated);
        }
        if (k?.value) setSkincare(JSON.parse(k.value));
        if (st?.value) setSkincareTimes(JSON.parse(st.value));
        // settings-v1 係全新 key，讀唔到就用 default，唔係 error（Rule 5）
        if (se?.value) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(se.value) });
      } finally { setLoading(false); }
    })();
  }, []);

  // 俾外部（例如 iOS Scriptable widget 用 hidden WebView）讀「今日焦點」摘要。
  // 純粹包裝現有計算結果（唔重複寫邏輯、唔改任何 UI），任何一欄攞唔到都用
  // null / 空 array 頂住，唔會令成個 function throw error。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.getWidgetSummary = () => {
      const now = new Date();
      const fallback = {
        date: fmtDate(now),
        currentActivity: null,
        nextActivity: null,
        water: { current: 0, goal: settings.waterGoal ?? DEFAULT_SETTINGS.waterGoal },
        activeBadges: [],
        isWindDown: false,
        windDownStart: settings.windDownStart ?? DEFAULT_SETTINGS.windDownStart,
      };
      try {
        const todayIdx = jsDayToMonIdx(now.getDay());

        let currentActivity = null;
        let nextActivity = null;
        try {
          const { currentAct, nextHour, nextAct } = findCurrentAndNextActivity(activities, template, todayIdx, now.getHours());
          if (currentAct) {
            currentActivity = { label: currentAct.label, emoji: currentAct.emoji, timeRange: `${formatHour(now.getHours())}-${formatHour(now.getHours() + 1)}` };
          }
          if (nextAct && nextHour !== null) {
            nextActivity = { label: nextAct.label, emoji: nextAct.emoji, startTime: formatHour(nextHour) };
          }
        } catch (e) { console.error('getWidgetSummary：活動計算失敗', e); }

        let water = fallback.water;
        try {
          const raw = localStorage.getItem(WATER_PREFIX + fmtDate(now));
          const parsed = raw ? JSON.parse(raw) : null;
          water = { current: parsed?.total || 0, goal: settings.waterGoal ?? DEFAULT_SETTINGS.waterGoal };
        } catch (e) { console.error('getWidgetSummary：飲水計算失敗', e); }

        const activeBadges = [];
        try {
          const slot = nearestSupplementSlot(slots, now);
          if (slot) activeBadges.push({ type: 'supplement', label: slot.label, emoji: slot.emoji });
        } catch (e) { console.error('getWidgetSummary：supplement badge 失敗', e); }
        try {
          const period = nearestSkincarePeriod(skincareTimes, now);
          if (period) activeBadges.push({ type: 'skincare', label: period === 'am' ? '早晨護膚' : '晚間護膚', emoji: period === 'am' ? '☀️' : '🌙' });
        } catch (e) { console.error('getWidgetSummary：skincare badge 失敗', e); }

        let isWindDown = false;
        try { isWindDown = getFocusMode(now, settings) === 'winddown'; } catch (e) { console.error('getWidgetSummary：wind-down 判斷失敗', e); }

        return {
          date: fmtDate(now),
          currentActivity,
          nextActivity,
          water,
          activeBadges,
          isWindDown,
          windDownStart: settings.windDownStart ?? DEFAULT_SETTINGS.windDownStart,
        };
      } catch (e) {
        console.error('getWidgetSummary 失敗', e);
        return fallback;
      }
    };
  }, [activities, template, slots, skincare, skincareTimes, settings]);

  const flashSaved = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1000); };
  const saveActivities = async (n) => { setActivities(n); try { await window.storage.set(ACTIVITIES_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };
  const saveTemplate = async (n) => { setTemplate(n); try { await window.storage.set(TEMPLATE_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };
  const saveSlots = async (n) => { setSlots(n); try { await window.storage.set(SLOTS_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };
  const saveSkincare = async (n) => { setSkincare(n); try { await window.storage.set(SKINCARE_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };
  const saveSkincareTimes = async (n) => { setSkincareTimes(n); try { await window.storage.set(SKINCARE_TIMES_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };
  const saveSettings = async (n) => { setSettings(n); try { await window.storage.set(SETTINGS_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-500" style={{fontFamily:'Georgia, serif'}}>載入緊...</p></div>;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)', fontFamily: '"Helvetica Neue", -apple-system, sans-serif' }}>
      <header className="px-5 pt-7 pb-3 sticky top-0 z-30" style={{ background: 'rgba(250, 250, 249, 0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-stone-500 uppercase mb-0.5">My Planner</p>
            <h1 className="text-2xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 400, letterSpacing: '-0.02em' }}>每週計劃</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95" title="設定">
              <Settings size={15} className="text-stone-600" />
            </button>
            <button onClick={() => setShowBackup(true)} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95" title="備份與還原">
              <Database size={15} className="text-stone-600" />
            </button>
          </div>
        </div>

        {/* 4 個 Tab */}
        <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full">
          {[
            { id: 'focus', label: '今日焦點', icon: Star },
            { id: 'plan', label: '計劃', icon: Clock },
            { id: 'health', label: '健康', icon: Heart },
            { id: 'report', label: '統計報告', icon: FileText },
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: active ? 'white' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1c1917' : '#78716c',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 pt-3">
        {tab === 'focus' && <FocusTab activities={activities} template={template} slots={slots} skincare={skincare} settings={settings} />}
        {tab === 'plan' && <PlanTab activities={activities} template={template} onSaveTemplate={saveTemplate} onSaveActivities={saveActivities} />}
        {tab === 'health' && <HealthTab slots={slots} skincare={skincare} skincareTimes={skincareTimes} onSaveSlots={saveSlots} onSaveSkincare={saveSkincare} onSaveSkincareTimes={saveSkincareTimes} />}
        {tab === 'report' && <ReportTab activities={activities} template={template} slots={slots} skincare={skincare} />}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 px-4 pb-5 pt-3 z-20 pointer-events-none" style={{ background: 'linear-gradient(0deg, rgba(250,250,249,1) 60%, rgba(250,250,249,0))' }}>
        <div className="flex items-center justify-center text-xs text-stone-500">
          {savedFlash ? <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-600" /><span className="text-emerald-700">已儲存</span></span> : <span style={{ fontFamily: 'Georgia, serif' }} className="italic">自動儲存</span>}
        </div>
      </footer>

      {showBackup && (
        <BackupModal
          data={{ activities, template, slots, skincare, skincareTimes }}
          onImport={async ({ activities: a, template: t, slots: s, skincare: k, skincareTimes: kt }) => {
            if (a) await saveActivities(a);
            if (t) await saveTemplate(t);
            if (s) await saveSlots(s);
            if (k) await saveSkincare(k);
            if (kt) await saveSkincareTimes(kt);
          }}
          onPreviewClearRecords={async (startDate, endDate, types) => {
            const matched = await scanDateRecords(fmtDate(startDate), fmtDate(endDate), types);
            return { health: matched.health.length, water: matched.water.length };
          }}
          onClearRecords={async (startDate, endDate, types) => {
            // 掃範圍內、選中類型嘅 record key 逐個刪除
            const result = { health: 0, water: 0 };
            try {
              const matched = await scanDateRecords(fmtDate(startDate), fmtDate(endDate), types);
              for (const key of matched.health) { await window.storage.delete(key); result.health++; }
              for (const key of matched.water) { await window.storage.delete(key); result.water++; }
            } catch (e) {
              console.error('清除記錄失敗', e);
              throw e;
            }
            flashSaved();
            return result;
          }}
          onClose={() => setShowBackup(false)}
        />
      )}

      {showSettings && (
        <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

// ============ Focus Tab（今日焦點 —— 3 個時間感知 mode）============

function timeToMinutes(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
}

/**
 * 邊個 mode 生效，淨係靠時間，用戶唔可以手動 override（KISS，跟返
 * 用戶決定）。順序好緊要：先判斷 morning（有明確頭尾嘅一段），再判斷
 * wind-down（會跨午夜，所以用「>= windDownStart 或者 < morningStart」
 * 嚟 wrap），淨低嘅就係 dynamic —— 3 個分支冚晒 24 小時，冇縫冇重疊。
 */
function getFocusMode(now, settings) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const mStart = timeToMinutes(settings.morningStart);
  const mEnd = timeToMinutes(settings.morningEnd);
  const wStart = timeToMinutes(settings.windDownStart);
  if (nowMin >= mStart && nowMin < mEnd) return 'morning';
  if (nowMin >= wStart || nowMin < mStart) return 'winddown';
  return 'dynamic';
}

// 距離目標時鐘時間仲有幾多分鐘 —— 揀「而家之後最近一次出現嗰個時間點」，
// 過咗今日嗰個就自動 roll 去聽日（處理 sleepTarget=00:00 呢類跨午夜情況）
function minutesUntil(now, targetHHMM) {
  const [h, m] = (targetHHMM || '00:00').split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return Math.round((target - now) / 60000);
}

function FocusTab({ activities, template, slots, skincare, settings }) {
  const [now, setNow] = useState(new Date());
  const [record, setRecord] = useState({ supps: {}, skincare: {}, windDown: {}, steps: false });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // `now` 已經每分鐘 tick 一次（俾 mode 判斷用），將 dateStr 攞出嚟做 effect
  // dependency，就可以「借」呢個 ticker 嚟做同 WaterTracker 一樣嘅 self-correcting
  // 換日邏輯，唔使開多一個 timer；dateStr 淨係踏入第二日先會變，唔會每分鐘重讀。
  const dateStr = fmtDate(now);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(HEALTH_RECORD_PREFIX + dateStr).catch(() => null);
        if (r?.value) {
          const p = JSON.parse(r.value);
          setRecord({ supps: p.supps || {}, skincare: p.skincare || {}, windDown: p.windDown || {}, steps: !!p.steps });
        } else {
          setRecord({ supps: {}, skincare: {}, windDown: {}, steps: false });
        }
      } catch {}
    })();
  }, [dateStr]);

  const saveRecord = async (n) => {
    setRecord(n);
    try { await window.storage.set(HEALTH_RECORD_PREFIX + dateStr, JSON.stringify(n)); } catch (e) {}
  };
  const toggleSupp = (sId, iId) => { const k = `${sId}:${iId}`; saveRecord({ ...record, supps: { ...record.supps, [k]: !record.supps[k] } }); };
  const toggleSkin = (p, id) => { const k = `${p}:${id}`; saveRecord({ ...record, skincare: { ...record.skincare, [k]: !record.skincare[k] } }); };
  const toggleWindDown = (id) => { saveRecord({ ...record, windDown: { ...record.windDown, [id]: !record.windDown[id] } }); };
  const toggleSteps = () => { saveRecord({ ...record, steps: !record.steps }); };

  const mode = getFocusMode(now, settings);
  const todayIdx = jsDayToMonIdx(now.getDay());

  return (
    <div>
      {mode === 'morning' && (
        <MorningMode skincare={skincare} slots={slots} record={record} onToggleSkin={toggleSkin} onToggleSupp={toggleSupp} waterGoal={settings.waterGoal} proteinGoal={settings.proteinGoal} stepsChecked={record.steps} onToggleSteps={toggleSteps} />
      )}
      {mode === 'dynamic' && (
        <DynamicMode activities={activities} template={template} todayIdx={todayIdx} slots={slots} record={record} onToggleSupp={toggleSupp} waterGoal={settings.waterGoal} proteinGoal={settings.proteinGoal} stepsChecked={record.steps} onToggleSteps={toggleSteps} />
      )}
      {mode === 'winddown' && (
        <WindDownMode skincare={skincare} record={record} onToggleSkin={toggleSkin} onToggleWindDown={toggleWindDown} settings={settings} now={now} waterGoal={settings.waterGoal} proteinGoal={settings.proteinGoal} stepsChecked={record.steps} onToggleSteps={toggleSteps} />
      )}
    </div>
  );
}

function FocusSectionHeader({ emoji, title, count }) {
  return (
    <div className="flex items-baseline gap-2 mb-2 px-1">
      <span className="text-lg">{emoji}</span>
      <h3 className="text-base text-stone-900" style={{ fontWeight: 600 }}>{title}</h3>
      {count && <span className="text-[11px] text-stone-400 ml-auto">{count}</span>}
    </div>
  );
}

function MorningMode({ skincare, slots, record, onToggleSkin, onToggleSupp, waterGoal, proteinGoal, stepsChecked, onToggleSteps }) {
  const amSteps = skincare.am;
  const amChecked = amSteps.filter(s => record.skincare[`am:${s.id}`]).length;
  const breakfastSlot = slots.find(s => s.label === '早餐後');
  const breakfastChecked = breakfastSlot ? breakfastSlot.items.filter(i => record.supps[`${breakfastSlot.id}:${i.id}`]).length : 0;

  return (
    <div>
      <p className="text-[10px] tracking-[0.3em] text-stone-500 uppercase mb-3">🌅 早晨</p>

      <div className="mb-5">
        <FocusSectionHeader emoji="☀️" title="早晨護膚" count={`${amChecked}/${amSteps.length}`} />
        {amSteps.length === 0 ? (
          <EmptyState icon={Sparkles} title="未設定護膚步驟" desc="去健康 tab 加返" />
        ) : amSteps.map((step, idx) => (
          <ChecklistItem key={step.id} label={step.name} checked={!!record.skincare[`am:${step.id}`]} index={idx + 1} tint="blue" onClick={() => onToggleSkin('am', step.id)} />
        ))}
      </div>

      <div className="mb-5">
        <FocusSectionHeader emoji="💊" title="早餐後" count={breakfastSlot ? `${breakfastChecked}/${breakfastSlot.items.length}` : null} />
        {!breakfastSlot || breakfastSlot.items.length === 0 ? (
          <EmptyState icon={Pill} title='未設定「早餐後」時段' desc="去健康 tab 加返" />
        ) : breakfastSlot.items.map(item => (
          <ChecklistItem key={item.id} label={item.name} checked={!!record.supps[`${breakfastSlot.id}:${item.id}`]} tint="emerald" onClick={() => onToggleSupp(breakfastSlot.id, item.id)} />
        ))}
      </div>

      <WaterTracker goal={waterGoal} readOnly={false} />
      <ProteinTracker goal={proteinGoal} readOnly={false} />
      <StepsTracker checked={stepsChecked} onToggle={onToggleSteps} readOnly={false} />
    </div>
  );
}

function DynamicMode({ activities, template, todayIdx, slots, record, onToggleSupp, waterGoal, proteinGoal, stepsChecked, onToggleSteps }) {
  // 邊個 supp slot 最接近而家（同 SupplementsSection 個 nowSlotId 邏輯一樣，
  // 兩個鐘內先算 —— 唔喺範圍內就乜都唔顯示，唔會逼出一個唔相關嘅 list）
  const nowSlot = useMemo(() => {
    if (slots.length === 0) return null;
    const n = new Date();
    const nowMin = n.getHours() * 60 + n.getMinutes();
    let nearest = null, nearestDiff = Infinity;
    slots.forEach(s => {
      const [h, m] = (s.time || '08:00').split(':').map(Number);
      const diff = Math.abs(h * 60 + m - nowMin);
      if (diff < nearestDiff) { nearestDiff = diff; nearest = s; }
    });
    return nearestDiff <= 120 ? nearest : null;
  }, [slots]);

  return (
    <div>
      <NowCard activities={activities} template={template} todayIdx={todayIdx} />

      {nowSlot && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2 px-1">
            <span className="text-lg">{nowSlot.emoji}</span>
            <h3 className="text-base text-stone-900" style={{ fontWeight: 600 }}>{nowSlot.label}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" style={{ fontWeight: 600 }}>Now</span>
            <span className="text-[11px] text-stone-400 ml-auto">{nowSlot.items.filter(i => record.supps[`${nowSlot.id}:${i.id}`]).length}/{nowSlot.items.length}</span>
          </div>
          {nowSlot.items.length === 0 ? (
            <p className="text-xs text-stone-400 italic px-1" style={{ fontFamily: 'Georgia, serif' }}>未有項目</p>
          ) : nowSlot.items.map(item => (
            <ChecklistItem key={item.id} label={item.name} checked={!!record.supps[`${nowSlot.id}:${item.id}`]} isNow tint="emerald" onClick={() => onToggleSupp(nowSlot.id, item.id)} />
          ))}
        </div>
      )}

      <WaterTracker goal={waterGoal} readOnly={false} />
      <ProteinTracker goal={proteinGoal} readOnly={false} />
      <StepsTracker checked={stepsChecked} onToggle={onToggleSteps} readOnly={false} />
    </div>
  );
}

function WindDownMode({ skincare, record, onToggleSkin, onToggleWindDown, settings, now, waterGoal, proteinGoal, stepsChecked, onToggleSteps }) {
  const minsLeft = minutesUntil(now, settings.sleepTarget);
  const pmSteps = skincare.pm;
  const pmChecked = pmSteps.filter(s => record.skincare[`pm:${s.id}`]).length;

  return (
    <div>
      <div className="rounded-2xl mb-5 p-5 border bg-white border-stone-200 text-center">
        <p className="text-[10px] tracking-[0.3em] text-stone-500 uppercase mb-1">距離熄燈</p>
        <p className="text-stone-900 tabular-nums" style={{ fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif', fontSize: '48px', fontWeight: 300, letterSpacing: '-0.02em' }}>
          {minsLeft}
        </p>
        <p className="text-xs text-stone-500">分鐘</p>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-2 mb-2 px-1">
          <span className="text-lg">🧴</span>
          <h3 className="text-base text-stone-900" style={{ fontWeight: 600 }}>護膚</h3>
          <span className="text-[10px] text-stone-400">建議 10 分鐘</span>
          <span className="text-[11px] text-stone-400 ml-auto">{pmChecked}/{pmSteps.length}</span>
        </div>
        {pmSteps.length === 0 ? (
          <EmptyState icon={Sparkles} title="未設定護膚步驟" desc="去健康 tab 加返" />
        ) : pmSteps.map((step, idx) => (
          <ChecklistItem key={step.id} label={step.name} checked={!!record.skincare[`pm:${step.id}`]} index={idx + 1} tint="blue" onClick={() => onToggleSkin('pm', step.id)} />
        ))}
      </div>

      <div className="mb-5">
        <ChecklistItem label="📖 睇實體書（15 分鐘）" checked={!!record.windDown?.book} tint="emerald" onClick={() => onToggleWindDown('book')} />
        <ChecklistItem label="🧘 冥想（5 分鐘）" checked={!!record.windDown?.meditation} tint="emerald" onClick={() => onToggleWindDown('meditation')} />
      </div>

      <WaterTracker goal={waterGoal} readOnly={true} />
      <ProteinTracker goal={proteinGoal} readOnly={true} />
      <StepsTracker checked={stepsChecked} onToggle={onToggleSteps} readOnly={true} />
    </div>
  );
}

// ============ Plan Tab（週 template） ============

function PlanTab({ activities, template, onSaveTemplate, onSaveActivities }) {
  const [view, setView] = useState('day');
  const [currentDay, setCurrentDay] = useState(jsDayToMonIdx(new Date().getDay()));
  const [openPicker, setOpenPicker] = useState(null);
  const [managing, setManaging] = useState(false);

  const cellKey = (day, hour) => `${day}-${hour}`;
  const getActivity = (id) => activities.find(a => a.id === id);

  const handleSelect = (day, hour, actId) => {
    onSaveTemplate({ ...template, [cellKey(day, hour)]: actId });
    setOpenPicker(null);
  };
  const handleClear = (day, hour) => {
    const next = { ...template };
    delete next[cellKey(day, hour)];
    onSaveTemplate(next);
    setOpenPicker(null);
  };
  const handleClearDay = (day) => {
    if (!confirm(`清空${DAYS[day].full}所有時段？`)) return;
    const next = {};
    Object.keys(template).forEach(k => {
      if (!k.startsWith(`${day}-`)) next[k] = template[k];
    });
    onSaveTemplate(next);
  };

  const dayFilledCount = HOURS.filter(h => template[cellKey(currentDay, h)]).length;

  // 判斷「而家」係咪 focus 緊今日 view，用於決定要唔要顯示 Now Card
  const todayIdx = jsDayToMonIdx(new Date().getDay());
  const isViewingToday = view === 'day' && currentDay === todayIdx;

  return (
    <div>
      {/* Now Card - 只喺睇「今日」view 顯示 */}
      {isViewingToday && (
        <NowCard activities={activities} template={template} todayIdx={todayIdx} />
      )}

      {/* View switcher */}
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-3">
        <button onClick={() => setView('day')} className="flex-1 py-2 rounded-full text-sm transition-all" style={{ background: view === 'day' ? 'white' : 'transparent', fontWeight: view === 'day' ? 600 : 400, color: view === 'day' ? '#1c1917' : '#78716c', boxShadow: view === 'day' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>日視圖</button>
        <button onClick={() => setView('week')} className="flex-1 py-2 rounded-full text-sm transition-all" style={{ background: view === 'week' ? 'white' : 'transparent', fontWeight: view === 'week' ? 600 : 400, color: view === 'week' ? '#1c1917' : '#78716c', boxShadow: view === 'week' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>週視圖</button>
      </div>

      {view === 'day' && (
        <>
          {/* Day picker */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <button onClick={() => setCurrentDay((currentDay + 6) % 7)} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95">
              <ChevronLeft size={15} className="text-stone-700" />
            </button>
            <div className="flex-1 flex gap-1 justify-center">
              {DAYS.map(d => (
                <button key={d.id} onClick={() => setCurrentDay(d.id)} className="w-9 h-9 rounded-full text-sm transition-all flex items-center justify-center" style={{ background: currentDay === d.id ? '#1c1917' : 'transparent', color: currentDay === d.id ? 'white' : '#78716c', fontWeight: currentDay === d.id ? 600 : 400 }}>
                  {d.label}
                </button>
              ))}
            </div>
            <button onClick={() => setCurrentDay((currentDay + 1) % 7)} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95">
              <ChevronRight size={15} className="text-stone-700" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>{DAYS[currentDay].full}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-stone-500" style={{ fontFamily: 'Georgia, serif' }}>
                <span className="text-base text-stone-900" style={{ fontWeight: 500 }}>{dayFilledCount}</span><span className="mx-1">/</span>24
              </p>
              <button onClick={() => setManaging(true)} className="text-xs text-stone-600 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 active:scale-95">
                <Settings size={11} />管理
              </button>
            </div>
          </div>

          {HOURS.map(hour => {
            const key = cellKey(currentDay, hour);
            const actId = template[key];
            const activity = actId ? getActivity(actId) : null;
            const isOpen = openPicker === key;
            return (
              <div key={hour} className="mb-1.5">
                <button onClick={() => setOpenPicker(isOpen ? null : key)} className="w-full text-left rounded-xl transition-all active:scale-[0.98]" style={{ background: activity ? activity.color + '15' : '#ffffff', border: `1px solid ${activity ? activity.color + '35' : '#e7e5e4'}`, padding: '12px 16px' }}>
                  <div className="flex items-center gap-3">
                    <p className="text-base text-stone-900 w-14 flex-shrink-0" style={{ fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatHour(hour)}</p>
                    <div className="flex-1 flex items-center gap-2.5">
                      {activity ? (
                        <>
                          <span className="text-xl">{activity.emoji}</span>
                          <span className="text-base text-stone-900" style={{ fontWeight: 500 }}>{activity.label}</span>
                        </>
                      ) : (
                        <span className="text-stone-400 text-sm italic" style={{ fontFamily: 'Georgia, serif' }}>輕觸新增 ⋯</span>
                      )}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full transition-transform" style={{ background: activity ? activity.color : '#d6d3d1', transform: isOpen ? 'scale(2.2)' : 'scale(1)' }} />
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-1.5 p-3 rounded-xl bg-white border border-stone-200" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {activities.map(act => {
                        const selected = actId === act.id;
                        return (
                          <button key={act.id} onClick={() => handleSelect(currentDay, hour, act.id)} className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg transition-all active:scale-95" style={{ background: selected ? act.color : act.color + '15', border: `1px solid ${selected ? act.color : 'transparent'}` }}>
                            <span className="text-lg leading-none">{act.emoji}</span>
                            <span className="text-[11px] leading-tight" style={{ color: selected ? 'white' : '#1c1917', fontWeight: selected ? 600 : 500 }}>{act.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {activity && (
                      <button onClick={() => handleClear(currentDay, hour)} className="w-full py-2 rounded-lg text-xs text-stone-600 bg-stone-100 active:bg-stone-200 flex items-center justify-center gap-1.5">
                        <Trash2 size={12} />清除
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {dayFilledCount > 0 && (
            <button onClick={() => handleClearDay(currentDay)} className="w-full mt-4 py-2.5 rounded-xl text-xs text-stone-500 bg-white border border-stone-200 active:bg-stone-50 flex items-center justify-center gap-1.5">
              <Trash2 size={12} />清空{DAYS[currentDay].full}
            </button>
          )}
        </>
      )}

      {view === 'week' && (
        <div className="overflow-x-auto -mx-4 px-2">
          <div className="min-w-[640px]">
            <div className="flex sticky top-0 bg-stone-50 z-10 pb-1">
              <div className="w-12 flex-shrink-0" />
              {DAYS.map(d => (
                <div key={d.id} className="flex-1 text-center py-2">
                  <p className="text-sm text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>{d.label}</p>
                </div>
              ))}
            </div>

            {HOURS.map(hour => (
              <div key={hour} className="flex items-stretch border-b border-stone-100" style={{ minHeight: '36px' }}>
                <div className="w-12 flex-shrink-0 flex items-start justify-end pr-1.5 pt-1">
                  <p className="text-[10px] text-stone-500" style={{ fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums' }}>{formatHour(hour)}</p>
                </div>
                {DAYS.map(d => {
                  const key = cellKey(d.id, hour);
                  const actId = template[key];
                  const activity = actId ? getActivity(actId) : null;
                  return (
                    <button
                      key={d.id}
                      onClick={() => { setCurrentDay(d.id); setView('day'); setOpenPicker(key); }}
                      className="flex-1 m-0.5 rounded-md flex items-center justify-center active:scale-95"
                      style={{ background: activity ? activity.color : '#fff', border: activity ? 'none' : '1px solid #e7e5e4' }}
                      title={activity ? activity.label : '空'}
                    >
                      {activity && <span className="text-xs">{activity.emoji}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="pt-4 pb-2 px-2">
            <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">圖例</p>
            <div className="flex flex-wrap gap-1.5">
              {activities.map(act => (
                <div key={act.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ background: act.color + '15', color: '#1c1917' }}>
                  <span>{act.emoji}</span>
                  <span>{act.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {managing && <ActivityManager activities={activities} onSave={onSaveActivities} onClose={() => setManaging(false)} />}
    </div>
  );
}

// ============ Health Tab（Supp + 護膚 + 日期 nav） ============

function HealthTab({ slots, skincare, skincareTimes, onSaveSlots, onSaveSkincare, onSaveSkincareTimes }) {
  const [section, setSection] = useState('supps');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [record, setRecord] = useState({ supps: {}, skincare: {} });

  // 自動 focus 而家嘅時段（首次載入時）
  useEffect(() => {
    if (!isSameDate(currentDate, new Date())) return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    // 睇下 supp 定護膚時間更近
    let nearest = { type: 'supps', diff: Infinity };
    slots.forEach(s => {
      const [h, m] = (s.time || '08:00').split(':').map(Number);
      const slotMin = h * 60 + m;
      const diff = Math.abs(slotMin - nowMinutes);
      if (diff < nearest.diff) nearest = { type: 'supps', diff };
    });
    ['am', 'pm'].forEach(p => {
      const [h, m] = (skincareTimes[p] || '07:00').split(':').map(Number);
      const skinMin = h * 60 + m;
      const diff = Math.abs(skinMin - nowMinutes);
      if (diff < nearest.diff) nearest = { type: 'skincare', diff };
    });
    setSection(nearest.type === 'skincare' ? 'skincare' : 'supps');
  }, []); // eslint-disable-line

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(HEALTH_RECORD_PREFIX + fmtDate(currentDate)).catch(() => null);
        if (r?.value) {
          const p = JSON.parse(r.value);
          setRecord({ supps: p.supps || {}, skincare: p.skincare || {} });
        } else {
          setRecord({ supps: {}, skincare: {} });
        }
      } catch { setRecord({ supps: {}, skincare: {} }); }
    })();
  }, [currentDate]);

  const saveRecord = async (n) => {
    setRecord(n);
    try { await window.storage.set(HEALTH_RECORD_PREFIX + fmtDate(currentDate), JSON.stringify(n)); } catch(e){}
  };
  const toggleSupp = (sId, iId) => { const k = `${sId}:${iId}`; saveRecord({ ...record, supps: { ...record.supps, [k]: !record.supps[k] } }); };
  const toggleSkin = (p, id) => { const k = `${p}:${id}`; saveRecord({ ...record, skincare: { ...record.skincare, [k]: !record.skincare[k] } }); };

  const goPrev = () => setCurrentDate(new Date(currentDate.getTime() - 86400000));
  const goNext = () => setCurrentDate(new Date(currentDate.getTime() + 86400000));
  const goToday = () => setCurrentDate(new Date());
  const isToday = isSameDate(currentDate, new Date());

  return (
    <div>
      {/* Date nav */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={goPrev} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95">
          <ChevronLeft size={15} className="text-stone-700" />
        </button>
        <button onClick={goToday} className="flex-1 py-2 px-3 rounded-full text-center active:scale-95 text-sm" style={{ background: isToday ? '#1c1917' : 'white', border: `1px solid ${isToday ? '#1c1917' : '#e7e5e4'}`, color: isToday ? 'white' : '#1c1917' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>{fmtDateZh(currentDate)}</span>
          <span className="text-xs ml-1.5 opacity-60">星期{fmtWeekday(currentDate)}</span>
          {isToday && <span className="text-[10px] ml-1.5 opacity-80">· 今日</span>}
        </button>
        <button onClick={goNext} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95">
          <ChevronRight size={15} className="text-stone-700" />
        </button>
      </div>

      {/* Section switcher */}
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-4">
        <button onClick={() => setSection('supps')} className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5" style={{ background: section === 'supps' ? 'white' : 'transparent', fontWeight: section === 'supps' ? 600 : 400, color: section === 'supps' ? '#1c1917' : '#78716c', boxShadow: section === 'supps' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
          <Pill size={13} />Supplements
        </button>
        <button onClick={() => setSection('skincare')} className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5" style={{ background: section === 'skincare' ? 'white' : 'transparent', fontWeight: section === 'skincare' ? 600 : 400, color: section === 'skincare' ? '#1c1917' : '#78716c', boxShadow: section === 'skincare' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
          <Sparkles size={13} />護膚
        </button>
      </div>

      {section === 'supps' && <SupplementsSection slots={slots} record={record} onToggle={toggleSupp} onSaveSlots={onSaveSlots} isToday={isSameDate(currentDate, new Date())} />}
      {section === 'skincare' && <SkincareSection skincare={skincare} skincareTimes={skincareTimes} record={record} onToggle={toggleSkin} onSaveSkincare={onSaveSkincare} onSaveSkincareTimes={onSaveSkincareTimes} isToday={isSameDate(currentDate, new Date())} />}
    </div>
  );
}

function SupplementsSection({ slots, record, onToggle, onSaveSlots, isToday }) {
  const [managing, setManaging] = useState(false);
  const totalItems = slots.reduce((s, sl) => s + sl.items.length, 0);
  const checkedItems = slots.reduce((s, sl) => s + sl.items.filter(i => record.supps[`${sl.id}:${i.id}`]).length, 0);

  // 判斷邊個 slot 最接近而家時間
  const nowSlotId = useMemo(() => {
    if (!isToday || slots.length === 0) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let nearest = null;
    let nearestDiff = Infinity;
    slots.forEach(s => {
      const [h, m] = (s.time || '08:00').split(':').map(Number);
      const diff = Math.abs(h * 60 + m - nowMin);
      if (diff < nearestDiff) {
        nearestDiff = diff;
        nearest = s.id;
      }
    });
    // 只 highlight 兩個鐘內嘅
    return nearestDiff <= 120 ? nearest : null;
  }, [slots, isToday]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-stone-500" style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-base text-stone-900" style={{ fontWeight: 500 }}>{checkedItems}</span><span className="mx-1">/</span>{totalItems} 已食
        </p>
        <button onClick={() => setManaging(true)} className="text-xs text-stone-600 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 active:scale-95">
          <Settings size={11} />管理
        </button>
      </div>

      {slots.length === 0 && <EmptyState icon={Pill} title="未有時段" desc="撳「管理」加入時段" />}

      {slots.map(slot => {
        const isNow = slot.id === nowSlotId;
        return (
        <div key={slot.id} className="mb-4">
          <div className="flex items-baseline gap-2 mb-2 px-1">
            <span className="text-lg">{slot.emoji}</span>
            <h3 className="text-base text-stone-900" style={{ fontWeight: 600 }}>{slot.label}</h3>
            {slot.time && (
              <span className="text-[10px] text-stone-500 tabular-nums" style={{ fontFamily: 'Georgia, serif' }}>
                {slot.time}
              </span>
            )}
            {isNow && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" style={{ fontWeight: 600 }}>
                Now
              </span>
            )}
            <span className="text-[11px] text-stone-400 ml-auto">{slot.items.filter(i => record.supps[`${slot.id}:${i.id}`]).length}/{slot.items.length}</span>
          </div>
          {slot.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 py-4 text-center"><p className="text-xs text-stone-400 italic" style={{ fontFamily: 'Georgia, serif' }}>未有項目</p></div>
          ) : slot.items.map(item => {
            const checked = !!record.supps[`${slot.id}:${item.id}`];
            return (
              <ChecklistItem key={item.id} label={item.name} checked={checked} isNow={isNow} tint="emerald" onClick={() => onToggle(slot.id, item.id)} />
            );
          })}
        </div>
        );
      })}

      {managing && <SupplementManager slots={slots} onSave={onSaveSlots} onClose={() => setManaging(false)} />}
    </div>
  );
}

function SkincareSection({ skincare, skincareTimes, record, onToggle, onSaveSkincare, onSaveSkincareTimes, isToday }) {
  const [managing, setManaging] = useState(null);
  const [editingTimes, setEditingTimes] = useState(false);

  // 決定「而家」係 am 定 pm
  const nowPeriod = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [ah, am] = (skincareTimes.am || '07:00').split(':').map(Number);
    const [ph, pm] = (skincareTimes.pm || '22:00').split(':').map(Number);
    const amDiff = Math.abs(ah * 60 + am - nowMin);
    const pmDiff = Math.abs(ph * 60 + pm - nowMin);
    if (Math.min(amDiff, pmDiff) > 120) return null;
    return amDiff < pmDiff ? 'am' : 'pm';
  }, [skincareTimes, isToday]);

  return (
    <div>
      {['am', 'pm'].map(period => {
        const steps = skincare[period];
        const checked = steps.filter(s => record.skincare[`${period}:${s.id}`]).length;
        const isNow = period === nowPeriod;
        const time = skincareTimes[period] || (period === 'am' ? '07:00' : '22:00');
        return (
          <div key={period} className="mb-5">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg">{period === 'am' ? '☀️' : '🌙'}</span>
                <h3 className="text-base text-stone-900" style={{ fontWeight: 600 }}>{period === 'am' ? '早晨護膚' : '晚間護膚'}</h3>
                <button
                  onClick={() => setEditingTimes(true)}
                  className="text-[10px] text-stone-500 tabular-nums px-1.5 py-0.5 rounded hover:bg-stone-100 active:bg-stone-200"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {time}
                </button>
                {isNow && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" style={{ fontWeight: 600 }}>
                    Now
                  </span>
                )}
                <span className="text-[11px] text-stone-400">{checked}/{steps.length}</span>
              </div>
              <button onClick={() => setManaging(period)} className="text-xs text-stone-600 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 active:scale-95"><Settings size={11} />管理</button>
            </div>
            {steps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 py-4 text-center"><p className="text-xs text-stone-400 italic" style={{ fontFamily: 'Georgia, serif' }}>未有步驟</p></div>
            ) : steps.map((step, idx) => {
              const isChecked = !!record.skincare[`${period}:${step.id}`];
              return (
                <ChecklistItem key={step.id} label={step.name} checked={isChecked} isNow={isNow} index={idx + 1} tint="blue" onClick={() => onToggle(period, step.id)} />
              );
            })}
          </div>
        );
      })}

      {managing && <SkincareManager period={managing} steps={skincare[managing]} onSave={(s) => onSaveSkincare({ ...skincare, [managing]: s })} onClose={() => setManaging(null)} />}
      {editingTimes && <SkincareTimesModal times={skincareTimes} onSave={onSaveSkincareTimes} onClose={() => setEditingTimes(false)} />}
    </div>
  );
}

function SkincareTimesModal({ times, onSave, onClose }) {
  const [am, setAm] = useState(times.am || '07:00');
  const [pm, setPm] = useState(times.pm || '22:00');

  const handleSave = () => {
    onSave({ am, pm });
    onClose();
  };

  return (
    <Modal title="護膚時間" onClose={onClose}>
      <p className="text-xs text-stone-500 italic mb-4 px-1" style={{ fontFamily: 'Georgia, serif' }}>
        設定早晚護膚嘅提醒時間。用於「Now」自動 focus。
      </p>

      <div className="rounded-xl bg-white border border-stone-200 p-4 mb-3">
        <div className="mb-3">
          <label className="text-xs text-stone-600 mb-1.5 flex items-center gap-1.5">
            <span className="text-base">☀️</span>早晨護膚
          </label>
          <input
            type="time"
            value={am}
            onChange={e => setAm(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
          />
        </div>
        <div>
          <label className="text-xs text-stone-600 mb-1.5 flex items-center gap-1.5">
            <span className="text-base">🌙</span>晚間護膚
          </label>
          <input
            type="time"
            value={pm}
            onChange={e => setPm(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm text-stone-600 bg-stone-100 active:bg-stone-200">取消</button>
        <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg text-sm text-white bg-stone-900 active:bg-stone-700" style={{ fontWeight: 500 }}>儲存</button>
      </div>
    </Modal>
  );
}

// ============ Report Tab（統計 + 報告） ============

function ReportTab({ activities, template, slots, skincare }) {
  const [section, setSection] = useState('stats');

  return (
    <div>
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-4">
        <button onClick={() => setSection('stats')} className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5" style={{ background: section === 'stats' ? 'white' : 'transparent', fontWeight: section === 'stats' ? 600 : 400, color: section === 'stats' ? '#1c1917' : '#78716c', boxShadow: section === 'stats' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
          <BarChart3 size={13} />時間統計
        </button>
        <button onClick={() => setSection('report')} className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5" style={{ background: section === 'report' ? 'white' : 'transparent', fontWeight: section === 'report' ? 600 : 400, color: section === 'report' ? '#1c1917' : '#78716c', boxShadow: section === 'report' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
          <FileText size={13} />今日報告
        </button>
      </div>

      {section === 'stats' && <StatsSection activities={activities} template={template} />}
      {section === 'report' && <DailyReportSection activities={activities} template={template} slots={slots} skincare={skincare} />}
    </div>
  );
}

function StatsSection({ activities, template }) {
  const [range, setRange] = useState('week');

  // 計算每個活動嘅時數（由 template 計）
  let stats = {};
  let totalHours = 0;

  if (range === 'day') {
    const todayIdx = jsDayToMonIdx(new Date().getDay());
    HOURS.forEach(h => {
      const id = template[`${todayIdx}-${h}`];
      if (id) {
        stats[id] = (stats[id] || 0) + 1;
        totalHours++;
      }
    });
  } else if (range === 'week') {
    DAYS.forEach(d => {
      HOURS.forEach(h => {
        const id = template[`${d.id}-${h}`];
        if (id) {
          stats[id] = (stats[id] || 0) + 1;
          totalHours++;
        }
      });
    });
  } else {
    // month = 週 × 4.33（平均）
    const weekly = {};
    let weeklyTotal = 0;
    DAYS.forEach(d => {
      HOURS.forEach(h => {
        const id = template[`${d.id}-${h}`];
        if (id) {
          weekly[id] = (weekly[id] || 0) + 1;
          weeklyTotal++;
        }
      });
    });
    Object.keys(weekly).forEach(k => { stats[k] = Math.round(weekly[k] * 4.33); });
    totalHours = Math.round(weeklyTotal * 4.33);
  }

  const sortedActs = activities.map(a => ({ ...a, hours: stats[a.id] || 0 })).sort((a, b) => b.hours - a.hours);
  const maxHours = sortedActs[0]?.hours || 1;

  const rangeLabels = { day: '今日', week: '一週', month: '一月（估算）' };

  return (
    <div>
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-3">
        {[
          { id: 'day', label: '今日' },
          { id: 'week', label: '一週' },
          { id: 'month', label: '一月' },
        ].map(r => {
          const active = range === r.id;
          return (
            <button key={r.id} onClick={() => setRange(r.id)} className="flex-1 py-2 rounded-full text-xs transition-all" style={{ background: active ? 'white' : 'transparent', fontWeight: active ? 600 : 400, color: active ? '#1c1917' : '#78716c', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="px-1 mb-3">
        <p className="text-xs text-stone-500 italic" style={{ fontFamily: 'Georgia, serif' }}>
          根據你嘅週 template 計算 · {rangeLabels[range]}
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-1">總計</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>{totalHours}</span>
          <span className="text-base text-stone-500">小時</span>
        </div>
      </div>

      {totalHours > 0 && <ImportantAnalysis activities={activities} stats={stats} totalHours={totalHours} />}

      {totalHours === 0 ? (
        <EmptyState icon={BarChart3} title="未有計劃" desc="去「計劃」tab 填寫先" />
      ) : (
        <div>
          <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2 px-1">分佈</p>
          {sortedActs.map(act => {
            if (act.hours === 0) return null;
            const pct = totalHours > 0 ? (act.hours / totalHours * 100) : 0;
            const barPct = (act.hours / maxHours * 100);
            return (
              <div key={act.id} className="mb-3">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{act.emoji}</span>
                    <span className="text-sm text-stone-900" style={{ fontWeight: 500 }}>{act.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{act.hours}</span>
                    <span className="text-[10px] text-stone-500">小時</span>
                    <span className="text-[10px] text-stone-400 ml-1">({pct.toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full transition-all duration-500" style={{ width: `${barPct}%`, background: act.color }} />
                </div>
              </div>
            );
          })}

          {sortedActs.filter(a => a.hours === 0).length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-stone-400 italic cursor-pointer px-1" style={{ fontFamily: 'Georgia, serif' }}>未有時段嘅活動（{sortedActs.filter(a => a.hours === 0).length}）</summary>
              <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                {sortedActs.filter(a => a.hours === 0).map(a => (
                  <div key={a.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100 text-xs text-stone-500">
                    <span>{a.emoji}</span>
                    <span>{a.label}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// 「瞓覺性質」類別靠 label 文字識別（含「瞓」或「睡」），唔另加欄位
const SLEEP_LABEL_RE = /瞓|睡/;
// 自我增值時數門檻：30 分鐘。Template 現時逐格係成粒鐘計，無半粒鐘資料，
// 所以呢個門檻實務上等於「0 小時」先會觸發；寫成 0.5 小時保留語意，
// 將來如果 template granularity 變幼咗都仲啱用。
const SELF_IMPROVEMENT_MIN_HOURS = 0.5;

function ImportantAnalysis({ activities, stats, totalHours }) {
  const importantActs = activities.filter(a => a.important);
  const anySelected = importantActs.length > 0;

  if (!anySelected) {
    return (
      <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">重要 vs 不重要</p>
        <p className="text-sm text-stone-500 italic" style={{ fontFamily: 'Georgia, serif' }}>未設定重要事項，前往設定揀選</p>
      </div>
    );
  }

  const importantHours = importantActs.reduce((sum, a) => sum + (stats[a.id] || 0), 0);
  const unimportantHours = totalHours - importantHours;
  const importantPct = totalHours > 0 ? (importantHours / totalHours * 100) : 0;
  const unimportantPct = totalHours > 0 ? 100 - importantPct : 0;

  const sleepActs = importantActs.filter(a => SLEEP_LABEL_RE.test(a.label));
  const hasSleepCategory = sleepActs.length > 0;
  const sleepHours = sleepActs.reduce((sum, a) => sum + (stats[a.id] || 0), 0);
  const selfImprovementHours = importantHours - sleepHours;

  const showLowImportantWarning = importantPct < 30;
  const showLowSelfImprovementWarning = hasSleepCategory && selfImprovementHours < SELF_IMPROVEMENT_MIN_HOURS;

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-3">重要 vs 不重要</p>

      <div className="flex gap-4 mb-3">
        <div className="flex-1">
          <p className="text-xs text-stone-500 mb-1">重要事項</p>
          <p className="flex items-baseline gap-1">
            <span className="text-2xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{importantHours}</span>
            <span className="text-xs text-stone-500">小時 · {importantPct.toFixed(0)}%</span>
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-stone-500 mb-1">不重要事項</p>
          <p className="flex items-baseline gap-1">
            <span className="text-2xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{unimportantHours}</span>
            <span className="text-xs text-stone-500">小時 · {unimportantPct.toFixed(0)}%</span>
          </p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-stone-100 overflow-hidden flex mb-3">
        <div style={{ width: `${importantPct}%`, background: '#f59e0b' }} />
        <div style={{ width: `${unimportantPct}%`, background: '#d6d3d1' }} />
      </div>

      {showLowImportantWarning && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 mb-2">
          <p className="text-xs text-amber-900 leading-relaxed">⚠️ 重要事項時間比重偏低（現時 {importantPct.toFixed(0)}%），建議適當調整分配</p>
        </div>
      )}

      {showLowSelfImprovementWarning && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
          <p className="text-xs text-amber-900 leading-relaxed">⚠️ 自我增值時間接近 0，可能被睡眠時數掩蓋咗整體比例</p>
        </div>
      )}
    </div>
  );
}

function DailyReportSection({ activities, template, slots, skincare }) {
  const [copied, setCopied] = useState(false);
  const [todayRecord, setTodayRecord] = useState({ supps: {}, skincare: {} });
  const today = new Date();
  const todayIdx = jsDayToMonIdx(today.getDay());

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(HEALTH_RECORD_PREFIX + fmtDate(today)).catch(() => null);
        if (r?.value) setTodayRecord(JSON.parse(r.value));
      } catch {}
    })();
  }, []);

  const getActivity = (id) => activities.find(a => a.id === id);

  const generateReport = () => {
    const lines = [];
    lines.push(`📋 每日報告 ── ${fmtDateZh(today)}（星期${fmtWeekday(today)}）`);
    lines.push('');

    // Plan (from template)
    lines.push('⏰ 今日計劃');
    lines.push('─────────────');
    const todaysPlan = HOURS.filter(h => template[`${todayIdx}-${h}`]);
    if (todaysPlan.length === 0) {
      lines.push('（未設定計劃）');
    } else {
      todaysPlan.forEach(h => {
        const a = getActivity(template[`${todayIdx}-${h}`]);
        if (!a) return;
        lines.push(`${formatHour(h)}  ${a.emoji} ${a.label}`);
      });
      lines.push(`\n小計：${todaysPlan.length} 個時段`);
    }
    lines.push('');

    // Supplements
    lines.push('💊 SUPPLEMENTS');
    lines.push('─────────────');
    let totalSupps = 0, checkedSupps = 0;
    slots.forEach(slot => {
      if (slot.items.length === 0) return;
      const sC = slot.items.filter(i => todayRecord.supps?.[`${slot.id}:${i.id}`]).length;
      totalSupps += slot.items.length;
      checkedSupps += sC;
      lines.push(`\n${slot.emoji} ${slot.label}（${sC}/${slot.items.length}）`);
      slot.items.forEach(item => {
        const c = !!todayRecord.supps?.[`${slot.id}:${item.id}`];
        lines.push(`  ${c ? '✅' : '⬜'} ${item.name}`);
      });
    });
    if (totalSupps === 0) lines.push('（未設定）');
    else lines.push(`\n小計：${checkedSupps}/${totalSupps}`);
    lines.push('');

    // Skincare
    lines.push('🧴 護膚');
    lines.push('─────────────');
    let totalSkin = 0, checkedSkin = 0;
    ['am', 'pm'].forEach(p => {
      const steps = skincare[p];
      if (steps.length === 0) return;
      const sC = steps.filter(s => todayRecord.skincare?.[`${p}:${s.id}`]).length;
      totalSkin += steps.length;
      checkedSkin += sC;
      const em = p === 'am' ? '☀️' : '🌙';
      const lb = p === 'am' ? '早晨' : '晚間';
      lines.push(`\n${em} ${lb}（${sC}/${steps.length}）`);
      steps.forEach(step => {
        const c = !!todayRecord.skincare?.[`${p}:${step.id}`];
        lines.push(`  ${c ? '✅' : '⬜'} ${step.name}`);
      });
    });
    if (totalSkin === 0) lines.push('（未設定）');
    else lines.push(`\n小計：${checkedSkin}/${totalSkin}`);
    lines.push('');

    lines.push('━━━━━━━━━━━━━');
    const totalChecks = totalSupps + totalSkin;
    const doneChecks = checkedSupps + checkedSkin;
    const pct = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;
    lines.push(`📊 健康完成率：${doneChecks}/${totalChecks}（${pct}%）`);
    lines.push(`⏰ 計劃時段：${todaysPlan.length}/24`);

    return lines.join('\n');
  };

  const report = generateReport();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      document.body.removeChild(ta);
    }
  };

  return (
    <div>
      <div className="px-1 mb-3">
        <p className="text-xs text-stone-500 italic" style={{ fontFamily: 'Georgia, serif' }}>一撳 Copy 貼去 WhatsApp / Telegram</p>
      </div>
      <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <pre className="whitespace-pre-wrap text-sm text-stone-800 leading-relaxed" style={{ fontFamily: '-apple-system, "Helvetica Neue", sans-serif', wordBreak: 'break-word' }}>{report}</pre>
      </div>
      <button onClick={handleCopy} className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: copied ? '#10b981' : '#1c1917', color: 'white', fontWeight: 500 }}>
        {copied ? <><Check size={16} /><span>已複製！</span></> : <><Copy size={16} /><span>複製報告</span></>}
      </button>
    </div>
  );
}

// ============ Activity Manager ============

function ActivityManager({ activities, onSave, onClose }) {
  const [local, setLocal] = useState(activities);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleClose = () => { onSave(local); onClose(); };
  const addAct = (data) => { setLocal([...local, { important: false, ...data, id: `custom-${Date.now()}` }]); setAdding(false); };
  const addPresets = (presets) => { setLocal([...local, ...presets.map((p, i) => ({ important: false, ...p, id: `custom-${Date.now()}-${i}` }))]); };
  const updateAct = (id, data) => setLocal(local.map(a => a.id === id ? { ...a, ...data } : a));
  const deleteAct = (id) => { if (!confirm('刪除呢個類別？')) return; setLocal(local.filter(a => a.id !== id)); };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocal((items) => {
      const oldIdx = items.findIndex(a => a.id === active.id);
      const newIdx = items.findIndex(a => a.id === over.id);
      return arrayMove(items, oldIdx, newIdx);
    });
  };

  const existingLabels = useMemo(() => new Set(local.map(a => a.label.trim())), [local]);

  return (
    <Modal title="活動類別" onClose={handleClose}>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => { setReorderMode(!reorderMode); setEditingId(null); setAdding(false); }} className="px-3 h-8 rounded-full border border-stone-200 text-xs flex items-center gap-1.5 active:scale-95" style={{ background: reorderMode ? '#1c1917' : 'white', color: reorderMode ? 'white' : '#44403c', fontWeight: 500 }}>
          <GripVertical size={11} />{reorderMode ? '完成排序' : '排序'}
        </button>
      </div>

      {reorderMode && (
        <p className="text-[11px] text-stone-500 italic mb-2 px-1" style={{ fontFamily: 'Georgia, serif' }}>按住 ⠿ 拖曳排序</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={local.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {local.map((act) => {
            if (editingId === act.id) return <ActivityForm key={act.id} initial={act} onSubmit={(data) => { updateAct(act.id, data); setEditingId(null); }} onCancel={() => setEditingId(null)} />;
            return (
              <SortableActivityItem
                key={act.id}
                act={act}
                reorderMode={reorderMode}
                onEdit={() => setEditingId(act.id)}
                onDelete={() => deleteAct(act.id)}
                onToggleImportant={() => updateAct(act.id, { important: !act.important })}
              />
            );
          })}
        </SortableContext>
      </DndContext>

      {!reorderMode && (adding ? (
        <>
          <QuickAddPresets existingLabels={existingLabels} onAddSelected={addPresets} />
          <ActivityForm onSubmit={addAct} onCancel={() => setAdding(false)} />
        </>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full mt-2 py-3 rounded-xl bg-white border border-dashed border-stone-300 text-stone-700 active:bg-stone-50 flex items-center justify-center gap-2 text-sm" style={{ fontWeight: 500 }}>
          <Plus size={14} />新增活動類別
        </button>
      ))}
    </Modal>
  );
}

function SortableActivityItem({ act, reorderMode, onEdit, onDelete, onToggleImportant }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: act.id, disabled: !reorderMode });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: isDragging ? '0 10px 28px rgba(0,0,0,0.18)' : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-2.5 px-4 mb-1.5 rounded-xl bg-white border border-stone-200">
      {reorderMode && (
        <button {...attributes} {...listeners} className="touch-none select-none w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing">
          <GripVertical size={14} className="text-stone-500" />
        </button>
      )}
      <span className="text-lg">{act.emoji}</span>
      <span className="flex-1 text-sm text-stone-900 truncate" style={{ fontWeight: 500 }}>{act.label}</span>
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: act.color }} />
      {!reorderMode && (
        <div className="flex gap-1">
          <button onClick={onToggleImportant} title="列為重要事項" className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center active:scale-95">
            <Star size={12} className={act.important ? 'text-amber-500' : 'text-stone-400'} fill={act.important ? 'currentColor' : 'none'} />
          </button>
          <button onClick={onEdit} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center active:scale-95"><Pencil size={10} className="text-stone-600" /></button>
          <button onClick={onDelete} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center active:scale-95"><Trash2 size={10} className="text-stone-500" /></button>
        </div>
      )}
    </div>
  );
}

function QuickAddPresets({ existingLabels, onAddSelected }) {
  const [selected, setSelected] = useState([]);

  const toggle = (label) => {
    setSelected(sel => sel.includes(label) ? sel.filter(l => l !== label) : [...sel, label]);
  };
  const handleAdd = () => {
    const toAdd = PRESET_ACTIVITIES.filter(p => selected.includes(p.label));
    onAddSelected(toAdd);
    setSelected([]);
  };

  return (
    <div className="mb-3 p-3 rounded-xl bg-stone-100/60 border border-stone-200">
      <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">快速加入</p>
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {PRESET_ACTIVITIES.map(p => {
          const exists = existingLabels.has(p.label);
          const isSelected = selected.includes(p.label);
          return (
            <button
              key={p.label}
              onClick={() => toggle(p.label)}
              disabled={exists}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg transition-all active:scale-95 disabled:active:scale-100"
              style={{
                background: exists ? '#e7e5e4' : (isSelected ? p.color : p.color + '15'),
                border: `1px solid ${isSelected && !exists ? p.color : 'transparent'}`,
                opacity: exists ? 0.55 : 1,
              }}
            >
              <span className="text-lg leading-none">{p.emoji}</span>
              <span className="text-[11px] leading-tight" style={{ color: exists ? '#78716c' : (isSelected ? 'white' : '#1c1917'), fontWeight: isSelected ? 600 : 500 }}>
                {exists ? '已加入' : p.label}
              </span>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button onClick={handleAdd} className="w-full py-2 rounded-lg text-xs text-white bg-stone-900 active:bg-stone-700 flex items-center justify-center gap-1.5" style={{ fontWeight: 500 }}>
          <Plus size={12} />加入選中（{selected.length}）
        </button>
      )}
    </div>
  );
}

function ActivityForm({ initial, onSubmit, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '✨');
  const [color, setColor] = useState(initial?.color || COLOR_PALETTE[6]);

  return (
    <div className="p-3 mb-2 rounded-xl bg-white border-2 border-stone-900">
      <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">{initial ? '編輯' : '新增'}類別</p>
      <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="例如：閱讀、家務..." maxLength={8} className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm mb-2 outline-none focus:border-stone-400" />
      <p className="text-[10px] text-stone-500 mb-1">圖示</p>
      <div className="grid grid-cols-9 gap-1 mb-2 max-h-32 overflow-y-auto">
        {ACTIVITY_EMOJIS.map(em => (
          <button key={em} onClick={() => setEmoji(em)} className="aspect-square rounded-md text-base" style={{ background: emoji === em ? '#1c1917' : '#fafaf9', border: `1px solid ${emoji === em ? '#1c1917' : '#e7e5e4'}` }}>{em}</button>
        ))}
      </div>
      <p className="text-[10px] text-stone-500 mb-1">顏色</p>
      <div className="grid grid-cols-12 gap-1 mb-3">
        {COLOR_PALETTE.map(c => (
          <button key={c} onClick={() => setColor(c)} className="aspect-square rounded-full" style={{ background: c, transform: color === c ? 'scale(1.15)' : 'scale(1)', boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none' }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-xs text-stone-600 bg-stone-100">取消</button>
        <button onClick={() => { if (label.trim()) onSubmit({ label: label.trim(), emoji, color }); }} disabled={!label.trim()} className="flex-1 py-2 rounded-lg text-xs text-white bg-stone-900 disabled:opacity-30" style={{ fontWeight: 500 }}>{initial ? '儲存' : '加入'}</button>
      </div>
    </div>
  );
}

// ============ Supplement Manager ============

function SupplementManager({ slots, onSave, onClose }) {
  const [local, setLocal] = useState(slots);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [addingSlot, setAddingSlot] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const handleClose = () => { onSave(local); onClose(); };
  const addSlot = (data) => { setLocal([...local, { ...data, id: `slot-${Date.now()}`, items: [] }]); setAddingSlot(false); };
  const updateSlot = (id, data) => setLocal(local.map(s => s.id === id ? { ...s, ...data } : s));
  const deleteSlot = (id) => { if (!confirm('刪除呢個時段同所有 supplement？')) return; setLocal(local.filter(s => s.id !== id)); };
  const moveSlot = (id, dir) => {
    const idx = local.findIndex(s => s.id === id);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= local.length) return;
    const next = [...local];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setLocal(next);
  };
  const addItem = (sId, name) => setLocal(local.map(s => s.id === sId ? { ...s, items: [...s.items, { id: `item-${Date.now()}`, name }] } : s));
  const updateItem = (sId, iId, name) => setLocal(local.map(s => s.id === sId ? { ...s, items: s.items.map(i => i.id === iId ? { ...i, name } : i) } : s));
  const deleteItem = (sId, iId) => setLocal(local.map(s => s.id === sId ? { ...s, items: s.items.filter(i => i.id !== iId) } : s));

  return (
    <Modal title="管理 Supplements" onClose={handleClose}>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setReorderMode(!reorderMode)} className="px-3 h-8 rounded-full border border-stone-200 text-xs flex items-center gap-1.5 active:scale-95" style={{ background: reorderMode ? '#1c1917' : 'white', color: reorderMode ? 'white' : '#44403c', fontWeight: 500 }}>
          <GripVertical size={11} />{reorderMode ? '完成排序' : '排序時段'}
        </button>
      </div>

      {local.map((slot, idx) => (
        <div key={slot.id} className="mb-3">
          {editingSlotId === slot.id ? (
            <SlotForm initial={slot} onSubmit={(d) => { updateSlot(slot.id, d); setEditingSlotId(null); }} onCancel={() => setEditingSlotId(null)} />
          ) : (
            <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-stone-50 border-b border-stone-200">
                <span className="text-lg">{slot.emoji}</span>
                <span className="flex-1 text-sm text-stone-900" style={{ fontWeight: 600 }}>{slot.label}</span>
                {reorderMode ? (
                  <div className="flex gap-1">
                    <button onClick={() => moveSlot(slot.id, 'up')} disabled={idx === 0} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowUp size={11} /></button>
                    <button onClick={() => moveSlot(slot.id, 'down')} disabled={idx === local.length - 1} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowDown size={11} /></button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => setEditingSlotId(slot.id)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><Pencil size={10} className="text-stone-600" /></button>
                    <button onClick={() => deleteSlot(slot.id)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><Trash2 size={10} className="text-stone-500" /></button>
                  </div>
                )}
              </div>
              {!reorderMode && <ItemsEditor items={slot.items} onAdd={(n) => addItem(slot.id, n)} onUpdate={(iId, n) => updateItem(slot.id, iId, n)} onDelete={(iId) => deleteItem(slot.id, iId)} placeholder="例如：維他命 C" />}
            </div>
          )}
        </div>
      ))}

      {!reorderMode && (addingSlot ? <SlotForm onSubmit={addSlot} onCancel={() => setAddingSlot(false)} /> : (
        <button onClick={() => setAddingSlot(true)} className="w-full py-3 rounded-xl bg-white border border-dashed border-stone-300 text-stone-700 active:bg-stone-50 flex items-center justify-center gap-2 text-sm" style={{ fontWeight: 500 }}>
          <Plus size={14} />新增時段
        </button>
      ))}
    </Modal>
  );
}

function SlotForm({ initial, onSubmit, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '⏰');
  const [time, setTime] = useState(initial?.time || '08:00');

  return (
    <div className="p-3 mb-2 rounded-xl bg-white border-2 border-stone-900">
      <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">{initial ? '編輯' : '新增'}時段</p>
      <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="例如：早餐後..." maxLength={10} className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm mb-2 outline-none focus:border-stone-400" />
      <p className="text-[10px] text-stone-500 mb-1">圖示</p>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {SLOT_EMOJIS.map(em => (
          <button key={em} onClick={() => setEmoji(em)} className="aspect-square rounded-md text-base" style={{ background: emoji === em ? '#1c1917' : '#fafaf9', border: `1px solid ${emoji === em ? '#1c1917' : '#e7e5e4'}` }}>{em}</button>
        ))}
      </div>
      <p className="text-[10px] text-stone-500 mb-1">提醒時間</p>
      <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm mb-3 outline-none focus:border-stone-400" />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-xs text-stone-600 bg-stone-100">取消</button>
        <button onClick={() => { if (label.trim()) onSubmit({ label: label.trim(), emoji, time }); }} disabled={!label.trim()} className="flex-1 py-2 rounded-lg text-xs text-white bg-stone-900 disabled:opacity-30" style={{ fontWeight: 500 }}>{initial ? '儲存' : '加入'}</button>
      </div>
    </div>
  );
}

// ============ Skincare Manager ============

function SkincareManager({ period, steps, onSave, onClose }) {
  const [local, setLocal] = useState(steps);
  const handleClose = () => { onSave(local); onClose(); };
  const addStep = (n) => setLocal([...local, { id: `step-${Date.now()}`, name: n }]);
  const updateStep = (id, n) => setLocal(local.map(s => s.id === id ? { ...s, name: n } : s));
  const deleteStep = (id) => setLocal(local.filter(s => s.id !== id));
  const moveStep = (id, dir) => {
    const idx = local.findIndex(s => s.id === id);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= local.length) return;
    const next = [...local];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setLocal(next);
  };

  return (
    <Modal title={`管理${period === 'am' ? '早晨' : '晚間'}護膚`} onClose={handleClose}>
      <ItemsEditor items={local} onAdd={addStep} onUpdate={updateStep} onDelete={deleteStep} onMove={moveStep} placeholder="例如：潔面" numbered />
    </Modal>
  );
}

// ============ Items Editor ============

function ItemsEditor({ items, onAdd, onUpdate, onDelete, onMove, placeholder, numbered }) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [newText, setNewText] = useState('');

  const startEdit = (item) => { setEditingId(item.id); setEditText(item.name); };
  const commitEdit = () => { if (editText.trim() && editingId) onUpdate(editingId, editText.trim()); setEditingId(null); setEditText(''); };
  const handleAdd = () => { if (newText.trim()) { onAdd(newText.trim()); setNewText(''); } };

  return (
    <div className="p-3">
      {items.length === 0 && <p className="text-xs text-stone-400 italic text-center py-3" style={{ fontFamily: 'Georgia, serif' }}>未有項目</p>}
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 mb-1.5">
          {numbered && <span className="text-xs w-5 text-center text-stone-400" style={{ fontFamily: 'Georgia, serif', fontWeight: 600 }}>{idx + 1}</span>}
          {editingId === item.id ? (
            <input type="text" value={editText} onChange={e => setEditText(e.target.value)} onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-white border-2 border-stone-900 text-sm outline-none" />
          ) : (
            <>
              <span className="flex-1 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800">{item.name}</span>
              {onMove && (
                <>
                  <button onClick={() => onMove(item.id, 'up')} disabled={idx === 0} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowUp size={10} className="text-stone-600" /></button>
                  <button onClick={() => onMove(item.id, 'down')} disabled={idx === items.length - 1} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowDown size={10} className="text-stone-600" /></button>
                </>
              )}
              <button onClick={() => startEdit(item)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><Pencil size={10} className="text-stone-600" /></button>
              <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><Trash2 size={10} className="text-stone-500" /></button>
            </>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 mt-2">
        {numbered && <span className="w-5" />}
        <input type="text" value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} placeholder={placeholder} className="flex-1 px-3 py-2 rounded-lg bg-white border border-stone-200 text-sm outline-none focus:border-stone-400" />
        <button onClick={handleAdd} disabled={!newText.trim()} className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center disabled:opacity-30 active:scale-95"><Plus size={14} /></button>
      </div>
    </div>
  );
}

// ============ Shared ============

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full sm:max-w-md bg-stone-50 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' }}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between sticky top-0 bg-stone-50 z-10">
          <h2 className="text-xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><X size={15} className="text-stone-600" /></button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 py-10 px-6 text-center">
      <Icon size={28} className="mx-auto text-stone-400 mb-3" />
      <p className="text-base text-stone-700 mb-1" style={{ fontWeight: 500 }}>{title}</p>
      <p className="text-xs text-stone-500 italic" style={{ fontFamily: 'Georgia, serif' }}>{desc}</p>
    </div>
  );
}

// 打鈎清單項目 — 抽出自 SupplementsSection（emerald）同 SkincareSection（blue，帶 index 數字），
// 兩邊視覺完全保留（顏色、strike-through、isNow 強調），純粹將重複 JSX 收埋一個地方
const CHECKLIST_TINTS = {
  emerald: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', strike: '#10b98180' },
  blue: { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a', strike: '#3b82f680', indexText: '#1e40af' },
};

function ChecklistItem({ label, checked, isNow, index, tint = 'emerald', onClick }) {
  const c = CHECKLIST_TINTS[tint];
  return (
    <button onClick={onClick} className="w-full mb-1.5 rounded-xl flex items-center gap-3 py-3 px-4 transition-all active:scale-[0.98]" style={{ background: checked ? c.bg : (isNow ? '#fffbeb' : '#ffffff'), border: `1px solid ${checked ? c.border : (isNow ? '#fbbf24' : '#e7e5e4')}` }}>
      {index !== undefined && (
        <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: checked ? (c.indexText || c.text) : '#a8a29e', fontFamily: 'Georgia, serif', fontWeight: 600 }}>{index}</span>
      )}
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: checked ? c.border : 'transparent', border: checked ? 'none' : '2px solid #d6d3d1' }}>
        {checked && <Check size={14} color="white" strokeWidth={3} />}
      </div>
      <span className="text-base flex-1 text-left" style={{ color: checked ? c.text : '#1c1917', fontWeight: 500, textDecorationLine: checked ? 'line-through' : 'none', textDecorationColor: c.strike }}>{label}</span>
    </button>
  );
}

// ============ Water Tracker（全日 ml，water:YYYY-MM-DD）============

function todayWaterKey(d = new Date()) {
  return WATER_PREFIX + fmtDate(d);
}

/**
 * 飲水追蹤 —— 3 個「今日焦點」mode 都會 mount 呢個 component，Wind-down
 * mode 傳 readOnly 令 +按鈕唔顯示。用返 dateKey state + 60s interval
 * 自己 poll「而家真正嘅日期」有冇轉咗（同 NowCard 一樣嘅 self-correcting
 * 做法），app 開住跨午夜都會自動 reset 去新一日嘅 record，唔使手動 refresh。
 */
function WaterTracker({ goal, readOnly }) {
  const [dateKey, setDateKey] = useState(todayWaterKey());
  const [data, setData] = useState({ total: 0, log: [] });
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await window.storage.get(dateKey).catch(() => null);
        if (cancelled) return;
        setData(r?.value ? JSON.parse(r.value) : { total: 0, log: [] });
      } catch { if (!cancelled) setData({ total: 0, log: [] }); }
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      const k = todayWaterKey();
      setDateKey(prev => (prev === k ? prev : k));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const addWater = async (ml) => {
    if (readOnly || !(ml > 0)) return;
    const now = new Date();
    const entry = { time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, ml };
    const next = { total: data.total + ml, log: [...data.log, entry] };
    setData(next);
    try { await window.storage.set(dateKey, JSON.stringify(next)); } catch (e) {}
  };

  const handleCustomAdd = () => {
    const n = Number(customAmount);
    if (n > 0) { addWater(n); setCustomAmount(''); setShowCustom(false); }
  };

  const pct = goal > 0 ? Math.min(100, (data.total / goal) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">💧</span>
          <span className="text-sm text-stone-900" style={{ fontWeight: 600 }}>飲水</span>
        </div>
        <p className="text-xs text-stone-500" style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-base text-stone-900" style={{ fontWeight: 500 }}>{data.total}</span>
          <span className="mx-1">/</span>{goal} ml
        </p>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden" style={{ marginBottom: readOnly ? 0 : '12px' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: '#0891b2' }} />
      </div>

      {!readOnly && (
        <>
          <div className="flex gap-1.5">
            <button onClick={() => addWater(250)} className="flex-1 py-2 rounded-lg text-xs bg-cyan-50 text-cyan-800 border border-cyan-200 active:scale-95" style={{ fontWeight: 500 }}>+250ml</button>
            <button onClick={() => addWater(500)} className="flex-1 py-2 rounded-lg text-xs bg-cyan-50 text-cyan-800 border border-cyan-200 active:scale-95" style={{ fontWeight: 500 }}>+500ml</button>
            <button onClick={() => setShowCustom(v => !v)} className="flex-1 py-2 rounded-lg text-xs bg-stone-100 text-stone-600 border border-stone-200 active:scale-95" style={{ fontWeight: 500 }}>+自訂</button>
          </div>

          {showCustom && (
            <div className="flex gap-1.5 mt-2">
              <input
                type="number"
                min="1"
                placeholder="ml"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
                autoFocus
              />
              <button onClick={handleCustomAdd} className="px-4 py-2 rounded-lg text-xs text-white bg-stone-900 active:bg-stone-700" style={{ fontWeight: 500 }}>加</button>
              <button onClick={() => { setShowCustom(false); setCustomAmount(''); }} className="px-3 py-2 rounded-lg text-xs text-stone-500 bg-stone-100">取消</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============ Protein Tracker（全日 g，protein:YYYY-MM-DD，UI/UX 跟 WaterTracker 一樣）============

function todayProteinKey(d = new Date()) {
  return PROTEIN_PREFIX + fmtDate(d);
}

function ProteinTracker({ goal, readOnly }) {
  const [dateKey, setDateKey] = useState(todayProteinKey());
  const [data, setData] = useState({ total: 0, log: [] });
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await window.storage.get(dateKey).catch(() => null);
        if (cancelled) return;
        setData(r?.value ? JSON.parse(r.value) : { total: 0, log: [] });
      } catch { if (!cancelled) setData({ total: 0, log: [] }); }
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      const k = todayProteinKey();
      setDateKey(prev => (prev === k ? prev : k));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const addProtein = async (g) => {
    if (readOnly || !(g > 0)) return;
    const now = new Date();
    const entry = { time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, g };
    const next = { total: data.total + g, log: [...data.log, entry] };
    setData(next);
    try { await window.storage.set(dateKey, JSON.stringify(next)); } catch (e) {}
  };

  const handleCustomAdd = () => {
    const n = Number(customAmount);
    if (n > 0) { addProtein(n); setCustomAmount(''); setShowCustom(false); }
  };

  const pct = goal > 0 ? Math.min(100, (data.total / goal) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🍗</span>
          <span className="text-sm text-stone-900" style={{ fontWeight: 600 }}>蛋白質</span>
        </div>
        <p className="text-xs text-stone-500" style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-base text-stone-900" style={{ fontWeight: 500 }}>{data.total}</span>
          <span className="mx-1">/</span>{goal} g
        </p>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden" style={{ marginBottom: readOnly ? 0 : '12px' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: '#f59e0b' }} />
      </div>

      {!readOnly && (
        <>
          <div className="flex gap-1.5">
            <button onClick={() => addProtein(10)} className="flex-1 py-2 rounded-lg text-xs bg-amber-50 text-amber-800 border border-amber-200 active:scale-95" style={{ fontWeight: 500 }}>+10g</button>
            <button onClick={() => addProtein(20)} className="flex-1 py-2 rounded-lg text-xs bg-amber-50 text-amber-800 border border-amber-200 active:scale-95" style={{ fontWeight: 500 }}>+20g</button>
            <button onClick={() => setShowCustom(v => !v)} className="flex-1 py-2 rounded-lg text-xs bg-stone-100 text-stone-600 border border-stone-200 active:scale-95" style={{ fontWeight: 500 }}>+自訂</button>
          </div>

          {showCustom && (
            <div className="flex gap-1.5 mt-2">
              <input
                type="number"
                min="1"
                placeholder="g"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
                autoFocus
              />
              <button onClick={handleCustomAdd} className="px-4 py-2 rounded-lg text-xs text-white bg-stone-900 active:bg-stone-700" style={{ fontWeight: 500 }}>加</button>
              <button onClick={() => { setShowCustom(false); setCustomAmount(''); }} className="px-3 py-2 rounded-lg text-xs text-stone-500 bg-stone-100">取消</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============ Steps Tracker（今日步數達標 checkbox，寫入 health:YYYY-MM-DD 嘅 steps 欄位）============

function StepsTracker({ checked, onToggle, readOnly }) {
  return (
    <button
      onClick={readOnly ? undefined : onToggle}
      disabled={readOnly}
      className="w-full rounded-2xl border p-4 mb-4 flex items-center gap-3 transition-all active:scale-[0.98] disabled:active:scale-100"
      style={{
        background: checked ? '#ecfdf5' : '#ffffff',
        borderColor: checked ? '#10b981' : '#e7e5e4',
      }}
    >
      <span className="text-base">👟</span>
      <span className="flex-1 text-left text-sm text-stone-900" style={{ fontWeight: 600 }}>{STEPS_GOAL.toLocaleString()} 步</span>
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: checked ? '#10b981' : 'transparent', border: checked ? 'none' : '2px solid #d6d3d1' }}>
        {checked && <Check size={14} color="white" strokeWidth={3} />}
      </div>
    </button>
  );
}

// ============ Settings Modal（今日焦點 mode 時間 + 水量／蛋白質目標）============

function SettingsModal({ settings, onSave, onClose }) {
  const [local, setLocal] = useState(settings);

  // 淨係驗證 morningStart < morningEnd（同日先有意義嘅一對）；
  // windDownStart/sleepTarget 刻意唔喺度驗證次序 —— sleepTarget 預設
  // 00:00 本身就係跨咗午夜，倒數計算會自己處理「揀下一個出現嗰個
  // 時間點」，唔需要喺呢度用同日比較去卡佢
  const morningValid = local.morningStart < local.morningEnd;
  const waterGoalValid = Number(local.waterGoal) > 0;
  const proteinGoalValid = Number(local.proteinGoal) > 0;
  const canSave = morningValid && waterGoalValid && proteinGoalValid;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ ...local, waterGoal: Number(local.waterGoal), proteinGoal: Number(local.proteinGoal) });
    onClose();
  };

  return (
    <Modal title="設定" onClose={onClose}>
      <p className="text-xs text-stone-500 italic mb-4 px-1" style={{ fontFamily: 'Georgia, serif' }}>
        「今日焦點」tab 用呢啲時間自動判斷早晨／動態／wind-down mode。
      </p>

      <div className="rounded-xl bg-white border border-stone-200 p-4 mb-3">
        <div className="mb-3">
          <label className="text-xs text-stone-600 mb-1.5 flex items-center gap-1.5">
            <span className="text-base">🌅</span>Morning mode 開始時間
          </label>
          <input
            type="time"
            value={local.morningStart}
            onChange={e => setLocal({ ...local, morningStart: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
          />
        </div>
        <div className="mb-3">
          <label className="text-xs text-stone-600 mb-1.5 flex items-center gap-1.5">
            <span className="text-base">🌅</span>Morning mode 結束時間
          </label>
          <input
            type="time"
            value={local.morningEnd}
            onChange={e => setLocal({ ...local, morningEnd: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
          />
          {!morningValid && (
            <p className="text-[11px] text-red-600 mt-1">結束時間要遲過開始時間</p>
          )}
        </div>
        <div className="mb-3">
          <label className="text-xs text-stone-600 mb-1.5 flex items-center gap-1.5">
            <span className="text-base">🌙</span>Wind-down mode 開始時間
          </label>
          <input
            type="time"
            value={local.windDownStart}
            onChange={e => setLocal({ ...local, windDownStart: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
          />
        </div>
        <div className="mb-3">
          <label className="text-xs text-stone-600 mb-1.5 flex items-center gap-1.5">
            <span className="text-base">💤</span>Sleep target
          </label>
          <input
            type="time"
            value={local.sleepTarget}
            onChange={e => setLocal({ ...local, sleepTarget: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
          />
        </div>
        <div>
          <label className="text-xs text-stone-600 mb-1.5 flex items-center gap-1.5">
            <span className="text-base">💧</span>每日水量目標（ml）
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={local.waterGoal}
            onChange={e => setLocal({ ...local, waterGoal: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
          />
          {!waterGoalValid && (
            <p className="text-[11px] text-red-600 mt-1">要大過 0</p>
          )}
        </div>
        <div className="mt-3">
          <label className="text-xs text-stone-600 mb-1.5 flex items-center gap-1.5">
            <span className="text-base">🍗</span>每日蛋白質目標（g）
          </label>
          <input
            type="number"
            min="0"
            step="10"
            value={local.proteinGoal}
            onChange={e => setLocal({ ...local, proteinGoal: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
          />
          {!proteinGoalValid && (
            <p className="text-[11px] text-red-600 mt-1">要大過 0</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm text-stone-600 bg-stone-100 active:bg-stone-200">取消</button>
        <button onClick={handleSave} disabled={!canSave} className="flex-1 py-2.5 rounded-lg text-sm text-white bg-stone-900 active:bg-stone-700 disabled:opacity-50" style={{ fontWeight: 500 }}>儲存</button>
      </div>
    </Modal>
  );
}

// ============ Backup Modal（匯出／匯入設定）============

function BackupModal({ data, onImport, onClearRecords, onPreviewClearRecords, onClose }) {
  const [mode, setMode] = useState('export'); // export | import | clear
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }

  // 清除記錄嘅 state
  const today = new Date();
  const oneMonthAgo = new Date(today.getTime() - 30 * 86400000);
  const [clearStart, setClearStart] = useState(fmtDate(oneMonthAgo));
  const [clearEnd, setClearEnd] = useState(fmtDate(today));
  const [clearHealth, setClearHealth] = useState(true);
  const [clearWater, setClearWater] = useState(true);
  const [previewCounts, setPreviewCounts] = useState(null); // { health, water } | null
  const [clearing, setClearing] = useState(false);

  // 生成備份字串：版本號 + 時間 + 資料
  const backupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      activities: data.activities,
      template: data.template,
      slots: data.slots,
      skincare: data.skincare,
      skincareTimes: data.skincareTimes,
    },
  };
  const backupText = JSON.stringify(backupData, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(backupText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = backupText;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      document.body.removeChild(ta);
    }
  };

  const handleImport = async () => {
    setStatus(null);
    const text = importText.trim();
    if (!text) {
      setStatus({ type: 'error', msg: '請貼上備份文字' });
      return;
    }
    try {
      const parsed = JSON.parse(text);
      // 支援兩種格式：完整 backup 物件 或者 直接 data 物件
      const src = parsed.data ? parsed.data : parsed;

      // 基本驗證
      const hasValid = src.activities || src.template || src.slots || src.skincare;
      if (!hasValid) {
        setStatus({ type: 'error', msg: '格式唔啱：搵唔到有效設定資料' });
        return;
      }

      if (!confirm('確定匯入？現有嘅設定會被覆蓋（每日記錄唔影響）。')) return;

      await onImport({
        activities: Array.isArray(src.activities) ? src.activities : null,
        template: src.template && typeof src.template === 'object' ? src.template : null,
        slots: Array.isArray(src.slots) ? src.slots : null,
        skincare: src.skincare && typeof src.skincare === 'object' && src.skincare.am && src.skincare.pm ? src.skincare : null,
        skincareTimes: src.skincareTimes && typeof src.skincareTimes === 'object' ? src.skincareTimes : null,
      });

      setStatus({ type: 'success', msg: '匯入成功！' });
      setImportText('');
      setTimeout(() => { onClose(); }, 1200);
    } catch (e) {
      setStatus({ type: 'error', msg: '格式錯誤：唔係有效嘅備份文字' });
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setImportText(text);
    } catch {
      setStatus({ type: 'error', msg: '瀏覽器唔畀讀取剪貼簿，請手動貼上' });
    }
  };

  // 日期範圍驗證：開始 <= 結束、最多一年
  const startDateObj = new Date(clearStart + 'T00:00:00');
  const endDateObj = new Date(clearEnd + 'T00:00:00');
  const rangeOrderValid = !!clearStart && !!clearEnd && endDateObj >= startDateObj;
  const daysSpan = rangeOrderValid ? Math.floor((endDateObj - startDateObj) / 86400000) + 1 : 0;
  const rangeSizeValid = rangeOrderValid && daysSpan <= 366;
  const anyTypeSelected = clearHealth || clearWater;
  const selectedTypes = { health: clearHealth, water: clearWater };

  // 日期範圍／類型一改變，就重新掃描實際符合嘅記錄數量（唔淨係計日曆日數）
  useEffect(() => {
    if (!rangeSizeValid || !anyTypeSelected) { setPreviewCounts(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const counts = await onPreviewClearRecords(startDateObj, endDateObj, { health: clearHealth, water: clearWater });
        if (!cancelled) setPreviewCounts(counts);
      } catch {
        if (!cancelled) setPreviewCounts(null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearStart, clearEnd, clearHealth, clearWater, rangeSizeValid, anyTypeSelected]);

  // 將 { health, water } 計數，砌成「N 日嘅活動記錄 + N 日嘅飲水記錄」呢類句子（只計揀咗嘅類型）
  const recordParts = (counts, unit) => {
    if (!counts) return [];
    const parts = [];
    if (clearHealth) parts.push(`${counts.health} ${unit}活動記錄`);
    if (clearWater) parts.push(`${counts.water} ${unit}飲水記錄`);
    return parts;
  };
  const totalPreview = previewCounts ? (clearHealth ? previewCounts.health : 0) + (clearWater ? previewCounts.water : 0) : 0;
  const canDelete = anyTypeSelected && rangeSizeValid && previewCounts !== null && totalPreview > 0 && !clearing;

  const handleClearRecords = async () => {
    setStatus(null);
    if (!anyTypeSelected) { setStatus({ type: 'error', msg: '請揀返要刪除嘅記錄類型' }); return; }
    if (!rangeOrderValid) { setStatus({ type: 'error', msg: '開始日期唔可以遲過結束日期' }); return; }
    if (!rangeSizeValid) { setStatus({ type: 'error', msg: '日期範圍唔啱，最多一年' }); return; }
    if (!previewCounts || totalPreview === 0) { setStatus({ type: 'error', msg: '呢個範圍內冇紀錄' }); return; }

    const summary = recordParts(previewCounts, '日嘅').join(' + ');
    const confirmMsg = `確定刪除 ${clearStart} 至 ${clearEnd} 嘅記錄？\n\n${summary}\n\n此動作無法還原。\n（活動類別、週計劃、Supp 時段、護膚步驟等設定唔會受影響）`;
    if (!confirm(confirmMsg)) return;

    setClearing(true);
    try {
      const result = await onClearRecords(startDateObj, endDateObj, selectedTypes);
      setStatus({ type: 'success', msg: `已刪除 ${recordParts(result, '條').join(' + ')}` });
      // 刪完之後，將啱啱刪走嗰啲類型嘅 preview 計數歸零，避免顯示舊數字
      setPreviewCounts(prev => ({
        health: clearHealth ? 0 : (prev?.health ?? 0),
        water: clearWater ? 0 : (prev?.water ?? 0),
      }));
    } catch (e) {
      setStatus({ type: 'error', msg: '清除失敗，請再試' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <Modal title="備份與還原" onClose={onClose}>
      {/* Mode switcher */}
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-4">
        <button
          onClick={() => { setMode('export'); setStatus(null); }}
          className="flex-1 py-2 rounded-full text-[13px] transition-all flex items-center justify-center gap-1"
          style={{
            background: mode === 'export' ? 'white' : 'transparent',
            fontWeight: mode === 'export' ? 600 : 400,
            color: mode === 'export' ? '#1c1917' : '#78716c',
            boxShadow: mode === 'export' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Download size={12} />匯出
        </button>
        <button
          onClick={() => { setMode('import'); setStatus(null); }}
          className="flex-1 py-2 rounded-full text-[13px] transition-all flex items-center justify-center gap-1"
          style={{
            background: mode === 'import' ? 'white' : 'transparent',
            fontWeight: mode === 'import' ? 600 : 400,
            color: mode === 'import' ? '#1c1917' : '#78716c',
            boxShadow: mode === 'import' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Upload size={12} />匯入
        </button>
        <button
          onClick={() => { setMode('clear'); setStatus(null); }}
          className="flex-1 py-2 rounded-full text-[13px] transition-all flex items-center justify-center gap-1"
          style={{
            background: mode === 'clear' ? 'white' : 'transparent',
            fontWeight: mode === 'clear' ? 600 : 400,
            color: mode === 'clear' ? '#1c1917' : '#78716c',
            boxShadow: mode === 'clear' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Eraser size={12} />清除
        </button>
      </div>

      {mode === 'export' ? (
        <div>
          <p className="text-xs text-stone-500 italic mb-3 px-1" style={{ fontFamily: 'Georgia, serif' }}>
            將設定 copy 落 WhatsApp 「自己對自己」保存，日後 reset 都可以還原。
          </p>

          {/* Summary */}
          <div className="rounded-xl bg-white border border-stone-200 p-3 mb-3">
            <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">今次匯出包含</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-stone-600">活動類別</span><span className="text-stone-900" style={{ fontWeight: 500 }}>{data.activities.length} 個</span></div>
              <div className="flex justify-between"><span className="text-stone-600">週計劃時段</span><span className="text-stone-900" style={{ fontWeight: 500 }}>{Object.keys(data.template).length} 個</span></div>
              <div className="flex justify-between"><span className="text-stone-600">Supplement 時段</span><span className="text-stone-900" style={{ fontWeight: 500 }}>{data.slots.length} 個</span></div>
              <div className="flex justify-between"><span className="text-stone-600">護膚步驟</span><span className="text-stone-900" style={{ fontWeight: 500 }}>{(data.skincare.am?.length || 0) + (data.skincare.pm?.length || 0)} 個</span></div>
            </div>
          </div>

          {/* Preview */}
          <details className="mb-3">
            <summary className="text-xs text-stone-500 cursor-pointer px-1 italic" style={{ fontFamily: 'Georgia, serif' }}>
              預覽備份文字（可跳過）
            </summary>
            <pre className="mt-2 p-3 rounded-lg bg-stone-100 text-[10px] text-stone-700 overflow-x-auto max-h-40" style={{ fontFamily: 'Courier, monospace' }}>
              {backupText.length > 500 ? backupText.substring(0, 500) + '\n...(共 ' + backupText.length + ' 字元)' : backupText}
            </pre>
          </details>

          <button
            onClick={handleCopy}
            className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ background: copied ? '#10b981' : '#1c1917', color: 'white', fontWeight: 500 }}
          >
            {copied ? <><Check size={16} /><span>已複製！去 WhatsApp 貼上</span></> : <><Copy size={16} /><span>複製備份</span></>}
          </button>

          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-900 leading-relaxed">
              <b>💡 建議做法：</b><br/>
              1. 撳「複製備份」<br/>
              2. 開 WhatsApp / Telegram 「自己對自己」對話<br/>
              3. 貼上 + 加個時間標籤（例如「2026-05 planner backup」）<br/>
              4. 每次改咗設定都重新備份一次
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-stone-500 italic mb-3 px-1" style={{ fontFamily: 'Georgia, serif' }}>
            貼上之前備份嘅文字，還原你嘅設定。
          </p>

          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder='貼上備份文字（以 { 開頭嘅嘢）...'
            className="w-full h-40 px-3 py-2.5 rounded-lg bg-white border border-stone-200 text-xs outline-none focus:border-stone-400 mb-2"
            style={{ fontFamily: 'Courier, monospace', resize: 'vertical' }}
          />

          <button
            onClick={handlePaste}
            className="w-full mb-3 py-2 rounded-lg text-xs text-stone-600 bg-white border border-stone-200 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Copy size={12} />由剪貼簿貼上
          </button>

          {status && (
            <div
              className="mb-3 p-3 rounded-lg text-xs"
              style={{
                background: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: status.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${status.type === 'success' ? '#10b981' : '#ef4444'}30`,
              }}
            >
              {status.type === 'success' ? '✅ ' : '⚠️ '}{status.msg}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-30"
            style={{ background: '#1c1917', color: 'white', fontWeight: 500 }}
          >
            <Upload size={16} />
            <span>還原設定</span>
          </button>

          <div className="mt-4 rounded-xl bg-stone-100 border border-stone-200 p-3">
            <p className="text-xs text-stone-600 leading-relaxed">
              <b>⚠️ 注意：</b> 匯入會**覆蓋**現有嘅活動、Supplement、護膚設定。每日嘅 check 記錄（食咗邊粒 supp、做咗邊個護膚步驟）唔會受影響。
            </p>
          </div>
        </div>
      )}

      {mode === 'clear' && (
        <div>
          <p className="text-xs text-stone-500 italic mb-3 px-1" style={{ fontFamily: 'Georgia, serif' }}>
            揀範圍同類型，刪除每日 check 記錄。設定唔會受影響。
          </p>

          {/* Date pickers */}
          <div className="rounded-xl bg-white border border-stone-200 p-4 mb-3">
            <div className="mb-3">
              <label className="text-[10px] tracking-widest text-stone-500 uppercase block mb-1.5">開始日期</label>
              <input
                type="date"
                value={clearStart}
                onChange={e => { setClearStart(e.target.value); setStatus(null); }}
                max={clearEnd || fmtDate(new Date())}
                className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label className="text-[10px] tracking-widest text-stone-500 uppercase block mb-1.5">結束日期</label>
              <input
                type="date"
                value={clearEnd}
                onChange={e => { setClearEnd(e.target.value); setStatus(null); }}
                min={clearStart}
                className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm outline-none focus:border-stone-400"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
            {!rangeOrderValid && clearStart && clearEnd && (
              <p className="text-xs text-red-600 mt-2">⚠️ 開始日期唔可以遲過結束日期</p>
            )}
          </div>

          {/* Quick range buttons */}
          <div className="mb-3">
            <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2 px-1">快速選擇</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: '最近 7 日', days: 7 },
                { label: '最近 30 日', days: 30 },
                { label: '最近 90 日', days: 90 },
              ].map(preset => (
                <button
                  key={preset.days}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date(end.getTime() - (preset.days - 1) * 86400000);
                    setClearStart(fmtDate(start));
                    setClearEnd(fmtDate(end));
                    setStatus(null);
                  }}
                  className="py-2 px-1 rounded-lg bg-white border border-stone-200 text-xs text-stone-700 active:bg-stone-50 active:scale-95"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Record type checkboxes */}
          <div className="rounded-xl bg-white border border-stone-200 p-4 mb-3">
            <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">記錄類型</p>
            <label className="flex items-center gap-2.5 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={clearHealth}
                onChange={e => { setClearHealth(e.target.checked); setStatus(null); }}
                className="w-4 h-4 rounded accent-stone-900"
              />
              <span className="text-sm text-stone-800">活動完成記錄（Supplement／護膚 check）</span>
            </label>
            <label className="flex items-center gap-2.5 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={clearWater}
                onChange={e => { setClearWater(e.target.checked); setStatus(null); }}
                className="w-4 h-4 rounded accent-stone-900"
              />
              <span className="text-sm text-stone-800">飲水追蹤記錄</span>
            </label>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-white border border-stone-200 p-3 mb-3">
            <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">將會刪除</p>
            {!anyTypeSelected ? (
              <p className="text-sm text-stone-500 italic">請揀返要刪除嘅記錄類型</p>
            ) : !rangeOrderValid ? (
              <p className="text-sm text-stone-500 italic">請揀返有效嘅日期範圍</p>
            ) : !rangeSizeValid ? (
              <p className="text-sm text-red-600">日期範圍最多一年</p>
            ) : previewCounts === null ? (
              <p className="text-sm text-stone-400 italic">計算緊...</p>
            ) : totalPreview === 0 ? (
              <p className="text-sm text-stone-500 italic">呢個範圍內冇紀錄</p>
            ) : (
              <>
                <p className="text-sm text-stone-900" style={{ fontWeight: 500 }}>
                  {recordParts(previewCounts, '日嘅').join(' + ')}
                </p>
                <p className="text-xs text-stone-500 mt-1" style={{ fontFamily: 'Georgia, serif' }}>
                  {clearStart} 至 {clearEnd}
                </p>
              </>
            )}
          </div>

          {status && (
            <div
              className="mb-3 p-3 rounded-lg text-xs"
              style={{
                background: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: status.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${status.type === 'success' ? '#10b981' : '#ef4444'}30`,
              }}
            >
              {status.type === 'success' ? '✅ ' : '⚠️ '}{status.msg}
            </div>
          )}

          <button
            onClick={handleClearRecords}
            disabled={!canDelete}
            className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-30"
            style={{ background: '#dc2626', color: 'white', fontWeight: 500 }}
          >
            <Eraser size={16} />
            <span>{clearing ? '刪除中...' : canDelete ? `確定刪除（${totalPreview}）` : '確定刪除'}</span>
          </button>

          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-900 leading-relaxed">
              <b>ℹ️ 呢個 action 可以清除：</b><br/>
              • 每日 Supplement／護膚 check 記錄（活動完成記錄）<br/>
              • 每日飲水記錄<br/><br/>
              <b>唔會影響：</b>活動類別、週計劃、Supp 時段、護膚步驟等**設定**。
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ============ Now Card（頂部顯示現在 + 下一個時段） ============

function NowCard({ activities, template, todayIdx }) {
  const [now, setNow] = useState(new Date());

  // 每分鐘更新一次
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = now.getHours();
  const { currentAct, nextHour, nextAct } = findCurrentAndNextActivity(activities, template, todayIdx, currentHour);

  const nowMinutes = now.getMinutes();
  const minutesToNext = nextHour !== null ? (nextHour - currentHour) * 60 - nowMinutes : null;

  const timeStr = `${String(currentHour).padStart(2, '0')}:${String(nowMinutes).padStart(2, '0')}`;

  return (
    <div
      className="rounded-2xl mb-4 p-4 border"
      style={{
        background: currentAct
          ? `linear-gradient(135deg, ${currentAct.color}18 0%, ${currentAct.color}08 100%)`
          : '#ffffff',
        borderColor: currentAct ? currentAct.color + '40' : '#e7e5e4',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-stone-500 uppercase mb-0.5">Now</p>
          <p className="text-stone-900 tabular-nums" style={{ fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif', fontSize: '36px', fontWeight: 300, letterSpacing: '-0.02em' }}>
            {timeStr}
          </p>
        </div>
        {currentAct ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentAct.emoji}</span>
            <span className="text-base text-stone-900" style={{ fontWeight: 600 }}>
              {currentAct.label}
            </span>
          </div>
        ) : (
          <span className="text-sm text-stone-400 italic" style={{ fontFamily: 'Georgia, serif' }}>
            未有安排
          </span>
        )}
      </div>

      {nextAct && minutesToNext !== null && (
        <div className="pt-2 border-t border-stone-200/60 flex items-center gap-1.5 text-xs text-stone-600">
          <span className="text-stone-400">下一個 · {minutesToNext} 分鐘後</span>
          <span className="ml-auto flex items-center gap-1">
            <span>{nextAct.emoji}</span>
            <span style={{ fontWeight: 500 }}>{nextAct.label}</span>
          </span>
        </div>
      )}
    </div>
  );
}
