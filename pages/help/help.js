/**
 * 帮助说明页面逻辑
 * 功能：详细介绍应用的各项功能和使用方法
 * 包含6个标签页：快速入门、属性系统、任务系统、修仙系统、其他功能、常见问题
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

Page({
  /**
   * 页面数据
   * activeTab: 当前激活的标签页索引（0-5）
   */
  data: {
    activeTab: 0,
    theme: 'dark',
    themeClass: '',
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);
  },

  /**
   * 切换标签页
   * @param {Object} e - 点击事件，包含 data-index 标签索引
   */
  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ activeTab: index });
  },
});
