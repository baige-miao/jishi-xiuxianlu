/**
 * 主面板页逻辑
 * 需求覆盖：功能#4 应急任务、功能#5 任务删除、功能#7 用户评级、功能#8 修仙体系、功能#10 每日提醒
 * 订阅消息模板ID需替换为实际申请的模板ID
 *
 * 更新说明：
 * - 移除手动"每日重置"按钮，改为 onShow 自动检查日期并重置
 * - 新增主面板分步引导功能
 * - 修仙模式UI条件渲染（根据 cultivation_enabled）
 * - 右上角新增书本图标进入帮助页面
 * - 评级行点击弹出等级制度详情
 */
const app = getApp();
const { THEME_LIST, getThemeData, applyThemeToSystemBars } = require('../../utils/theme');
const { getRandomQuote, toggleFavorite, isFavorite, getFavoriteIndices, getQuoteByIndex } = require('../../utils/quotes');
const { ACHIEVEMENTS } = require('../../utils/achievements');
const {
  STD_LEVELS, KNOWLEDGE_LEVELS, BODY_LEVELS,
  MENTAL_LEVELS, WILLPOWER_LEVELS, MOOD_LEVELS,
  CULTIVATION_REALMS, USER_RATINGS, MIND_ATTRS,
  getValClass, getValBgClass, getRatingProgress,
} = require('../../utils/levels');

// 奖励对象转显示字符串
function rewardsToStr(rewards) {
  if (!rewards || typeof rewards !== 'object') return '';
  return Object.entries(rewards).map(([k, v]) => v >= 0 ? `${k}+${v}` : `${k}${v}`).join(', ');
}

/**
 * 主面板引导文案库
 * 每个步骤的引导提示文案
 *
 * 引导顺序：先侧边栏（屏幕内），再主内容区（需要滚动），最后底部导航
 * targetId: 需要高亮的元素ID，用于动态定位
 */
const PANEL_GUIDE_TEXTS = [
  {
    step: 1,
    title: '个人信息',
    content: '这里显示你的评级和修仙等级。点击评级可查看等级制度详情。',
    targetId: 'guide-player',
    scrollTo: 0,
  },
  {
    step: 2,
    title: '修仙等级',
    content: '完成任务会获得灵力，灵力足够时可突破修仙境界。',
    targetId: 'guide-cultivation',
    scrollTo: 0,
    cultivationOnly: true,
  },
  {
    step: 3,
    title: '打卡进度',
    content: '这里显示连续打卡天数和每日任务进度。完成所有每日任务即算打卡成功，每日任务会在每天自动重置。',
    targetId: 'guide-daily',
    scrollTo: 200,
  },
  {
    step: 4,
    title: '属性区域',
    content: '这里显示你的各项属性，数值越高代表能力越强。点击卡片可查看详情。',
    targetId: 'guide-attrs',
    scrollTo: 400,
  },
  {
    step: 5,
    title: '任务列表',
    content: '这里显示你的所有任务，点击标签可切换类型，完成按钮可获得属性提升和灵力奖励。',
    targetId: 'guide-tasks',
    scrollTo: 700,
  },
  {
    step: 6,
    title: '快捷操作',
    content: '点击"添加任务"创建新任务。修仙模式下还可以在这里突破境界。右上角📖查看说明。',
    targetId: 'guide-actions',
    scrollTo: 9999,
  },
  {
    step: 7,
    title: '成长记录',
    content: '底部"成长记录"标签可以查看数据统计和活动日志，了解你的成长轨迹。',
    targetId: 'guide-tabbar',
    scrollTo: 9999,
  },
  {
    step: 8,
    title: '休闲娱乐',
    content: '底部"休闲"标签提供各种放松和娱乐功能。',
    targetId: 'guide-tabbar',
    scrollTo: 9999,
  },
  {
    step: 9,
    title: '设置',
    content: '底部"设置"标签可以切换主题、开关修仙模式、重新设置等。引导结束，祝你成长愉快！',
    targetId: 'guide-tabbar',
    scrollTo: 9999,
  },
];

Page({
  data: {
    loading: true,
    submittingTask: false,
    showResultModal: false,
    resultTitle: '',
    resultLines: [],
    panelData: null,
    // 侧边栏
    playerName: '---',
    playerAge: 0,
    lastUpdate: '',
    streak: 0,
    userRating: '平民',
    cultivationDisplay: '凡人',
    spiritStone: 0,
    // 主内容
    dailyPct: 0,
    dailyDone: 0,
    dailyTotal: 0,
    attrGroups: [],
    taskSections: [],
    completedPhase: [],
    // 任务类型切换
    activeTaskType: '每日',
    currentTasks: [],
    // 属性卡片展开状态（同时只能展开一个）
    expandedAttr: '',
    // 属性详情弹窗
    showAttrDetailModal: false,
    attrDetail: null,
    expandedTaskIdx: -1,
    // 任务详情弹窗
    showTaskDetailModal: false,
    taskDetail: null,
    // 属性滑块弹窗
    showAttrSliderModal: false,
    sliderAttrName: '',
    sliderValue: 0,
    // 修仙突破
    breakthrough: null,
    // 每日提醒 需求#10
    reminders: [],
    showRemindersModal: false,
    newReminderTime: '08:00',
    newReminderContent: '',
    // 主题
    theme: 'dark',
    themeClass: '',
    // 添加任务弹窗
    showModal: false,
    typeOptions: ['每日', '特殊', '应急', '阶段'],
    newTask: {
      name: '',
      typeIndex: 0,
      rewardsStr: '',
      desc: '',
    },
    // 添加属性弹窗
    showAttrModal: false,
    submittingAttr: false,
    grpOptions: ['体质', '心境', '学识', '技能', '其它'],
    newAttr: {
      name: '',
      value: 0,
      grpIndex: 0,
    },
    // 修仙模式开关（根据初始化设置决定）
    cultivationEnabled: true,
    // 等级制度弹窗
    showLevelsModal: false,
    levelsTab: 0,
    stdLevels: [],
    knowledgeLevels: [],
    bodyLevels: [],
    mentalLevels: [],
    willpowerLevels: [],
    moodLevels: [],
    cultivationRealms: [],
    userRatings: [],
    // 主面板引导
    showPanelGuide: false,
    panelGuideStep: 0,
    panelGuideTexts: PANEL_GUIDE_TEXTS,
    // 动态高亮框位置
    highlightTop: 0,
    highlightHeight: 0,
    highlightLeft: 0,
    highlightWidth: 0,
    // 动态引导弹窗位置
    tooltipStyle: '',
    // 每日语录弹窗
    showQuoteModal: false,
    quoteData: null,
    quoteMinimized: false,
    quoteIsFavorite: false,
    favoriteCount: 0,
    quoteReopened: false,
    // 收藏列表弹窗
    showFavoritesModal: false,
    favoriteQuotes: [],
    // 成就系统
    achievements: {},
    achievementList: [],
    achievementCategories: [],
    unlockedCount: 0,
    totalAchievements: 0,
    showAchievementsModal: false,
  },

  // 滚动位置标记（操作后刷新时恢复位置）
  _savedScrollTop: 0,
  _needRestoreScroll: false,

  onShow() {
    // 读取主题设置
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);

    // 每次显示页面时检查是否需要初始化
    const setupDone = wx.getStorageSync('setup_done');
    if (!setupDone) {
      // 如果正在进行缓存恢复，等待恢复完成
      if (app.globalData._recovering) {
        app.waitForRecovery().then((recovered) => {
          if (recovered) {
            // 恢复成功，重新执行 onShow
            this.onShow();
          } else {
            wx.redirectTo({ url: '/pages/setup/setup' });
          }
        });
        return;
      }
      wx.redirectTo({ url: '/pages/setup/setup' });
      return;
    }

    // 读取修仙模式开关
    const cultivationEnabled = wx.getStorageSync('cultivation_enabled');
    this.setData({ ...themeData, cultivationEnabled: cultivationEnabled !== false });

    // 自动日期检查：每日任务自动重置
    this._currentDate = this._getTodayDate();
    this._checkAndResetDailyTasks();

    // 定时检测跨天（每60秒检查一次日期变化）
    this._dayCheckTimer = setInterval(() => {
      const today = this._getTodayDate();
      if (today !== this._currentDate) {
        this._currentDate = today;
        wx.setStorageSync('daily_tasks_reset_date', today);
        this._checkAndResetDailyTasks();
      }
    }, 60000);

    // 标记是否需要在数据加载后显示引导
    this._pendingGuideCheck = !wx.getStorageSync('panel_guide_completed');

    // 检查每日语录
    this._checkDailyQuote();
  },

  onHide() {
    if (this._dayCheckTimer) {
      clearInterval(this._dayCheckTimer);
      this._dayCheckTimer = null;
    }
  },

  /**
   * 引导下一步
   */
  nextPanelGuide() {
    const { panelGuideStep, panelGuideTexts, cultivationEnabled } = this.data;
    let nextStep = panelGuideStep + 1;

    // 如果是简洁模式，跳过修仙相关的引导步骤
    if (!cultivationEnabled) {
      while (nextStep <= panelGuideTexts.length) {
        const guideItem = panelGuideTexts[nextStep - 1];
        if (!guideItem.cultivationOnly) break;
        nextStep++;
      }
    }

    if (nextStep > panelGuideTexts.length) {
      // 引导完成
      this._finishPanelGuide();
    } else {
      // 切换到下一步并滚动到对应位置
      this.setData({ panelGuideStep: nextStep });
      this._scrollToGuideTarget(nextStep);
    }
  },

  /**
   * 滚动到引导目标位置
   * @param {number} step - 当前步骤
   */
  _scrollToGuideTarget(step) {
    const guideItem = PANEL_GUIDE_TEXTS[step - 1];
    if (!guideItem) return;

    const scrollTo = guideItem.scrollTo || 0;

    // 滚动到目标位置
    if (scrollTo > 0) {
      wx.pageScrollTo({ scrollTop: scrollTo, duration: 300 });
    } else {
      wx.pageScrollTo({ scrollTop: 0, duration: 300 });
    }

    // 延迟更新高亮框位置，等待滚动完成
    setTimeout(() => {
      if (step <= 6) {
        this._updateHighlightPosition(guideItem.targetId);
      } else {
        // 步骤7-9：Tab栏引导，弹窗固定在底部上方
        this.setData({ tooltipStyle: 'bottom: 280rpx;' });
      }
    }, 350);
  },

  /**
   * 动态更新高亮框位置
   * @param {string} targetId - 目标元素ID
   */
  _updateHighlightPosition(targetId) {
    const query = wx.createSelectorQuery();
    query.select(`#${targetId}`).boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res) => {
      if (res[0]) {
        const rect = res[0];
        const scrollTop = res[1] ? res[1].scrollTop : 0;
        // 计算高亮框位置（相对于视口）
        this.setData({
          highlightTop: rect.top,
          highlightHeight: rect.height,
          highlightLeft: rect.left,
          highlightWidth: rect.width,
        });

        // 根据高亮框位置动态计算引导弹窗位置
        const sysInfo = wx.getSystemInfoSync();
        const windowHeight = sysInfo.windowHeight;
        const highlightBottom = rect.top + rect.height;
        const highlightCenter = rect.top + rect.height / 2;
        let tooltipStyle = '';
        if (highlightCenter < windowHeight / 2) {
          // 高亮在上半部分，弹窗显示在下方
          tooltipStyle = `top: ${highlightBottom + 20}px;`;
        } else {
          // 高亮在下半部分，弹窗显示在上方
          tooltipStyle = `bottom: ${windowHeight - rect.top + 20}px;`;
        }
        this.setData({ tooltipStyle });
      }
    });
  },

  /**
   * 跳过引导
   */
  skipPanelGuide() {
    this._finishPanelGuide();
  },

  /**
   * 完成引导
   */
  _finishPanelGuide() {
    wx.setStorageSync('panel_guide_completed', true);
    this.setData({ showPanelGuide: false, panelGuideStep: 0 });
    wx.pageScrollTo({ scrollTop: 0, duration: 300 });
    // 引导结束后检查每日语录
    this._checkDailyQuote();
  },

  /**
   * 自动检查并重置每日任务
   * 逻辑：获取今日日期，与本地存储的重置日期对比
   * 如果不同，则调用 panel 云函数自动重置每日任务
   */
  _checkAndResetDailyTasks() {
    // 获取今日日期 YYYY-MM-DD 格式
    const today = this._getTodayDate();
    // 获取本地存储的上次重置日期
    const lastResetDate = wx.getStorageSync('daily_tasks_reset_date');

    // 日期不同才加载面板（panel 云函数会自动判断是否需要重置）
    if (today !== lastResetDate) {
      // 更新本地存储的重置日期
      wx.setStorageSync('daily_tasks_reset_date', today);
    }

    // 延迟加载面板数据，避免 setData 过早触发
    this._needRestoreScroll = false;
    setTimeout(() => { this.loadPanel(); }, 100);
  },

  /**
   * 获取今日日期 YYYY-MM-DD 格式
   * @returns {string} 今日日期字符串
   */
  _getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 记录当前滚动位置（在操作前调用）
  _saveScrollPosition() {
    wx.createSelectorQuery().selectViewport().scrollOffset((res) => {
      if (res) {
        this._savedScrollTop = res.scrollTop || 0;
        this._needRestoreScroll = true;
      }
    }).exec();
  },

  // ========== 加载面板数据 ==========
  loadPanel(bypassCache) {
    // 尝试从缓存加载（5分钟内有效），bypassCache=true 时跳过缓存
    if (!bypassCache) {
      const cache = wx.getStorageSync('panel_cache');
      const now = Date.now();
      if (cache && cache.data && (now - cache.ts < 60000)) {
        // 旧缓存没有review_mode字段，强制刷新
        if (cache.data.review_mode === undefined) {
          bypassCache = true;
        } else {
          // 审核模式：缓存里也要处理
          app.globalData.reviewMode = cache.data.review_mode === true;
          this.processPanelData(cache.data);
          this.setData({ loading: false });
          return;
        }
      }
    }

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'panel',
      success: (res) => {
        const data = res.result;
        if (data.needSetup) {
          wx.redirectTo({ url: '/pages/setup/setup' });
          return;
        }
        if (!data.ok) {
          wx.showToast({ title: data.message || '加载失败', icon: 'none' });
          this.setData({ loading: false });
          return;
        }

        // 写入缓存
        wx.setStorageSync('panel_cache', { data: data, ts: Date.now() });

        // 如果今天自动重置了每日任务，显示提示
        if (data.daily_reset && data.daily_reset.milestone) {
          wx.showToast({ title: data.daily_reset.milestone, icon: 'none', duration: 2000 });
        }

        // 审核模式：记录状态，休闲页面自行处理显示
        console.log('[审核开关] review_mode =', data.review_mode);
        app.globalData.reviewMode = data.review_mode === true;

        this.processPanelData(data);
      },
      fail: (err) => {
        console.error('加载面板失败：', err);
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
        this.setData({ loading: false });
      },
    });
  },

  // ========== 处理面板数据 ==========
  processPanelData(data) {
    if (!data) {
      this.setData({ loading: false });
      return;
    }
    try {
    // 缓存八字数据到本地（八字页面使用）
    if (data.bazi && data.bazi.day) {
      wx.setStorageSync('bazi', data.bazi);
    }

    // 侧边栏信息
    const totalAttrSum = data.total_attr_sum || 0;
    const ratingScore = Math.round(data.rating_score || 0);
    const userRating = data.user_rating || '平民';
    const { ratingPct, nextRatingLabel } = getRatingProgress(ratingScore, userRating);

    const sidebarData = {
      playerName: data.player_name,
      playerAge: data.player_age,
      lastUpdate: data.last_update,
      streak: data.streak,
      userRating: userRating,
      totalAttrSum: totalAttrSum,
      ratingScore: ratingScore,
      ratingPct: ratingPct,
      nextRatingLabel: nextRatingLabel,
      cultivationDisplay: data.cultivation ? data.cultivation.display : '凡人',
      spiritStone: data.spirit_stone || 0,
    };

    // 每日进度
    const dailyTotal = data.daily_total || 0;
    const dailyDone = data.daily_done || 0;
    const dailyPct = dailyTotal > 0 ? Math.round(dailyDone / dailyTotal * 100) : 0;

    // 属性分组
    // 上限100的属性：精神、意志力、心情
    const maxAttrs = ['精神', '意志力', '心情', '专注力', '精力'];
    const groups = {};
    for (const a of (data.attrs || [])) {
      if (!groups[a.grp]) groups[a.grp] = [];
      // 计算属性上限和进度百分比
      const maxValue = maxAttrs.includes(a.name) ? 100 : 500;
      const pct = Math.min(a.value / maxValue * 100, 100);
      groups[a.grp].push({
        name: a.name,
        value: a.value,
        grp: a.grp,
        level: a.level,
        valClass: getValClass(a.value),
        valBgClass: getValBgClass(a.value),
        pct: pct,
        maxValue: maxValue,
        isMind: a.grp === '心境',
      });
    }
    const attrGroups = Object.entries(groups).map(([grp, attrs]) => {
      const left = [];
      const right = [];
      attrs.forEach((a, i) => { (i % 2 === 0 ? left : right).push(a); });
      return { grp, left, right };
    });

    // 任务分组
    const typeConfig = {
      '每日': { icon: '📋', cls: 'task-daily' },
      '特殊': { icon: '⚡', cls: 'task-special' },
      '应急': { icon: '🚨', cls: 'task-emergency' },
      '阶段': { icon: '🎯', cls: 'task-phase' },
    };

    const taskSections = [];
    for (const [ttype, config] of Object.entries(typeConfig)) {
      const tasks = ((data.tasks || {})[ttype] || []).map(t => ({
        ...t,
        rewardsStr: rewardsToStr(t.rewards),
      }));
      taskSections.push({
        type: ttype,
        icon: config.icon,
        cls: config.cls,
        label: ttype,
        tasks: tasks,
      });
    }

    // 已完成阶段任务
    const completedPhase = ((data.tasks || {})['阶段_已完成'] || []).map(t => ({
      ...t,
      rewardsStr: rewardsToStr(t.rewards),
    }));

    // 计算当前选中类型的任务列表
    const activeTaskType = this.data.activeTaskType || '每日';
    const currentSection = taskSections.find(s => s.type === activeTaskType);
    const currentTasks = currentSection ? currentSection.tasks : [];

    // 修仙突破信息
    const breakthrough = data.breakthrough || null;

    // 每日提醒
    const reminders = data.reminders || [];

    // 成就系统
    const achievements = data.achievements || {};
    const newAchievements = data.newAchievements || [];
    const cultivationEnabled = this.data.cultivationEnabled;
    const achievementList = ACHIEVEMENTS
      .filter(a => !a.cultivationOnly || cultivationEnabled)
      .map(a => ({
        ...a,
        unlocked: !!achievements[a.id],
        unlockedDate: achievements[a.id] || '',
      }));
    const unlockedCount = achievementList.filter(a => a.unlocked).length;
    const catMap = {};
    for (const a of achievementList) {
      if (!catMap[a.category]) catMap[a.category] = { name: a.category, items: [], unlockedCount: 0 };
      catMap[a.category].items.push(a);
      if (a.unlocked) catMap[a.category].unlockedCount++;
    }
    const achievementCategories = Object.values(catMap);

    this.setData({
      loading: false,
      panelData: true,
      ...sidebarData,
      dailyPct,
      dailyDone,
      dailyTotal,
      attrGroups,
      taskSections,
      completedPhase,
      currentTasks,
      breakthrough,
      reminders,
      achievements,
      achievementList,
      achievementCategories,
      unlockedCount,
      totalAchievements: achievementList.length,
    });

    // 新成就通知
    if (newAchievements.length > 0) {
      newAchievements.forEach(a => {
        wx.showToast({ title: `🏅 ${a.name}`, icon: 'none', duration: 2000 });
      });
    }

    // 有提醒时自动请求订阅授权（每天最多一次）
    if (reminders.length > 0) {
      this._tryAutoSubscribe();
    }

    // 恢复滚动位置
    if (this._needRestoreScroll && this._savedScrollTop > 0) {
      setTimeout(() => {
        wx.pageScrollTo({ scrollTop: this._savedScrollTop, duration: 0 });
        this._needRestoreScroll = false;
      }, 100);
    }

    // 数据加载完毕后触发引导（等待DOM渲染）
    if (this._pendingGuideCheck) {
      this._pendingGuideCheck = false;
      setTimeout(() => {
        this.setData({ showPanelGuide: true, panelGuideStep: 1 });
        this._scrollToGuideTarget(1);
      }, 300);
    }
    } catch (e) {
      console.error('处理面板数据出错：', e);
      this.setData({ loading: false });
    }
  },

  // ========== 完成任务 ==========
  doTask(e) {
    const taskId = e.detail.id;
    const taskName = e.detail.name;

    if (this._doingTask) return;
    this._doingTask = true;

    this._saveScrollPosition();
    wx.showLoading({ title: '处理中...' });

    wx.cloud.callFunction({
      name: 'taskDone',
      data: { task_id: taskId },
      success: (res) => {
        const result = res.result;
        wx.hideLoading();

        if (result.ok) {
          const resultLines = [
            { icon: '✅', text: `${taskName} 完成！`, type: 'title' },
          ];

          if (result.changes && result.changes.length > 0) {
            result.changes.forEach(c => {
              resultLines.push({ icon: '📈', text: c, type: 'change' });
            });
          }

          if (result.levels && result.levels.length > 0) {
            result.levels.forEach(l => {
              resultLines.push({ icon: '🏆', text: `${l.name}: ${l.value} → ${l.level}`, type: 'level' });
            });
          }

          if (result.isEmergencyDeleted) {
            resultLines.push({ icon: '🗑️', text: '应急任务已自动移除', type: 'info' });
          }

          if (this.data.cultivationEnabled) {
            resultLines.push({ icon: '💫', text: `+${result.spiritReward} 灵力`, type: 'spirit' });
            if (result.spiritBonus > 0) {
              resultLines.push({ icon: '🎁', text: `全部完成额外+${result.spiritBonus}`, type: 'spirit' });
            }
          }

          // 新解锁成就
          if (result.newAchievements && result.newAchievements.length > 0) {
            result.newAchievements.forEach(a => {
              resultLines.push({ icon: a.icon, text: `成就解锁：${a.name}`, type: 'level' });
            });
          }

          // 构建属性飞字动画
          const floatItems = [];
          if (result.changes && result.changes.length > 0) {
            result.changes.forEach((c, i) => {
              floatItems.push({
                text: c.replace(/^[^+-]*/, ''),
                left: 100 + Math.random() * 300,
                top: 300 + i * 80 + Math.random() * 60,
                spirit: false,
              });
            });
          }
          if (this.data.cultivationEnabled && result.spiritReward) {
            floatItems.push({
              text: `+${result.spiritReward} 灵力`,
              left: 200 + Math.random() * 200,
              top: 300 + (result.changes ? result.changes.length : 0) * 80,
              spirit: true,
            });
          }

          if (floatItems.length > 0) {
            this.setData({ showAttrFloat: true, attrFloatItems: floatItems });
            setTimeout(() => {
              this.setData({
                showAttrFloat: false,
                showResultModal: true,
                resultTitle: '任务完成',
                resultLines: resultLines,
              });
            }, 1000);
          } else {
            this.setData({
              showResultModal: true,
              resultTitle: '任务完成',
              resultLines: resultLines,
            });
          }
        } else {
          wx.showToast({ title: result.message || '操作失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('完成任务失败：', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this._doingTask = false;
      },
    });
  },

  // ========== 需求#5：删除任务 ==========
  deleteTask(e) {
    const taskId = e.detail.id;
    const taskName = e.detail.name;

    this._saveScrollPosition();
    wx.showModal({
      title: '确认删除',
      content: `确定要删除任务「${taskName}」吗？此操作不可撤销。`,
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'taskDelete',
            data: { task_id: taskId },
            success: (res) => {
              const result = res.result;
              if (result.ok) {
                wx.showToast({ title: '已删除', icon: 'success' });
                this.loadPanel();
              } else {
                wx.showToast({ title: result.message || '删除失败', icon: 'none' });
              }
            },
            fail: () => {
              wx.showToast({ title: '网络错误', icon: 'none' });
            },
          });
        }
      },
    });
  },

  // ========== 子任务切换 ==========
  toggleSubtask(e) {
    const taskId = e.detail.id;
    const subtaskIndex = e.detail.index;

    wx.cloud.callFunction({
      name: 'subtaskToggle',
      data: { task_id: taskId, subtask_index: subtaskIndex },
      success: (res) => {
        const result = res.result;
        if (result.ok) {
          // 更新本地任务数据
          const taskSections = this.data.taskSections.map(section => ({
            ...section,
            tasks: section.tasks.map(t => {
              if (t._id !== taskId) return t;
              return { ...t, subtasks: result.subtasks };
            }),
          }));

          // 更新当前显示的任务列表
          const activeTaskType = this.data.activeTaskType || '每日';
          const currentSection = taskSections.find(s => s.type === activeTaskType);
          const currentTasks = currentSection ? currentSection.tasks : [];

          this.setData({ taskSections, currentTasks });

          // 全部子任务完成时，触发任务完成流程
          if (result.allDone) {
            let taskName = '';
            for (const section of this.data.taskSections) {
              const found = section.tasks.find(t => t._id === taskId);
              if (found) { taskName = found.name; break; }
            }
            setTimeout(() => {
              this.doTask({ detail: { id: taskId, name: taskName } });
            }, 500);
          }
        } else {
          wx.showToast({ title: result.message || '操作失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
    });
  },

  // ========== 修仙突破 需求#8 ==========
  doBreakthrough() {
    const { breakthrough, spiritStone } = this.data;
    if (!breakthrough) {
      wx.showToast({ title: '已达到最高境界', icon: 'none' });
      return;
    }

    this._saveScrollPosition();

    // 先预览成功率
    wx.showLoading({ title: '计算中...' });
    wx.cloud.callFunction({
      name: 'breakthrough',
      data: { preview: true },
      success: (res) => {
        wx.hideLoading();
        const preview = res.result;
        let content = `消耗 ${breakthrough.cost} 灵力突破到${breakthrough.target}\n当前灵力：${spiritStone}`;

        if (preview.isMajor && preview.baseFailRate > 0) {
          const pctBase = Math.round(preview.baseFailRate * 100);
          const pctEff = Math.round(preview.effectiveFailRate * 100);
          content += `\n\n基础失败率：${pctBase}%`;
          if (preview.boostDetails && preview.boostDetails.length > 0) {
            content += '\n成功率加成：';
            for (const b of preview.boostDetails) {
              content += `\n${b.met ? '✅' : '❌'} ${b.desc}${b.met ? ` (-${Math.round(b.boost * 100)}%)` : ''}`;
            }
          }
          content += `\n\n实际失败率：${pctEff}%`;
        }

        wx.showModal({
          title: '修仙突破',
          content,
          confirmText: '突破',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this._executeBreakthrough();
            }
          },
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
    });
  },

  _executeBreakthrough() {
    wx.showLoading({ title: '突破中...' });
    wx.cloud.callFunction({
      name: 'breakthrough',
      success: (res) => {
        wx.hideLoading();
        const result = res.result;
        if (result.ok) {
          if (result.failed || result.isMajor) {
            // 大境界突破：播放渡劫动画
            this.setData({
              showBreakthroughAnim: true,
              breakthroughAnimType: result.failed ? 'fail' : 'success',
              breakthroughFromRealm: result.fromRealm || '',
              breakthroughToRealm: result.toRealm || '',
              breakthroughMessage: result.message || '',
            });
          } else {
            wx.showToast({ title: result.message, icon: 'none', duration: 2000 });
            this.loadPanel();
          }
        } else {
          wx.showToast({ title: result.message || '突破失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
    });
  },

  dismissBreakthroughAnim() {
    this.setData({ showBreakthroughAnim: false });
    this.loadPanel(true);
  },

  // ========== 任务完成结果弹窗 ==========
  closeResultModal() {
    this.setData({ showResultModal: false, resultLines: [] });
    this.loadPanel(true);
    // 完成任务后自动请求订阅消息授权（每天最多一次）
    this._tryAutoSubscribe();
  },

  // 自动请求订阅消息授权
  // skipCheck: true 时每次添加提醒都弹授权；否则每天最多弹一次
  _tryAutoSubscribe(skipCheck) {
    console.log('[订阅] _tryAutoSubscribe called, skipCheck:', skipCheck);
    if (!skipCheck) {
      const reminders = this.data.reminders || [];
      if (reminders.length === 0) {
        console.log('[订阅] 跳过：无提醒');
        return;
      }
      const today = this._getTodayDate();
      const lastSub = wx.getStorageSync('last_subscribe_date');
      if (lastSub === today) {
        console.log('[订阅] 跳过：今天已授权过');
        return;
      }
    }
    console.log('[订阅] 调用 requestSubscribeMessage');
    wx.requestSubscribeMessage({
      tmplIds: ['PysPbrZESgPoWLcrcdqb23o7wiQyrTCuqo6RRbHbV1Y'],
      success: (res) => {
        console.log('[订阅] 成功:', res);
        if (!skipCheck) {
          wx.setStorageSync('last_subscribe_date', this._getTodayDate());
        }
      },
      fail: (err) => {
        console.log('[订阅] 失败:', err);
      },
    });
  },

  // ========== 添加任务弹窗 ==========
  showAddTask() {
    this._saveScrollPosition();
    this.setData({
      showModal: true,
      newTask: { name: '', typeIndex: 0, rewardsStr: '', desc: '' },
    });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  onNewTaskName(e) {
    this.setData({ 'newTask.name': e.detail.value });
  },
  onNewTaskType(e) {
    this.setData({ 'newTask.typeIndex': parseInt(e.detail.value) });
  },
  onNewTaskRewards(e) {
    this.setData({ 'newTask.rewardsStr': e.detail.value });
  },
  onNewTaskDesc(e) {
    this.setData({ 'newTask.desc': e.detail.value });
  },

  // 解析奖励字符串（支持中文逗号和英文逗号）
  parseRewards(str) {
    const rewards = {};
    if (!str || !str.trim()) return rewards;
    // 同时支持中文逗号和英文逗号
    const segments = str.split(/[,，]/);
    for (const seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed) continue;
      // 匹配"属性名+数值"或"属性名-数值"
      const match = trimmed.match(/^(.+?)([+-]\d+)$/);
      if (match) {
        const k = match[1].trim();
        const v = parseInt(match[2]);
        if (k && !isNaN(v) && v !== 0) {
          rewards[k] = v;
        }
      }
    }
    return rewards;
  },

  submitAddTask() {
    if (this.data.submittingTask) return;
    const { newTask, typeOptions } = this.data;
    const name = newTask.name.trim();
    if (!name) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' });
      return;
    }
    if (!newTask.rewardsStr.trim()) {
      wx.showToast({ title: '请输入奖励规则', icon: 'none' });
      return;
    }

    const rewards = this.parseRewards(newTask.rewardsStr);
    if (Object.keys(rewards).length === 0) {
      wx.showToast({ title: '奖励格式错误，如：体质+5，耐力+3', icon: 'none' });
      return;
    }

    this.setData({ submittingTask: true });
    wx.cloud.callFunction({
      name: 'taskAdd',
      data: {
        name: name,
        type: typeOptions[newTask.typeIndex],
        desc: newTask.desc,
        rewards: rewards,
      },
      success: (res) => {
        const result = res.result;
        if (result.ok) {
          wx.showToast({ title: result.message, icon: 'success' });
          this.closeModal();
          this.loadPanel();
        } else {
          wx.showToast({ title: result.message || '添加失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ submittingTask: false });
      },
    });
  },

  // ========== 添加属性弹窗 ==========
  showAddAttr() {
    this.setData({
      showAttrModal: true,
      newAttr: { name: '', value: 0, grpIndex: 0 },
    });
  },

  closeAttrModal() {
    this.setData({ showAttrModal: false });
  },

  onAttrNameInput(e) {
    this.setData({ 'newAttr.name': e.detail.value });
  },

  onAttrValueInput(e) {
    this.setData({ 'newAttr.value': e.detail.value });
  },

  onAttrGrpChange(e) {
    this.setData({ 'newAttr.grpIndex': parseInt(e.detail.value) });
  },

  submitAddAttr() {
    if (this.data.submittingAttr) return;
    const { newAttr, grpOptions } = this.data;
    const name = newAttr.name.trim();
    if (!name) {
      wx.showToast({ title: '请输入属性名称', icon: 'none' });
      return;
    }
    const value = parseInt(newAttr.value) || 0;
    if (value < 0) {
      wx.showToast({ title: '属性值不可为负数', icon: 'none' });
      return;
    }

    this._saveScrollPosition();
    this.setData({ submittingAttr: true });
    wx.cloud.callFunction({
      name: 'attrAdd',
      data: {
        name: name,
        value: value,
        grp: grpOptions[newAttr.grpIndex],
      },
      success: (res) => {
        const result = res.result;
        if (result.ok) {
          wx.showToast({ title: result.message, icon: 'success' });
          this.closeAttrModal();
          this.loadPanel();
        } else {
          wx.showToast({ title: result.message || '添加失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ submittingAttr: false });
      },
    });
  },

  // ========== 重新设置 ==========
  confirmReset() {
    wx.showModal({
      title: '重新设置',
      content: '确定要重新初始化吗？所有数据将丢失！',
      confirmText: '确定',
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('setup_done');
          wx.removeStorageSync('welcome_completed');
          wx.removeStorageSync('guide_completed');
          wx.removeStorageSync('panel_guide_completed');
          wx.removeStorageSync('cultivation_enabled');
          wx.removeStorageSync('daily_tasks_reset_date');
          wx.redirectTo({ url: '/pages/setup/setup' });
        }
      },
    });
  },

  // ========== 需求#10：每日提醒 ==========
  onNewReminderContentInput(e) {
    this.setData({ newReminderContent: e.detail.value });
  },

  onNewReminderTimeChange(e) {
    this.setData({ newReminderTime: e.detail.value });
  },

  // 点击"确认添加"按钮 — 必须在点击事件中调用 requestSubscribeMessage
  confirmAddReminder() {
    if (this._addingReminder) return;
    if (!this.data.newReminderTime) {
      wx.showToast({ title: '请先选择时间', icon: 'none' });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: ['PysPbrZESgPoWLcrcdqb23o7wiQyrTCuqo6RRbHbV1Y'],
      success: (res) => {
        const result = res['PysPbrZESgPoWLcrcdqb23o7wiQyrTCuqo6RRbHbV1Y'];
        if (result === 'accept') {
          this._doAddReminder(this.data.newReminderTime);
        } else {
          wx.showToast({ title: '需要授权推送才能设置提醒', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '授权失败', icon: 'none' });
      },
    });
  },

  _doAddReminder(time) {
    if (this._addingReminder) return;
    this._addingReminder = true;
    const content = this.data.newReminderContent || '快去完成今日任务吧！';
    wx.cloud.callFunction({
      name: 'setReminder',
      data: { reminder_time: time, reminder_content: content },
      success: (res) => {
        const result = res.result;
        if (result.ok) {
          wx.showToast({ title: result.message, icon: 'success' });
          this.setData({ newReminderContent: '', newReminderTime: '08:00' });
          this.loadPanel();
        } else {
          wx.showToast({ title: result.message || '设置失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this._addingReminder = false;
      },
    });
  },

  showRemindersModal() {
    this.setData({ showRemindersModal: true });
  },

  hideRemindersModal() {
    this.setData({ showRemindersModal: false });
  },

  deleteReminder(e) {
    const index = e.currentTarget.dataset.index;
    const reminder = this.data.reminders[index];
    wx.showModal({
      title: '删除提醒',
      content: `确定删除 ${reminder.time} 的提醒？`,
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'deleteReminder',
            data: { index },
            success: (res) => {
              const result = res.result;
              if (result.ok) {
                wx.showToast({ title: result.message, icon: 'success' });
                const reminders = this.data.reminders.filter((_, i) => i !== index);
                this.setData({ reminders });
              } else {
                wx.showToast({ title: result.message || '删除失败', icon: 'none' });
              }
            },
            fail: () => {
              wx.showToast({ title: '网络错误', icon: 'none' });
            },
          });
        }
      },
    });
  },

  // ========== 属性卡片展开/收起 ==========
  /**
   * 切换属性卡片展开/收起状态
   * 同时只能展开一个属性卡片
   * @param {Object} e - 点击事件，包含 data-name 属性名
   */
  toggleAttrCard(e) {
    const attrName = e.currentTarget.dataset.name;
    const expandedAttr = this.data.expandedAttr === attrName ? '' : attrName;
    this.setData({ expandedAttr });
  },

  // ========== 心境属性滑块修改 ==========
  showAttrSlider(e) {
    const attrName = e.currentTarget.dataset.name;
    // 从属性数据中找当前值
    let currentValue = 0;
    for (const group of this.data.attrGroups) {
      const found = (group.left || []).concat(group.right || []).find(a => a.name === attrName);
      if (found) { currentValue = found.value; break; }
    }
    this.setData({
      showAttrSliderModal: true,
      sliderAttrName: attrName,
      sliderValue: currentValue,
    });
  },

  onAttrSliderChange(e) {
    this.setData({ sliderValue: e.detail.value });
  },

  closeAttrSlider() {
    this.setData({ showAttrSliderModal: false });
  },

  submitAttrUpdate() {
    const { sliderAttrName, sliderValue } = this.data;
    this._saveScrollPosition();
    wx.showLoading({ title: '更新中...' });
    wx.cloud.callFunction({
      name: 'attrUpdate',
      data: { name: sliderAttrName, value: sliderValue },
      success: (res) => {
        wx.hideLoading();
        const result = res.result;
        if (result.ok) {
          wx.showToast({ title: '已更新', icon: 'success' });
          this.closeAttrSlider();
          this.loadPanel();
        } else {
          wx.showToast({ title: result.message || '更新失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
    });
  },

  // ========== 任务详情弹窗 ==========
  showTaskDetail(e) {
    const { name, description } = e.detail;
    this.setData({
      showTaskDetailModal: true,
      taskDetail: { name, description: description || '' },
    });
  },

  closeTaskDetail() {
    this.setData({ showTaskDetailModal: false, taskDetail: null });
  },

  // ========== 属性长按删除 ==========
  onAttrLongPress(e) {
    const attrName = e.currentTarget.dataset.name;
    wx.showActionSheet({
      itemList: ['查看详情', '删除属性'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.showAttrDetail(e);
        } else if (res.tapIndex === 1) {
          this._doDeleteAttr(attrName);
        }
      },
    });
  },

  /**
   * 显示属性详情弹窗
   * 展示属性信息和关联的任务
   */
  showAttrDetail(e) {
    const attrName = e.currentTarget.dataset.name;
    const attrGrp = e.currentTarget.dataset.grp;

    // 从当前属性数据中查找属性信息
    let attrInfo = null;
    for (const group of this.data.attrGroups) {
      const found = (group.left || []).concat(group.right || []).find(a => a.name === attrName);
      if (found) {
        attrInfo = found;
        break;
      }
    }
    if (!attrInfo) return;

    // 查找关联任务（奖励中包含该属性的任务）
    const relatedTasks = [];
    for (const section of this.data.taskSections) {
      for (const task of section.tasks) {
        if (task.rewards && task.rewards[attrName]) {
          relatedTasks.push({
            name: task.name,
            type: task.type,
            description: task.description || '',
            delta: task.rewards[attrName],
          });
        }
      }
    }
    // 也检查已完成阶段任务
    for (const task of this.data.completedPhase) {
      if (task.rewards && task.rewards[attrName]) {
        relatedTasks.push({
          name: task.name,
          type: task.type,
          description: task.description || '',
          delta: task.rewards[attrName],
        });
      }
    }

    this.setData({
      showAttrDetailModal: true,
      expandedTaskIdx: -1,
      attrDetail: {
        name: attrInfo.name,
        value: attrInfo.value,
        level: attrInfo.level,
        grp: attrGrp || '',
        maxValue: attrInfo.maxValue,
        pct: attrInfo.pct,
        relatedTasks: relatedTasks,
      },
    });
  },

  closeAttrDetail() {
    this.setData({ showAttrDetailModal: false, attrDetail: null, expandedTaskIdx: -1 });
  },

  /**
   * 切换任务描述展开
   */
  toggleTaskDesc(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ expandedTaskIdx: this.data.expandedTaskIdx === idx ? -1 : idx });
  },

  /**
   * 删除属性（从弹窗调用）
   */
  deleteAttr(e) {
    const attrName = e.currentTarget.dataset.name;
    this._doDeleteAttr(attrName);
  },

  /**
   * 执行删除属性
   */
  _doDeleteAttr(attrName) {
    wx.showModal({
      title: '确认删除',
      content: `确定要删除属性「${attrName}」吗？`,
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          this._saveScrollPosition();
          wx.showLoading({ title: '删除中...' });
          wx.cloud.callFunction({
            name: 'attrDelete',
            data: { name: attrName },
            success: (res) => {
              wx.hideLoading();
              const result = res.result;
              if (result.ok) {
                wx.showToast({ title: '已删除', icon: 'success' });
                this.loadPanel();
              } else {
                wx.showToast({ title: result.message || '删除失败', icon: 'none' });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '网络错误', icon: 'none' });
            },
          });
        }
      },
    });
  },

  // ========== 任务类型切换 ==========
  switchTaskType(e) {
    const type = e.currentTarget.dataset.type;
    const section = this.data.taskSections.find(s => s.type === type);
    const currentTasks = section ? section.tasks : [];
    this.setData({ activeTaskType: type, currentTasks });
  },

  // ========== 等级制度弹窗 ==========
  /**
   * 显示等级制度弹窗
   * 准备等级数据并显示弹窗
   */
  showLevels() {
    // 准备等级数据
    const fmtRange = (item) => item.max === Infinity ? `${item.min}+` : `${item.min}-${item.max}`;
    const stdLevels = STD_LEVELS.map(i => ({ range: fmtRange(i), label: i.label }));
    const knowledgeLevels = KNOWLEDGE_LEVELS.map(i => ({ range: fmtRange(i), label: i.label }));
    const bodyLevels = BODY_LEVELS.map(i => ({ range: fmtRange(i), label: i.label }));
    const mentalLevels = MENTAL_LEVELS.map(i => ({ range: fmtRange(i), label: i.label }));
    const willpowerLevels = WILLPOWER_LEVELS.map(i => ({ range: fmtRange(i), label: i.label }));
    const moodLevels = MOOD_LEVELS.map(i => ({ range: fmtRange(i), label: i.label }));
    const cultivationRealms = CULTIVATION_REALMS.map(r => ({
      name: r.name,
      detail: `${r.layers}层，突破基础消耗 ${r.baseCost} 灵力`,
    }));
    const userRatings = USER_RATINGS.map(i => ({ range: fmtRange(i), label: i.label }));

    this.setData({
      showLevelsModal: true,
      levelsTab: 0,
      stdLevels,
      knowledgeLevels,
      bodyLevels,
      mentalLevels,
      willpowerLevels,
      moodLevels,
      cultivationRealms,
      userRatings,
    });
  },

  /**
   * 关闭等级制度弹窗
   */
  closeLevels() {
    this.setData({ showLevelsModal: false });
  },

  /**
   * 切换等级制度标签页
   * @param {Object} e - 点击事件，包含 data-tab 标签索引
   */
  switchLevelsTab(e) {
    this.setData({ levelsTab: parseInt(e.currentTarget.dataset.tab) });
  },

  // ========== 新功能入口 ==========
  goLiuren() {
    wx.navigateTo({ url: '/pages/liuren/liuren' });
  },

  goCalendar() {
    wx.navigateTo({ url: '/pages/calendar/calendar' });
  },

  /**
   * 跳转到帮助说明页面
   */
  goHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  // ========== 每日语录 ==========
  _checkDailyQuote() {
    const lastDate = wx.getStorageSync('last_quote_date');
    const today = this._getTodayDate();
    const panelGuideCompleted = wx.getStorageSync('panel_guide_completed');
    if (!panelGuideCompleted) return; // 引导未完成不弹

    const favoriteCount = getFavoriteIndices().length;

    if (lastDate !== today) {
      // 今天第一次打开，弹出语录
      const quote = getRandomQuote();
      this.setData({
        showQuoteModal: true,
        quoteData: quote,
        quoteMinimized: false,
        quoteReopened: false,
        quoteIsFavorite: isFavorite(quote.index),
        favoriteCount: favoriteCount,
      });
      wx.setStorageSync('last_quote_date', today);
      wx.setStorageSync('cached_quote', quote);
    } else {
      // 今天已看过，显示收纳状态
      const cachedQuote = wx.getStorageSync('cached_quote');
      if (cachedQuote) {
        this.setData({
          quoteData: cachedQuote,
          quoteMinimized: true,
          quoteIsFavorite: isFavorite(cachedQuote.index),
          favoriteCount: favoriteCount,
        });
      }
    }
  },

  closeQuoteModal() {
    this.setData({ showQuoteModal: false, quoteMinimized: true });
    if (this.data.quoteData) {
      wx.setStorageSync('cached_quote', this.data.quoteData);
    }
  },

  reopenQuote() {
    this.setData({ showQuoteModal: true, quoteMinimized: false, quoteReopened: true });
  },

  // ========== 语录收藏 ==========
  toggleQuoteFavorite() {
    if (!this.data.quoteData) return;
    const updated = toggleFavorite(this.data.quoteData.index);
    this.setData({
      quoteIsFavorite: updated.indexOf(this.data.quoteData.index) >= 0,
      favoriteCount: updated.length,
    });
  },

  showFavorites() {
    const indices = getFavoriteIndices();
    const favoriteQuotes = indices.map(i => getQuoteByIndex(i));
    this.setData({ showFavoritesModal: true, favoriteQuotes: favoriteQuotes });
  },

  hideFavorites() {
    this.setData({ showFavoritesModal: false });
  },

  removeFavorite(e) {
    const index = e.currentTarget.dataset.index;
    const updated = toggleFavorite(index);
    const favoriteQuotes = updated.map(i => getQuoteByIndex(i));
    const quoteIsFavorite = this.data.quoteData ? updated.indexOf(this.data.quoteData.index) >= 0 : false;
    this.setData({
      favoriteQuotes: favoriteQuotes,
      favoriteCount: updated.length,
      quoteIsFavorite: quoteIsFavorite,
    });
  },

  // ========== 成就系统 ==========
  showAchievements() {
    this.setData({ showAchievementsModal: true });
  },

  hideAchievements() {
    this.setData({ showAchievementsModal: false });
  },

  // ========== 主题切换 ==========
  switchTheme() {
    const themeNames = THEME_LIST.map(t => t.name);
    wx.showActionSheet({
      itemList: themeNames,
      success: (res) => {
        const selected = THEME_LIST[res.tapIndex];
        const themeData = getThemeData(selected.key);
        applyThemeToSystemBars(selected.key);
        this.setData(themeData);
        app.globalData.theme = selected.key;
        wx.setStorageSync('theme', selected.key);
        wx.showToast({ title: `已切换为${selected.name}`, icon: 'none' });
      },
    });
  },
});
