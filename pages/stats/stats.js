/**
 * 数据统计页逻辑 - 需求#9
 * 本周/本月完成任务数、属性增长曲线、最常完成任务TOP5、灵气累计获取量
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');
const { getRatingProgress } = require('../../utils/levels');

Page({
  data: {
    loading: true,
    weekCount: 0,
    monthCount: 0,
    spiritStone: 0,
    totalSpiritEarned: 0,
    top5: [],
    attrGrowth7: [],
    attrGrowth30: [],
    totalAttrSum: 0,
    userRating: '平民',
    ratingPct: 0,
    nextRatingLabel: '',
    ratingTiers: [],
    theme: 'dark',
    themeClass: '',
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);
    this.loadStats();
  },

  loadStats() {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getStats',
      success: (res) => {
        const data = res.result;
        if (data.ok) {
          // 处理TOP5数据（计算百分比）
          const top5 = (data.top5 || []).map((item, index) => ({
            ...item,
            pct: data.top5[0] ? Math.round(item.count / data.top5[0].count * 100) : 0,
          }));

          // 处理7天增长曲线
          const attrGrowth7 = this.processGrowthData(data.attrGrowth7 || []);
          // 处理30天增长曲线
          const attrGrowth30 = this.processGrowthData(data.attrGrowth30 || []);

          // 评级进度
          const totalAttrSum = data.totalAttrSum || 0;
          const userRating = data.user_rating || data.userRating || '平民';
          const { ratingPct, nextRatingLabel, ratingTiers } = getRatingProgress(totalAttrSum, userRating);

          this.setData({
            loading: false,
            weekCount: data.weekCount || 0,
            monthCount: data.monthCount || 0,
            spiritStone: data.spirit_stone || 0,
            totalSpiritEarned: data.totalSpiritEarned || 0,
            top5: top5,
            attrGrowth7: attrGrowth7,
            attrGrowth30: attrGrowth30,
            totalAttrSum: totalAttrSum,
            userRating: userRating,
            ratingPct: ratingPct,
            nextRatingLabel: nextRatingLabel,
            ratingTiers: ratingTiers,
          });
        } else {
          wx.showToast({ title: data.message || '加载失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('获取统计失败：', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ loading: false });
      },
    });
  },

  /**
   * 处理增长曲线数据
   * 计算柱状图高度百分比和短日期
   */
  processGrowthData(data) {
    if (!data || data.length === 0) return [];

    // 找到最大值用于计算百分比
    const maxVal = Math.max(...data.map(d => Math.abs(d.totalChange)), 1);

    return data.map(item => {
      const date = item.date;
      const shortDate = date.slice(5); // MM-DD
      const barHeight = Math.max(5, Math.round(Math.abs(item.totalChange) / maxVal * 100));
      return {
        date,
        shortDate,
        totalChange: item.totalChange,
        barHeight,
      };
    });
  },
});
