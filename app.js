/**
 * 记事修仙录 - 微信小程序版
 * 小程序入口文件
 *
 * 页面流程说明：
 * 1. 首次打开 → 欢迎页（welcome）→ 设置页（setup）→ 主页（index）
 * 2. 再次打开（已完成初始化）→ 主页（index）
 * 3. 再次打开（已完成欢迎页但未初始化）→ 设置页（setup）
 */
const { applyThemeToSystemBars } = require('./utils/theme');

App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // 替换为你的云开发环境ID
        env: 'your-cloud-env-id', // 替换为你的云开发环境ID
        traceUser: true,
      });
    }

    // 读取已保存的主题设置
    this.globalData.theme = wx.getStorageSync('theme') || 'dark';

    // 应用主题到系统栏
    applyThemeToSystemBars(this.globalData.theme);

    // 检查初始化状态并跳转
    this._checkInitStatus();
  },

  /**
   * 检查初始化状态
   * 根据 welcome_completed 和 setup_done 决定跳转目标
   */
  _checkInitStatus() {
    const welcomeCompleted = wx.getStorageSync('welcome_completed');
    const setupDone = wx.getStorageSync('setup_done');

    if (setupDone) {
      // 已完成初始化，跳转到主页
      wx.switchTab({ url: '/pages/index/index' });
    } else if (!welcomeCompleted) {
      // 未完成欢迎页，跳转到欢迎页
      wx.redirectTo({ url: '/pages/welcome/welcome' });
    } else {
      // 已完成欢迎页但未初始化，跳转到设置页
      wx.redirectTo({ url: '/pages/setup/setup' });
    }
  },

  globalData: {
    // 云数据库引用（各页面通过 getApp().db 使用）
    db: null,
    // 玩家基础信息缓存
    playerName: '',
    playerAge: 0,
    // 当前主题（dark/ancient/light/cyber）
    theme: 'dark',
  }
});
