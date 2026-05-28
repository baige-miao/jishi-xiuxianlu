/**
 * 塔罗牌占卜页面逻辑
 * 功能：支持三种牌阵（单张牌、三张牌、凯尔特十字）
 *
 * 特性：
 * - Fisher-Yates 洗牌算法
 * - 翻牌动画效果
 * - 正逆位随机判定
 * - 固定牌义文本解读
 * - 支持复制结果
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');
const { SPREADS, drawCards, getSpreadReading } = require('../../utils/tarot');

Page({
  data: {
    // 主题
    theme: 'dark',
    themeClass: '',
    // 牌阵选择
    selectedSpread: '',
    spreadName: '',
    spreadType: '',
    // 问题
    question: '',
    // 是否可以开始占卜（问题不为空）
    canStart: false,
    // 结果展示
    showResult: false,
    drawnCards: [],
    allFlipped: false,
    readingItems: [],
    readingText: '',
  },

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);
  },

  /**
   * 选择牌阵
   * @param {Object} e - 点击事件，包含 data-spread 牌阵类型
   */
  selectSpread(e) {
    const spread = e.currentTarget.dataset.spread;
    const spreadInfo = SPREADS[spread];
    this.setData({
      selectedSpread: spread,
      spreadName: spreadInfo.name,
      spreadType: spread,
    });
  },

  /**
   * 输入问题
   * @param {Object} e - 输入事件
   */
  onQuestionInput(e) {
    const question = e.detail.value;
    // 计算是否可以开始占卜（问题不为空）
    const canStart = question.trim().length > 0;
    this.setData({ question, canStart });
  },

  /**
   * 开始占卜
   * 抽牌并展示结果
   */
  startDivination() {
    const { selectedSpread, question } = this.data;

    if (!question.trim()) {
      wx.showToast({ title: '请输入你的问题', icon: 'none' });
      return;
    }

    const spread = SPREADS[selectedSpread];
    if (!spread) {
      wx.showToast({ title: '请选择牌阵', icon: 'none' });
      return;
    }

    // 抽牌
    const cards = drawCards(spread.count);

    // 添加位置信息和翻牌状态
    const drawnCards = cards.map((card, index) => ({
      ...card,
      positionName: spread.positions[index].name,
      positionDesc: spread.positions[index].description,
      flipped: false,
    }));

    // 准备解读数据
    const readingItems = drawnCards.map(card => ({
      position: card.positionName,
      positionDesc: card.positionDesc,
      icon: card.icon,
      name: card.name,
      orientation: card.isReversed ? '逆位' : '正位',
      meaning: card.isReversed ? card.reversed : card.upright,
    }));

    // 生成完整解读文本
    const readingText = getSpreadReading(drawnCards, selectedSpread);

    this.setData({
      showResult: true,
      drawnCards,
      readingItems,
      readingText,
      allFlipped: false,
    });

    // 提示用户点击翻牌
    wx.showToast({ title: '点击牌面翻开', icon: 'none', duration: 2000 });
  },

  /**
   * 翻牌
   * @param {Object} e - 点击事件，包含 data-index 牌的索引
   */
  flipCard(e) {
    const index = e.currentTarget.dataset.index;
    const { drawnCards } = this.data;

    // 如果已经翻过，不做处理
    if (drawnCards[index].flipped) return;

    // 翻开这张牌
    const key = `drawnCards[${index}].flipped`;
    this.setData({ [key]: true });

    // 检查是否所有牌都翻开了
    const allFlipped = drawnCards.every((card, i) =>
      i === index ? true : card.flipped
    );

    if (allFlipped) {
      this.setData({ allFlipped: true });
      wx.showToast({ title: '所有牌已翻开，查看解读', icon: 'none' });
    }
  },

  /**
   * 复制结果
   * 将解读文本复制到剪贴板
   */
  copyResult() {
    const { readingText, question, spreadName } = this.data;

    // 构建完整的复制文本
    let copyText = `🔮 塔罗牌占卜结果\n`;
    copyText += `牌阵：${spreadName}\n`;
    if (question) {
      copyText += `问题：${question}\n`;
    }
    copyText += `\n${readingText}`;

    wx.setClipboardData({
      data: copyText,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
      },
    });
  },

  /**
   * 重新占卜
   * 重置所有状态
   */
  resetDivination() {
    this.setData({
      selectedSpread: '',
      spreadName: '',
      spreadType: '',
      question: '',
      showResult: false,
      drawnCards: [],
      allFlipped: false,
      readingItems: [],
      readingText: '',
    });
  },
});
