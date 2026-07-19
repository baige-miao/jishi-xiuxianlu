/**
 * 休闲页面逻辑
 * 功能：卡片式入口布局，一个功能入口：小六壬文化趣玩
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

Page({
  data: {
    // 主题
    theme: 'dark',
    themeClass: '',
    // 审核模式
    reviewMode: false,
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    const reviewMode = app.globalData.reviewMode === true;
    this.setData({ ...themeData, reviewMode });
  },

  /**
   * 跳转到小六壬文化趣玩页面
   */
  goLiuren() {
    wx.navigateTo({ url: '/pages/liuren/liuren' });
  },

});
