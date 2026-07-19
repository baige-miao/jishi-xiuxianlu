/**
 * 生活页面逻辑
 * 整合日记、统计和日志功能
 *
 * 功能说明：
 * - 日记标签：日期导航、心情/天气选择、自动摘要、手动编辑、往期日记
 * - 统计标签：本周/月完成任务数、属性增长曲线、TOP5、灵力累计、用户评级进度
 * - 日志标签：按日期分组的任务完成记录
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

const { getRatingProgress } = require('../../utils/levels');

Page({
  data: {
    // 当前标签页（diary/stats/logs）
    activeTab: 'diary',
    // 修仙模式开关
    cultivationEnabled: false,
    // ===== 日记数据 =====
    currentDate: '',
    currentDateStr: '',
    diaryDay: '',
    isToday: true,
    diaryContent: '',
    diaryMood: '',
    diaryWeather: '',
    autoSummary: '',
    // 编辑器
    showEditor: false,
    editorContent: '',
    saveStatus: '',
    // 书架
    bookVolumes: [],
    loadingBooks: false,
    liftingBook: '',
    readingReady: false,
    readingTitle: '',
    flipIndex: 0,
    flipPages: [],
    flipCurrent: null,
    pageDirection: '',
    // 备忘录
    memos: [],
    memoLoading: false,
    memoEditing: false,
    memoEditId: '',
    memoEditTitle: '',
    memoEditContent: '',
    memoSaveStatus: '',
    touchStartX: 0,
    swipedId: '',
    // 心情日历
    moodYear: 0,
    moodMonth: 0,
    moodCalendarDays: [],
    moodSummary: [],
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    // ===== 统计数据 =====
    loadingStats: true,
    weekCount: 0,
    monthCount: 0,
    spiritStone: 0,
    totalSpiritEarned: 0,
    top5: [],
    attrGrowth7: [],
    attrGrowth30: [],
    totalAttrSum: 0,
    userRating: '平民',
    ratingPct: 0,
    nextRatingLabel: '',
    ratingTiers: [],
    // ===== 日志数据 =====
    loadingLogs: true,
    logs: [],
    groupedLogs: [],
    // 主题
    theme: 'dark',
    themeClass: '',
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    const cultivationEnabled = wx.getStorageSync('cultivation_enabled');
    this.setData({ ...themeData, cultivationEnabled: cultivationEnabled !== false });

    if (!this.data.currentDate) {
      this.setData({ currentDate: this._getTodayDate(), isToday: true });
    }
    this._updateDateDisplay();
    this._loadCurrentTabData();
  },

  onUnload() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
  },

  _getTodayDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  _updateDateDisplay() {
    const { currentDate } = this.data;
    if (!currentDate) return;
    const [y, m, d] = currentDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const currentDateStr = `${y}年${m}月${d}日 ${weekdays[date.getDay()]}`;
    const diaryDay = `${m}/${d}`;
    this.setData({ currentDateStr, diaryDay });
  },

  _loadCurrentTabData() {
    const { activeTab } = this.data;
    if (activeTab === 'diary') {
      this.loadDiary();
      this._loadMoodCalendar();
    } else if (activeTab === 'stats') {
      this.loadStats();
    } else if (activeTab === 'logs') {
      this.loadLogs();
    } else if (activeTab === 'book') {
      this._loadAllDiaries();
    }
  },

  // ========== 标签页切换 ==========
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this._loadCurrentTabData();
  },

  // ========== 日记功能 ==========

  // 加载日记
  loadDiary() {
    const { currentDate } = this.data;

    // 加载当日日记
    wx.cloud.callFunction({
      name: 'diary',
      data: { action: 'get', date: currentDate },
      success: (res) => {
        if (res.result.ok) {
          const diary = res.result.diary;
          if (diary) {
            this.setData({
              diaryContent: diary.content || '',
              diaryMood: diary.mood_emoji || '',
              diaryWeather: diary.weather_emoji || '',
            });
          } else {
            this.setData({ diaryContent: '', diaryMood: '', diaryWeather: '' });
          }
        }
      },
    });

    // 加载自动摘要
    wx.cloud.callFunction({
      name: 'diary',
      data: { action: 'getAutoSummary', date: currentDate },
      success: (res) => {
        if (res.result.ok) {
          this.setData({ autoSummary: res.result.summary || '' });
        }
      },
    });

    // 加载备忘录
    this.loadMemos();
  },

  // 日期导航
  prevDay() {
    const d = new Date(this.data.currentDate);
    d.setDate(d.getDate() - 1);
    const newDate = this._formatDate(d);
    const today = this._getTodayDate();
    this.setData({ currentDate: newDate, isToday: newDate === today });
    this._updateDateDisplay();
    this.loadDiary();
  },

  nextDay() {
    const d = new Date(this.data.currentDate);
    d.setDate(d.getDate() + 1);
    const newDate = this._formatDate(d);
    const today = this._getTodayDate();
    if (newDate > today) return;
    this.setData({ currentDate: newDate, isToday: newDate === today });
    this._updateDateDisplay();
    this.loadDiary();
  },

  pickDate() {
    const today = this._getTodayDate();
    wx.showActionSheet({
      itemList: ['今天', '昨天', '前天'],
      success: (res) => {
        const d = new Date();
        d.setDate(d.getDate() - res.tapIndex);
        const newDate = this._formatDate(d);
        this.setData({ currentDate: newDate, isToday: newDate === today });
        this._updateDateDisplay();
        this.loadDiary();
      },
    });
  },

  _formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 心情/天气选择
  selectMood(e) {
    const emoji = e.currentTarget.dataset.emoji;
    const mood = this.data.diaryMood === emoji ? '' : emoji;
    this.setData({ diaryMood: mood });
    this._saveDiary();
  },

  selectWeather(e) {
    const emoji = e.currentTarget.dataset.emoji;
    const weather = this.data.diaryWeather === emoji ? '' : emoji;
    this.setData({ diaryWeather: weather });
    this._saveDiary();
  },

  // 编辑器
  openEditor() {
    this.setData({
      showEditor: true,
      editorContent: this.data.diaryContent,
    });
  },

  closeEditor() {
    this.setData({ showEditor: false });
  },

  onEditorInput(e) {
    this.setData({ editorContent: e.detail.value });
  },

  saveAndClose() {
    this.setData({
      diaryContent: this.data.editorContent,
      showEditor: false,
    });
    this._saveDiary();
  },

  // 保存日记（防抖）
  _saveDiary() {
    // 清除之前的定时器
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }

    this.setData({ saveStatus: '保存中...' });

    this._saveTimer = setTimeout(() => {
      const { currentDate, diaryContent, diaryMood, diaryWeather } = this.data;

      wx.cloud.callFunction({
        name: 'diary',
        data: {
          action: 'save',
          date: currentDate,
          content: diaryContent,
          mood_emoji: diaryMood,
          weather_emoji: diaryWeather,
        },
        success: (res) => {
          if (res.result.ok) {
            this.setData({ saveStatus: '已保存' });
            setTimeout(() => {
              this.setData({ saveStatus: '' });
            }, 1500);
            // 刷新书本数据保持同步
            if (this.data.activeTab === 'book') {
              this._loadAllDiaries();
            }
          } else {
            this.setData({ saveStatus: '保存失败' });
          }
        },
        fail: () => {
          this.setData({ saveStatus: '网络错误' });
        },
      });
    }, 500);
  },

  // ========== 心情日历 ==========
  _loadMoodCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    this.setData({ moodYear: year, moodMonth: month });

    wx.cloud.callFunction({
      name: 'diary',
      data: { action: 'listMood', year, month },
      success: (res) => {
        if (!res.result.ok) return;
        const moods = res.result.moods || [];

        // 构建日期→心情映射
        const moodMap = {};
        moods.forEach(m => { if (m.mood_emoji) moodMap[m.date] = m.mood_emoji; });

        // 生成日历网格
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const startWeekday = firstDay.getDay(); // 0=周日
        const daysInMonth = lastDay.getDate();

        const days = [];
        // 上月填充
        const prevLastDay = new Date(year, month - 1, 0).getDate();
        for (let i = startWeekday - 1; i >= 0; i--) {
          days.push({ date: '', day: prevLastDay - i, isCurrentMonth: false, mood: '', isToday: false });
        }
        // 本月
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          days.push({
            date: dateStr,
            day: d,
            isCurrentMonth: true,
            mood: moodMap[dateStr] || '',
            isToday: dateStr === todayStr,
          });
        }
        // 下月填充（补齐到 6 行 × 7 = 42）
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) {
          days.push({ date: '', day: d, isCurrentMonth: false, mood: '', isToday: false });
        }

        // 心情统计
        const summaryMap = {};
        moods.forEach(m => {
          if (m.mood_emoji) {
            summaryMap[m.mood_emoji] = (summaryMap[m.mood_emoji] || 0) + 1;
          }
        });
        const summary = Object.entries(summaryMap)
          .map(([emoji, count]) => ({ emoji, count }))
          .sort((a, b) => b.count - a.count);

        this.setData({ moodCalendarDays: days, moodSummary: summary });
      },
    });
  },

  // ========== 备忘录功能 ==========
  loadMemos() {
    this.setData({ memoLoading: true });
    wx.cloud.callFunction({
      name: 'memos',
      data: { action: 'list' },
      success: (res) => {
        if (res.result.ok) {
          const memos = res.result.memos.map(m => ({
            ...m,
            preview: (m.content || '').slice(0, 50),
            timeStr: this._formatMemoTime(m.updated_at),
          }));
          this.setData({ memos, memoLoading: false });
        } else {
          this.setData({ memoLoading: false });
        }
      },
      fail: () => {
        this.setData({ memoLoading: false });
      },
    });
  },

  _formatMemoTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  addMemo() {
    this.setData({
      memoEditing: true,
      memoEditId: '',
      memoEditTitle: '',
      memoEditContent: '',
      memoSaveStatus: '',
    });
  },

  editMemo(e) {
    const { id } = e.currentTarget.dataset;
    const memo = this.data.memos.find(m => m._id === id);
    if (!memo) return;
    this.setData({
      memoEditing: true,
      memoEditId: memo._id,
      memoEditTitle: memo.title || '',
      memoEditContent: memo.content || '',
      memoSaveStatus: '',
      swipedId: '',
    });
  },

  deleteMemo(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条备忘录吗？',
      confirmColor: '#ef5350',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'memos',
            data: { action: 'delete', _id: id },
            success: (r) => {
              if (r.result.ok) {
                wx.showToast({ title: '已删除', icon: 'success' });
                this.loadMemos();
              } else {
                wx.showToast({ title: r.result.message || '删除失败', icon: 'none' });
              }
            },
            fail: () => wx.showToast({ title: '网络错误', icon: 'none' }),
          });
        }
      },
    });
  },

  onMemoTitleInput(e) {
    this.setData({ memoEditTitle: e.detail.value });
  },

  onMemoContentInput(e) {
    this.setData({ memoEditContent: e.detail.value });
  },

  _doMemoSave(callback) {
    const { memoEditId, memoEditTitle, memoEditContent } = this.data;
    if (!memoEditTitle.trim() && !memoEditContent.trim()) {
      if (callback) callback();
      return;
    }

    this.setData({ memoSaveStatus: 'saving' });

    const action = memoEditId ? 'update' : 'add';
    const data = { action, title: memoEditTitle, content: memoEditContent };
    if (memoEditId) data._id = memoEditId;

    wx.cloud.callFunction({
      name: 'memos',
      data,
      success: (res) => {
        if (res.result.ok) {
          if (!memoEditId && res.result._id) {
            this.setData({ memoEditId: res.result._id });
          }
          this.setData({ memoSaveStatus: 'saved' });
          if (callback) callback();
        } else {
          this.setData({ memoSaveStatus: '' });
          wx.showToast({ title: res.result.message || '保存失败', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ memoSaveStatus: '' });
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
    });
  },

  saveMemoAndBack() {
    this._doMemoSave(() => {
      this.setData({ memoEditing: false });
      this.loadMemos();
    });
  },

  cancelMemoEdit() {
    const { memoEditTitle, memoEditContent } = this.data;
    if (memoEditTitle.trim() || memoEditContent.trim()) {
      wx.showModal({
        title: '提示',
        content: '是否保存当前编辑？',
        cancelText: '不保存',
        confirmText: '保存',
        success: (res) => {
          if (res.confirm) {
            this.saveMemoAndBack();
          } else {
            this.setData({ memoEditing: false });
            this.loadMemos();
          }
        },
      });
    } else {
      this.setData({ memoEditing: false });
      this.loadMemos();
    }
  },

  onTouchStart(e) {
    this.setData({ touchStartX: e.touches[0].clientX });
  },

  onTouchEnd(e) {
    const { id } = e.currentTarget.dataset;
    const endX = e.changedTouches[0].clientX;
    const diff = this.data.touchStartX - endX;
    if (diff > 80) {
      this.setData({ swipedId: id });
    } else if (diff < -30) {
      this.setData({ swipedId: '' });
    }
  },

  // ========== 书本功能 ==========
  _loadAllDiaries() {
    this.setData({ loadingBooks: true });
    wx.cloud.callFunction({
      name: 'diary',
      data: { action: 'list', limit: 500 },
      success: (res) => {
        if (res.result.ok) {
          const allDiaries = (res.result.diaries || []).filter(d =>
            (d.content && d.content.trim()) || (d.auto_summary && d.auto_summary.trim())
          );
          allDiaries.sort((a, b) => a.date.localeCompare(b.date));
          const colors = ['#00d4aa', '#7b68ee', '#f0c040', '#ff6b6b', '#4ecdc4', '#a55eea', '#3742fa', '#2ed573'];
          const monthMap = new Map();
          for (const d of allDiaries) {
            const ym = (d.date || '').slice(0, 7);
            if (!ym) continue;
            if (!monthMap.has(ym)) monthMap.set(ym, []);
            monthMap.get(ym).push(d);
          }
          const allBooks = [];
          let ci = 0;
          for (const [ym, diaries] of monthMap) {
            const [y, m] = ym.split('-');
            allBooks.push({
              yearMonth: ym,
              year: y,
              label: `${y}年${parseInt(m)}月`,
              shortLabel: `${parseInt(m)}月`,
              count: diaries.length,
              diaries,
              color: colors[ci % colors.length],
            });
            ci++;
          }
          allBooks.reverse();
          const yearMap = new Map();
          for (const book of allBooks) {
            if (!yearMap.has(book.year)) yearMap.set(book.year, []);
            yearMap.get(book.year).push(book);
          }
          const bookVolumes = [];
          for (const [year, books] of yearMap) {
            bookVolumes.push({ year, label: `${year}年`, books });
          }
          this.setData({ bookVolumes, loadingBooks: false });
        } else {
          this.setData({ loadingBooks: false });
        }
      },
      fail: () => {
        this.setData({ loadingBooks: false });
      },
    });
  },

  openReading(e) {
    const month = e.currentTarget.dataset.month;
    let found = null;
    for (const vol of this.data.bookVolumes) {
      const b = vol.books.find(b => b.yearMonth === month);
      if (b) { found = b; break; }
    }
    if (!found) return;

    this.setData({ liftingBook: month });

    const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];
    const pages = found.diaries.map(d => {
      const dp = (d.date || '').split('-');
      let dateInfo = d.date || '';
      if (dp.length === 3) {
        dateInfo += ' 星期' + WEEK_DAYS[new Date(d.date).getDay()];
      }
      const emojis = [d.weather_emoji || '', d.mood_emoji || ''].filter(Boolean).join(' ');
      return { dateInfo, emojis, auto_summary: d.auto_summary || '', content: d.content || '' };
    });

    setTimeout(() => {
      this.setData({
        readingTitle: found.label,
        flipPages: pages,
        flipIndex: 0,
        flipCurrent: pages[0] || null,
        pageDirection: '',
        readingReady: true,
        liftingBook: '',
      });
    }, 500);
  },

  closeReading() {
    this.setData({
      readingReady: false,
      flipIndex: 0,
      flipPages: [],
      flipCurrent: null,
      pageDirection: '',
    });
  },

  flipPage(dir) {
    if (this._isFlipping) return;
    const { flipIndex, flipPages } = this.data;
    const target = flipIndex + dir;
    if (target < 0 || target >= flipPages.length) return;

    this._isFlipping = true;
    const direction = dir > 0 ? 'slide-left' : 'slide-right';
    this.setData({ pageDirection: direction });

    setTimeout(() => {
      this.setData({
        flipIndex: target,
        flipCurrent: flipPages[target],
        pageDirection: '',
      });
      this._isFlipping = false;
    }, 350);
  },

  _readTouchStartX: 0,
  _readTouchStartY: 0,
  _readTouchDir: null,

  onReadTouchStart(e) {
    if (this._isFlipping) return;
    const t = e.touches[0];
    this._readTouchStartX = t.clientX;
    this._readTouchStartY = t.clientY;
    this._readTouchDir = null;
  },

  onReadTouchMove(e) {
    if (this._isFlipping) return;
    const t = e.touches[0];
    const dx = t.clientX - this._readTouchStartX;
    const dy = t.clientY - this._readTouchStartY;
    if (!this._readTouchDir) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      this._readTouchDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
  },

  onReadTouchEnd(e) {
    if (this._isFlipping || this._readTouchDir !== 'h') return;
    const dx = e.changedTouches[0].clientX - this._readTouchStartX;
    if (Math.abs(dx) > 40) {
      this.flipPage(dx < 0 ? 1 : -1);
    }
  },

  // ========== 统计数据加载 ==========
  loadStats() {
    this.setData({ loadingStats: true });

    wx.cloud.callFunction({
      name: 'getStats',
      success: (res) => {
        const data = res.result;
        if (data.ok) {
          const top5 = (data.top5 || []).map((item) => ({
            ...item,
            pct: data.top5[0] ? Math.round(item.count / data.top5[0].count * 100) : 0,
          }));

          const attrGrowth7 = this.processGrowthData(data.attrGrowth7 || []);
          const attrGrowth30 = this.processGrowthData(data.attrGrowth30 || []);

          const ratingScore = data.ratingScore || 0;
          const userRating = data.user_rating || data.userRating || '平民';
          const { ratingPct, nextRatingLabel, ratingTiers } = getRatingProgress(ratingScore, userRating);

          this.setData({
            loadingStats: false,
            weekCount: data.weekCount || 0,
            monthCount: data.monthCount || 0,
            spiritStone: data.spirit_stone || 0,
            totalSpiritEarned: data.totalSpiritEarned || 0,
            top5,
            attrGrowth7,
            attrGrowth30,
            totalAttrSum: data.totalAttrSum || 0,
            userRating,
            ratingPct,
            nextRatingLabel,
            ratingTiers,
          });

          // 绘制折线图（延迟确保 canvas 已渲染）
          setTimeout(() => {
            this._drawLineChart('growthChart7', attrGrowth7);
            this._drawLineChart('growthChart30', attrGrowth30);
          }, 100);
        } else {
          wx.showToast({ title: data.message || '加载失败', icon: 'none' });
          this.setData({ loadingStats: false });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ loadingStats: false });
      },
    });
  },

  processGrowthData(data) {
    if (!data || data.length === 0) return [];
    const maxVal = Math.max(...data.map(d => Math.abs(d.totalChange)), 1);
    return data.map(item => ({
      date: item.date,
      shortDate: item.date.slice(5),
      totalChange: item.totalChange,
      barHeight: Math.max(5, Math.round(Math.abs(item.totalChange) / maxVal * 100)),
    }));
  },

  // Canvas 折线图绘制
  _drawLineChart(canvasId, data) {
    if (!data || data.length === 0) return;
    const query = wx.createSelectorQuery();
    query.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
      if (!res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const width = res[0].width;
      const height = res[0].height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const padding = { top: 30, right: 20, bottom: 10, left: 20 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const values = data.map(d => d.totalChange);
      const minVal = Math.min(...values, 0);
      const maxVal = Math.max(...values, 1);
      const range = maxVal - minVal || 1;
      const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;

      // 网格线
      ctx.strokeStyle = 'rgba(128,128,128,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      // 折线
      const points = data.map((d, i) => ({
        x: padding.left + xStep * i,
        y: padding.top + chartH - ((d.totalChange - minVal) / range) * chartH,
      }));

      // 渐变填充
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(0,212,170,0.3)');
      gradient.addColorStop(1, 'rgba(0,212,170,0.02)');
      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padding.bottom);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // 折线描边
      ctx.beginPath();
      ctx.strokeStyle = '#00d4aa';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      points.forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
      ctx.stroke();

      // 数据点
      const labelInterval = points.length > 15 ? 7 : (points.length > 7 ? 3 : 1);
      points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00d4aa';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 数值标签（密集数据只显示部分）
        if (i % labelInterval === 0 || i === points.length - 1) {
          ctx.fillStyle = '#ccc';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(values[i]), p.x, p.y - 10);
        }
      });
    });
  },

  // ========== 日志数据加载 ==========
  loadLogs() {
    this.setData({ loadingLogs: true });

    wx.cloud.callFunction({
      name: 'getLogs',
      data: { days: 7 },
      success: (res) => {
        const data = res.result;
        if (data.ok) {
          const logs = data.logs || [];
          const groupedLogs = this.groupByDate(logs);
          this.setData({ logs, groupedLogs, loadingLogs: false });
        } else {
          wx.showToast({ title: data.message || '加载失败', icon: 'none' });
          this.setData({ loadingLogs: false });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ loadingLogs: false });
      },
    });
  },

  groupByDate(logs) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const grouped = {};
    for (const log of logs) {
      if (!grouped[log.date]) grouped[log.date] = [];
      grouped[log.date].push({
        task_name: log.task_name,
        changesStr: (log.changes || []).join(', ') || '无属性变化',
      });
    }
    return Object.entries(grouped).map(([date, entries]) => ({
      date,
      entries,
      isToday: date === today,
    }));
  },
});
