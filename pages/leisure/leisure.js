/**
 * 休闲页面逻辑
 * 功能：卡片式入口布局，三个功能入口：小六壬占卜、塔罗牌占卜、备忘录
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

Page({
  data: {
    // 主题
    theme: 'dark',
    themeClass: '',
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);
  },

  /**
   * 跳转到小六壬占卜页面
   */
  goLiuren() {
    wx.navigateTo({ url: '/pages/liuren/liuren' });
  },

  /**
   * 跳转到塔罗牌占卜页面
   */
  goTarot() {
    wx.navigateTo({ url: '/pages/tarot/tarot' });
  },

  /**
   * 跳转到八字流日运势页面
   */
  goBazi() {
    wx.navigateTo({ url: '/pages/bazi/bazi' });
  },
});
