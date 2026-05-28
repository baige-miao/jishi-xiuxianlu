/**
 * 八字流日运势页面
 * 功能：根据用户出生八字，查看流日运势
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

Page({
  data: {
    theme: 'dark',
    themeClass: '',
    loading: true,
    hasBazi: false,
    fortune: null,
  },

  onShow() {
    // 读取主题
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);

    // 读取用户八字
    const bazi = wx.getStorageSync('bazi');
    if (!bazi) {
      this.setData({ hasBazi: false, loading: false });
      return;
    }
    this.setData({ hasBazi: true });

    // 加载今日运势
    this._loadFortune();
  },

  /**
   * 加载运势数据
   */
  _loadFortune() {
    const bazi = wx.getStorageSync('bazi');
    if (!bazi) return;

    this.setData({ loading: true });
    const targetDate = this._formatDate(new Date());

    wx.cloud.callFunction({
      name: 'dailyFortune',
      data: {
        birth_bazi: bazi,
        target_date: targetDate,
      },
      success: (res) => {
        if (res.result && res.result.ok) {
          const d = res.result;

          // 处理各柱数据，过滤掉空的
          const pillars = (d.pillars || []).filter(p => p.bazi).map(p => ({
            name: p.name,
            bazi: p.bazi,
            relation: p.relation,
            xiJi: p.xiJi || '',
            detail: p.detail || '',
          }));

          // 处理宜忌（数组转字符串）
          const yi = (d.yiji && d.yiji.yi) ? d.yiji.yi.join('、') : '';
          const ji = (d.yiji && d.yiji.ji) ? d.yiji.ji.join('、') : '';

          // 吉凶等级 CSS 类
          let luckClass = 'text-dim';
          if (d.luck_level === '大吉') luckClass = 'luck-daji';
          else if (d.luck_level === '吉') luckClass = 'luck-ji';
          else if (d.luck_level === '平') luckClass = 'text-dim';
          else if (d.luck_level === '凶') luckClass = 'luck-xiong';
          else if (d.luck_level === '大凶') luckClass = 'luck-daxiong';

          this.setData({
            fortune: {
              ...d,
              pillars: pillars,
              luckClass: luckClass,
              yi: yi,
              ji: ji,
              wuxingDetail: d.wuxing_detail || '',
              strength: d.strength || '',
              strengthDesc: d.strength_desc || '',
            },
            loading: false,
          });
        } else {
          wx.showToast({ title: res.result ? res.result.message : '获取运势失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('获取运势失败：', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ loading: false });
      },
    });
  },

  /**
   * 格式化日期 YYYY-MM-DD
   */
  _formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },
});
