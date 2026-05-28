/**
 * 欢迎页面逻辑
 * 功能：首次打开小程序时显示，介绍应用核心功能
 * 触发条件：用户未完成初始化且未跳过欢迎页
 *
 * 本地存储说明：
 * - welcome_completed: 标记用户是否已完成欢迎页（点击开始使用或跳过）
 * - setup_done: 标记用户是否已完成初始化设置
 */
const { applyThemeToSystemBars } = require('../../utils/theme');

Page({
  /**
   * 页面数据
   */
  data: {},

  /**
   * 页面显示时检查是否需要显示欢迎页
   * 如果用户已完成欢迎页，则直接跳转到设置页
   */
  onShow() {
    applyThemeToSystemBars('dark');
    // 检查用户是否已完成欢迎页
    const welcomeCompleted = wx.getStorageSync('welcome_completed');
    if (welcomeCompleted) {
      // 已完成欢迎页，检查是否完成初始化
      const setupDone = wx.getStorageSync('setup_done');
      if (setupDone) {
        // 已完成初始化，跳转到主页
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        // 未完成初始化，跳转到设置页
        wx.redirectTo({ url: '/pages/setup/setup' });
      }
    }
  },

  /**
   * 点击"开始使用"按钮
   * 标记欢迎页已完成，然后跳转到设置页
   */
  onStart() {
    // 标记欢迎页已完成
    wx.setStorageSync('welcome_completed', true);
    // 跳转到设置页
    wx.redirectTo({ url: '/pages/setup/setup' });
  },

  /**
   * 点击"跳过"按钮
   * 标记欢迎页已完成，然后跳转到设置页
   */
  onSkip() {
    // 标记欢迎页已完成
    wx.setStorageSync('welcome_completed', true);
    // 跳转到设置页
    wx.redirectTo({ url: '/pages/setup/setup' });
  },
});
