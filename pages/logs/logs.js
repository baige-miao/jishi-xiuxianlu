/**
 * 日志页逻辑
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

Page({
  data: {
    loading: true,
    logs: [],
    groupedLogs: [],
    theme: 'dark',
    themeClass: '',
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);
    this.loadLogs();
  },

  loadLogs() {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getLogs',
      data: { days: 7 },
      success: (res) => {
        const data = res.result;
        if (data.ok) {
          const logs = data.logs || [];
          const groupedLogs = this.groupByDate(logs);
          this.setData({ logs, groupedLogs, loading: false });
        } else {
          wx.showToast({ title: data.message || '加载失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('获取日志失败：', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ loading: false });
      },
    });
  },

  // 按日期分组
  groupByDate(logs) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const grouped = {};

    for (const log of logs) {
      if (!grouped[log.date]) {
        grouped[log.date] = [];
      }
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
