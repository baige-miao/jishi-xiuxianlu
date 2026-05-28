/**
 * 设置页面逻辑
 * 功能：列表式布局，包含主题切换、修仙模式开关、重新设置、说明页入口
 */
const app = getApp();
const { THEME_LIST, getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

Page({
  data: {
    // 主题
    theme: 'dark',
    themeClass: '',
    currentThemeName: '暗黑主题',
    // 修仙模式开关
    cultivationEnabled: true,
    // 反馈
    showFeedbackModal: false,
    feedbackContent: '',
    feedbackContact: '',
    feedbackSubmitting: false,
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);

    // 获取当前主题名称
    const currentTheme = THEME_LIST.find(t => t.key === app.globalData.theme);
    this.setData({
      currentThemeName: currentTheme ? currentTheme.name : '暗黑主题',
    });

    // 读取修仙模式开关
    const cultivationEnabled = wx.getStorageSync('cultivation_enabled');
    this.setData({ cultivationEnabled: cultivationEnabled !== false });
  },

  /**
   * 显示主题选择器
   * 使用 wx.showActionSheet 弹出选择列表
   */
  showThemePicker() {
    const themeNames = THEME_LIST.map(t => t.name);
    wx.showActionSheet({
      itemList: themeNames,
      success: (res) => {
        const selected = THEME_LIST[res.tapIndex];
        const themeData = getThemeData(selected.key);
        applyThemeToSystemBars(selected.key);
        this.setData({
          ...themeData,
          currentThemeName: selected.name,
        });
        app.globalData.theme = selected.key;
        wx.setStorageSync('theme', selected.key);
        wx.showToast({ title: `已切换为${selected.name}`, icon: 'none' });
      },
    });
  },

  /**
   * 切换修仙模式
   * @param {Object} e - 切换事件，包含 detail.value 是否选中
   */
  toggleCultivation(e) {
    const enabled = e.detail.value;
    this.setData({ cultivationEnabled: enabled });
    wx.setStorageSync('cultivation_enabled', enabled);
    wx.showToast({
      title: enabled ? '已开启修仙模式' : '已关闭修仙模式',
      icon: 'none',
    });
  },

  // ========== 意见反馈 ==========
  showFeedback() {
    this.setData({ showFeedbackModal: true, feedbackContent: '', feedbackContact: '' });
  },

  hideFeedback() {
    this.setData({ showFeedbackModal: false });
  },

  onFeedbackInput(e) {
    this.setData({ feedbackContent: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ feedbackContact: e.detail.value });
  },

  submitFeedback() {
    const { feedbackContent, feedbackContact } = this.data;
    if (!feedbackContent.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' });
      return;
    }

    this.setData({ feedbackSubmitting: true });
    wx.cloud.callFunction({
      name: 'feedback',
      data: {
        content: feedbackContent,
        contact: feedbackContact,
      },
      success: (res) => {
        if (res.result.ok) {
          wx.showToast({ title: '感谢你的反馈！', icon: 'success' });
          this.setData({ showFeedbackModal: false });
        } else {
          wx.showToast({ title: res.result.message || '提交失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      },
      complete: () => {
        this.setData({ feedbackSubmitting: false });
      },
    });
  },

  /**
   * 跳转到帮助说明页面
   */
  goHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  /**
   * 重新设置
   * 二次确认后清除数据并跳转到设置页
   */
  confirmReset() {
    wx.showModal({
      title: '⚠️ 重新设置',
      content: '确定要重新初始化吗？所有数据将丢失，此操作不可撤销！',
      confirmText: '确定重置',
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          // 清除所有本地存储
          wx.removeStorageSync('setup_done');
          wx.removeStorageSync('welcome_completed');
          wx.removeStorageSync('guide_completed');
          wx.removeStorageSync('panel_guide_completed');
          wx.removeStorageSync('cultivation_enabled');
          wx.removeStorageSync('daily_tasks_reset_date');
          // 跳转到设置页
          wx.redirectTo({ url: '/pages/setup/setup' });
        }
      },
    });
  },
});
