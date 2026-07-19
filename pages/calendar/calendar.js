/**
 * 打卡日历页面
 * 展示月度打卡记录，支持月份切换
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

Page({
  data: {
    themeClass: '',
    year: 0,
    month: 0,
    monthLabel: '',
    // 日历网格（7列 x 6行）
    weeks: [],
    // 打卡日期集合
    checkinDates: {},
    // 统计
    totalCheckins: 0,
    // 星期标题
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
  },

  onLoad() {
    const now = new Date();
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
    this._loadCalendar();
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);
    // 每次显示刷新数据
    this._loadCheckins();
  },

  // 上个月
  prevMonth() {
    let { year, month } = this.data;
    month--;
    if (month < 1) { month = 12; year--; }
    this.setData({ year, month });
    this._loadCalendar();
  },

  // 下个月
  nextMonth() {
    let { year, month } = this.data;
    month++;
    if (month > 12) { month = 1; year++; }
    this.setData({ year, month });
    this._loadCalendar();
  },

  // 回到本月
  goToday() {
    const now = new Date();
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
    this._loadCalendar();
  },

  // 构建日历网格
  _loadCalendar() {
    const { year, month } = this.data;
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                        '七月', '八月', '九月', '十月', '十一月', '十二月'];
    this.setData({ monthLabel: `${year}年 ${monthNames[month - 1]}` });

    // 本月第一天是星期几
    const firstDay = new Date(year, month - 1, 1).getDay();
    // 本月总天数
    const daysInMonth = new Date(year, month, 0).getDate();

    const weeks = [];
    let currentDay = 1;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        if ((w === 0 && d < firstDay) || currentDay > daysInMonth) {
          week.push({ day: 0, empty: true });
        } else {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
          week.push({
            day: currentDay,
            dateStr: dateStr,
            isToday: dateStr === todayStr,
            isFuture: new Date(dateStr) > today,
            empty: false,
          });
          currentDay++;
        }
      }
      weeks.push(week);
      if (currentDay > daysInMonth) break;
    }

    this.setData({ weeks });
    this._loadCheckins();
  },

  // 加载打卡数据
  _loadCheckins() {
    const { year, month } = this.data;
    wx.cloud.callFunction({
      name: 'getCheckins',
      data: { year, month },
      success: (res) => {
        if (res.result && res.result.ok) {
          const checkinMap = {};
          (res.result.dates || []).forEach(d => { checkinMap[d] = true; });
          this.setData({
            checkinDates: checkinMap,
            totalCheckins: res.result.total,
          });
        }
      },
    });
  },
});
