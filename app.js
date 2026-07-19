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
        env: 'cloud1-d6gcmcrpe466495e6',
        traceUser: true,
      });
    }

    // 读取已保存的主题设置
    this.globalData.theme = wx.getStorageSync('theme') || 'dark';

    // 应用主题到系统栏
    applyThemeToSystemBars(this.globalData.theme);

    // 检查初始化状态并跳转（延到微任务，避免 storage too early）
    Promise.resolve().then(() => this._checkInitStatus());
  },

  /**
   * 检查初始化状态
   * 优先从云端恢复数据，防止清缓存后丢失账号
   */
  _checkInitStatus() {
    const setupDone = wx.getStorageSync('setup_done');

    if (setupDone) {
      // 本地标志完整，直接进主页
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }

    // 本地标志缺失（清缓存/新设备），尝试从云端恢复
    this._recoverFromCloud();
  },

  /**
   * 缓存恢复：调用 panel 云函数检测云端是否有玩家数据
   * 如果有，恢复所有本地标志并跳转主页；否则走正常引导流程
   */
  _recoverFromCloud() {
    this.globalData._recovering = true;
    wx.cloud.callFunction({
      name: 'panel',
      success: (res) => {
        const data = res.result;
        if (data && data.ok) {
          // 云端有数据，恢复所有本地标志
          wx.setStorageSync('setup_done', true);
          wx.setStorageSync('welcome_completed', true);
          wx.setStorageSync('cultivation_enabled', data.cultivation_enabled !== false);
          if (data.bazi) {
            wx.setStorageSync('bazi', data.bazi);
          }
          // 恢复每日任务重置日期
          if (data.last_update) {
            wx.setStorageSync('daily_tasks_reset_date', data.last_update);
          }
          this.globalData._recovering = false;
          this.globalData._recovered = true;
          console.log('[缓存恢复] 云端数据恢复成功');
          // 通知等待中的页面
          if (this.globalData._recoverCallbacks) {
            this.globalData._recoverCallbacks.forEach(cb => cb(true));
            this.globalData._recoverCallbacks = [];
          }
          wx.switchTab({ url: '/pages/index/index' });
        } else {
          // 云端无数据，走正常引导
          console.log('[缓存恢复] 云端无数据，走新用户引导');
          this.globalData._recovering = false;
          this.globalData._recovered = false;
          if (this.globalData._recoverCallbacks) {
            this.globalData._recoverCallbacks.forEach(cb => cb(false));
            this.globalData._recoverCallbacks = [];
          }
          wx.redirectTo({ url: '/pages/welcome/welcome' });
        }
      },
      fail: (err) => {
        // 网络失败，走正常引导
        console.error('[缓存恢复] 云端调用失败:', err);
        this.globalData._recovering = false;
        this.globalData._recovered = false;
        if (this.globalData._recoverCallbacks) {
          this.globalData._recoverCallbacks.forEach(cb => cb(false));
          this.globalData._recoverCallbacks = [];
        }
        wx.redirectTo({ url: '/pages/welcome/welcome' });
      }
    });
  },

  /**
   * 等待缓存恢复完成的 Promise 封装
   * 页面可在 onShow 中调用：await app.waitForRecovery()
   */
  waitForRecovery() {
    return new Promise((resolve) => {
      if (!this.globalData._recovering) {
        resolve(this.globalData._recovered || false);
        return;
      }
      if (!this.globalData._recoverCallbacks) {
        this.globalData._recoverCallbacks = [];
      }
      this.globalData._recoverCallbacks.push(resolve);
    });
  },

  globalData: {
    // 云数据库引用（各页面通过 getApp().db 使用）
    db: null,
    // 玩家基础信息缓存
    playerName: '',
    playerAge: 0,
    // 当前主题（dark/ancient/light/cyber）
    theme: 'dark',
    // 缓存恢复状态
    _recovering: false,
    _recovered: false,
    _recoverCallbacks: [],
    // 审核模式（从云数据库 config.review 读取）
    reviewMode: false,
  }
});
