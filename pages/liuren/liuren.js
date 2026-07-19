/**
 * 数算工具页面
 * 输入公历日期和时辰，生成三个数字（1-6），供用户自行记录查阅
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');
const { getHourName, getHourRange } = require('../../utils/liuren');
const { solarToLunar } = require('../../utils/lunar');

Page({
  data: {
    themeClass: '',
    // picker 数据
    years: [],
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    days: [],
    hourOptions: [], // ['子 23:00-01:00', '丑 01:00-03:00', ...]
    // 选中值（索引）
    selectedYear: 0,
    selectedMonth: 0,
    selectedDay: 0,
    selectedHour: 0,
    // 农历信息
    lunarInfo: null,
    // 结果
    result: null,
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);

    // 生成年份列表（近10年）
    const now = new Date();
    const curYear = now.getFullYear();
    const years = [];
    for (let y = curYear - 5; y <= curYear + 5; y++) years.push(y);

    // 日期 1-31
    const days = [];
    for (let i = 1; i <= 31; i++) days.push(i);

    // 时辰选项（带时间范围）
    const hourOptions = [];
    for (let i = 0; i < 12; i++) {
      hourOptions.push(getHourName(i) + '时 ' + getHourRange(i));
    }

    // 默认选中当前年月
    const selectedYear = 5; // curYear 在 years 数组中的索引
    const selectedMonth = now.getMonth(); // 0-based
    const selectedDay = now.getDate() - 1; // 0-based

    this.setData({
      ...themeData,
      years,
      days,
      hourOptions,
      selectedYear,
      selectedMonth,
      selectedDay,
    });

    this.updateLunarInfo();
  },

  // 更新农历信息
  updateLunarInfo() {
    const year = this.data.years[this.data.selectedYear];
    const month = this.data.months[this.data.selectedMonth];
    const day = this.data.days[this.data.selectedDay];
    const lunar = solarToLunar(year, month, day);
    this.setData({ lunarInfo: lunar });
  },

  // picker 变更
  onYearChange(e) {
    this.setData({ selectedYear: e.detail.value, result: null });
    this.updateLunarInfo();
  },
  onMonthChange(e) {
    this.setData({ selectedMonth: e.detail.value, result: null });
    this.updateLunarInfo();
  },
  onDayChange(e) {
    this.setData({ selectedDay: e.detail.value, result: null });
    this.updateLunarInfo();
  },
  onHourChange(e) {
    this.setData({ selectedHour: e.detail.value, result: null });
  },

  // 生成数字（基于农历月、日、时辰）
  doGenerate() {
    const { lunarInfo } = this.data;
    if (!lunarInfo) {
      wx.showToast({ title: '请先选择日期', icon: 'none' });
      return;
    }

    const lunarMonth = lunarInfo.monthNum;
    const lunarDay = lunarInfo.dayNum;
    const hourIndex = parseInt(this.data.selectedHour);
    const hourNum = hourIndex + 1; // 子=1, 丑=2, ..., 亥=12

    // 数算规则：月起1，日起月落，时起日落，结果范围 1-6
    const monthNum = ((lunarMonth - 1) % 6) + 1;
    const dayNum = ((monthNum - 1 + lunarDay - 1) % 6) + 1;
    const timeNum = ((dayNum - 1 + hourNum - 1) % 6) + 1;

    this.setData({
      result: {
        monthNum,
        dayNum,
        timeNum,
      },
    });
  },
});
