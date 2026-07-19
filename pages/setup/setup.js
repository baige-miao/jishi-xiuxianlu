/**
 * 设置页逻辑
 * 需求覆盖：Bug#1 中文逗号分隔兼容、Bug#2 属性负值处理
 *
 * 更新说明：
 * - 新增"选择模式"步骤（修仙模式/简洁模式）
 * - 新增全屏遮罩引导功能（8步引导）
 * - 初始化前默认使用"轻量简约"(light)主题
 */
const app = getApp();
const { THEME_LIST, getThemeData, applyThemeToSystemBars } = require('../../utils/theme');
const { getBazi, getHourPillar } = require('../../utils/bazi');

// 预设模板数据
const PRESETS = {
  student: {
    attrs: [
      { name: '精神', value: 60, grp: '心境' },
      { name: '心情', value: 60, grp: '心境' },
      { name: '意志力', value: 60, grp: '心境' },
      { name: '体质', value: 60, grp: '体质' },
      { name: '耐力', value: 50, grp: '体质' },
      { name: '编程', value: 30, grp: '学识' },
      { name: '跑步', value: 20, grp: '技能' },
    ],
    tasks: [
      { name: '睡满8小时', type: '每日', desc: '保证充足睡眠', rewards: '精神+3，心情+2' },
      { name: '晨跑', type: '每日', desc: '早起晨跑锻炼', rewards: '体质+5，耐力+3' },
      { name: '冥想', type: '每日', desc: '每日冥想放松', rewards: '精神+2，意志力+2' },
      { name: '看书30分钟', type: '每日', desc: '坚持每日阅读', rewards: '编程+3' },
      { name: '月度总结', type: '特殊', desc: '回顾本月成长', rewards: '精神+10，意志力+10' },
      { name: '完成一个小项目', type: '阶段', desc: '独立开发一个小项目', rewards: '编程+50' },
    ],
  },
  fitness: {
    attrs: [
      { name: '体重(kg)', value: 70, grp: '体质' },
      { name: '体脂率(%)', value: 20, grp: '体质' },
      { name: '卧推(kg)', value: 50, grp: '体质' },
      { name: '深蹲(kg)', value: 70, grp: '体质' },
      { name: '硬拉(kg)', value: 80, grp: '体质' },
      { name: '引体向上(个)', value: 5, grp: '体质' },
      { name: '跑步(km)', value: 3, grp: '体质' },
    ],
    tasks: [
      { name: '晨跑5km', type: '每日', desc: '早起跑步', rewards: '跑步(km)+5' },
      { name: '力量训练', type: '每日', desc: '健身房练力量', rewards: '卧推(kg)+2，深蹲(kg)+2' },
      { name: '健康饮食', type: '每日', desc: '控制热量摄入', rewards: '体脂率(%)-1' },
      { name: '月度体测', type: '特殊', desc: '全面身体测试', rewards: '卧推(kg)+10，深蹲(kg)+10' },
    ],
  },
  coder: {
    attrs: [
      { name: '专注力', value: 60, grp: '心境' },
      { name: '精力', value: 55, grp: '心境' },
      { name: 'Python', value: 80, grp: '学识' },
      { name: 'JavaScript', value: 60, grp: '学识' },
      { name: '算法', value: 45, grp: '学识' },
      { name: '系统设计', value: 30, grp: '学识' },
      { name: 'Git', value: 70, grp: '技能' },
    ],
    tasks: [
      { name: '刷LeetCode', type: '每日', desc: '每日一题', rewards: '算法+3' },
      { name: '阅读源码', type: '每日', desc: '读开源项目代码', rewards: 'Python+2，系统设计+3' },
      { name: '写技术博客', type: '每日', desc: '记录学习心得', rewards: '专注力+2' },
      { name: '完成Side Project', type: '阶段', desc: '完成一个个人项目', rewards: 'Python+30，JavaScript+30' },
    ],
  },
};

/**
 * 引导文案库
 * 每个页面步骤对应一个引导提示
 * 引导步骤和页面步骤同步
 */
const GUIDE_TEXTS = {
  1: {
    title: '欢迎来到记事修仙录',
    content: '首先，告诉我们你是谁。输入你的名字、年龄、性别和出生日期，这将用于个性化你的体验。你还可以选择喜欢的主题风格。',
  },
  2: {
    title: '选择你的模式',
    content: '修仙模式会增加境界、灵力等游戏元素，让成长更有趣。简洁模式只保留核心的成长追踪功能。请选择一个模式。',
  },
  3: {
    title: '设定追踪属性',
    content: '属性代表你想要提升的方面，比如体质、学识、技能等。选择一个模板可以快速开始，也可以自定义添加。完成任务后这些属性会自动提升。',
  },
  4: {
    title: '设定任务',
    content: '任务分为四种类型：每日（每天重置）、特殊（一次性）、应急（临时）、阶段（长期目标）。选择模板快速开始，任务的核心是帮你养成好习惯。',
  },
  5: {
    title: '确认并开始',
    content: '确认你的设置无误后，点击完成按钮开始你的成长之旅！底部导航栏有4个标签：面板、成长记录、休闲、设置。',
  },
};

Page({
  data: {
    // 当前步骤（1-5）
    currentStep: 1,
    // 基本信息
    playerName: '',
    playerAge: '',
    // 出生信息
    gender: '',           // 'male' 或 'female'
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHourIndex: -1,   // -1=不知道，0-11=子-亥
    hourOptions: ['不知道', '子时(23-01)', '丑时(01-03)', '寅时(03-05)', '卯时(05-07)', '辰时(07-09)', '巳时(09-11)', '午时(11-13)', '未时(13-15)', '申时(15-17)', '酉时(17-19)', '戌时(19-21)', '亥时(21-23)'],
    // 模式选择（cultivation: 修仙模式, simple: 简洁模式）
    selectedMode: '',
    // 属性列表
    attrs: [],
    // 任务列表
    taskList: [],
    // 分组选项
    grpOptions: ['体质', '心境', '学识', '技能', '其它'],
    // 任务类型选项
    typeOptions: ['每日', '特殊', '应急', '阶段'],
    // 提交状态
    submitting: false,
    // 主题（初始化前默认使用 light 主题）
    theme: 'light',
    themeClass: '',
    themeList: THEME_LIST,
    selectedTheme: 'light',
    // 引导相关（引导步骤和页面步骤同步）
    showGuide: false,
    guideTexts: GUIDE_TEXTS,
  },

  onLoad() {
    // 安全检查：如果云端已有数据，跳回主页防止重复初始化
    wx.cloud.callFunction({
      name: 'panel',
      success: (res) => {
        if (res.result && res.result.ok) {
          // 云端有数据，恢复本地标志并跳转
          wx.setStorageSync('setup_done', true);
          wx.setStorageSync('welcome_completed', true);
          wx.switchTab({ url: '/pages/index/index' });
          return;
        }
      },
    });

    // 初始化前默认使用 light 主题
    applyThemeToSystemBars('light');
    const themeData = getThemeData('light');
    this.setData({ ...themeData, selectedTheme: 'light' });
    // 默认加载学生模板
    this.loadPresetData('student');
    this.loadTaskPresetData('student');

    // 检查是否需要显示引导
    this._checkGuide();
  },

  /**
   * 检查是否需要显示引导
   * 根据 guide_completed 和 guide_version 判断
   */
  _checkGuide() {
    const guideCompleted = wx.getStorageSync('guide_completed');
    const guideVersion = wx.getStorageSync('guide_version');
    // 当前引导版本号，修改此值可重新触发引导
    const currentVersion = 2;

    if (!guideCompleted || guideVersion !== currentVersion) {
      // 需要显示引导
      this.setData({ showGuide: true });
    }
  },

  /**
   * 关闭当前步骤的引导
   * 用户点击"知道了"后关闭引导遮罩，继续操作
   */
  closeGuide() {
    this.setData({ showGuide: false });
  },

  /**
   * 跳过整个引导
   */
  skipGuide() {
    this._finishGuide();
  },

  /**
   * 完成引导
   * 标记引导已完成并记录版本号
   */
  _finishGuide() {
    wx.setStorageSync('guide_completed', true);
    wx.setStorageSync('guide_version', 2);
    this.setData({ showGuide: false });
  },

  /**
   * 切换步骤时显示对应的引导
   * @param {number} step - 当前页面步骤
   */
  _showGuideForStep(step) {
    const guideCompleted = wx.getStorageSync('guide_completed');
    if (!guideCompleted) {
      this.setData({ showGuide: true });
    }
  },

  // ========== 步骤导航 ==========
  nextStep() {
    const { currentStep, playerName, playerAge, gender, birthYear, birthMonth, birthDay, selectedMode, attrs, taskList } = this.data;

    // 步骤1验证：基本信息
    if (currentStep === 1) {
      if (!playerName.trim()) {
        wx.showToast({ title: '请输入你的名字', icon: 'none' });
        return;
      }
      if (!playerAge && playerAge !== 0) {
        wx.showToast({ title: '请输入你的年龄', icon: 'none' });
        return;
      }
      if (!gender) {
        wx.showToast({ title: '请选择性别', icon: 'none' });
        return;
      }
      if (!birthYear || !birthMonth || !birthDay) {
        wx.showToast({ title: '请填写出生年月日', icon: 'none' });
        return;
      }
    }

    // 步骤2验证：模式选择（必须选择一个模式）
    if (currentStep === 2 && !selectedMode) {
      wx.showToast({ title: '请选择一个模式', icon: 'none' });
      return;
    }

    // 步骤3验证：属性设置
    if (currentStep === 3 && attrs.length === 0) {
      wx.showToast({ title: '请至少添加一项属性', icon: 'none' });
      return;
    }

    // 步骤4验证：任务设置
    if (currentStep === 4 && taskList.length === 0) {
      wx.showToast({ title: '请至少添加一条任务', icon: 'none' });
      return;
    }

    const nextStep = currentStep + 1;
    this.setData({ currentStep: nextStep });

    // 切换步骤时显示对应的引导
    this._showGuideForStep(nextStep);
  },

  prevStep() {
    const prevStep = this.data.currentStep - 1;
    this.setData({ currentStep: prevStep });

    // 切换步骤时显示对应的引导
    this._showGuideForStep(prevStep);
  },

  // ========== 主题选择 ==========
  selectTheme(e) {
    const key = e.currentTarget.dataset.key;
    const themeData = getThemeData(key);
    this.setData({ selectedTheme: key, ...themeData });
    // 实时预览：同步更新全局主题
    app.globalData.theme = key;
    wx.setStorageSync('theme', key);
  },

  // ========== 模式选择 ==========
  /**
   * 选择模式（修仙模式或简洁模式）
   * @param {Object} e - 点击事件，包含 data-mode 模式标识
   */
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ selectedMode: mode });
  },

  // ========== 基本信息输入 ==========
  onNameInput(e) {
    this.setData({ playerName: e.detail.value });
  },
  onAgeInput(e) {
    this.setData({ playerAge: parseInt(e.detail.value) || 18 });
  },

  // ========== 出生信息 ==========
  onGenderSelect(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({ gender });
  },

  onBirthYearInput(e) {
    this.setData({ birthYear: e.detail.value });
  },

  onBirthMonthInput(e) {
    this.setData({ birthMonth: e.detail.value });
  },

  onBirthDayInput(e) {
    this.setData({ birthDay: e.detail.value });
  },

  onBirthHourChange(e) {
    // picker value 是数组索引，hourOptions[0]='不知道'，所以需要 -1
    const pickerIndex = parseInt(e.detail.value);
    const birthHourIndex = pickerIndex - 1; // -1=不知道，0-11=时辰
    this.setData({ birthHourIndex });
  },

  // ========== 属性编辑 ==========
  addAttr() {
    const attrs = this.data.attrs;
    attrs.push({ name: '', value: 0, grpIndex: 0 });
    this.setData({ attrs });
  },

  removeAttr(e) {
    const idx = e.currentTarget.dataset.index;
    const attrs = this.data.attrs;
    attrs.splice(idx, 1);
    this.setData({ attrs });
  },

  onAttrName(e) {
    const idx = e.currentTarget.dataset.index;
    const attrs = this.data.attrs;
    attrs[idx].name = e.detail.value;
    this.setData({ attrs });
  },

  onAttrValue(e) {
    const idx = e.currentTarget.dataset.index;
    const attrs = this.data.attrs;
    let val = parseInt(e.detail.value) || 0;
    // Bug#2：属性负值处理
    if (val < 0) {
      val = 0;
      wx.showToast({ title: '属性值不可为负数，已自动设为0', icon: 'none', duration: 2000 });
    }
    attrs[idx].value = val;
    this.setData({ attrs });
  },

  onAttrGrp(e) {
    const idx = e.currentTarget.dataset.index;
    const attrs = this.data.attrs;
    attrs[idx].grpIndex = parseInt(e.detail.value);
    this.setData({ attrs });
  },

  // ========== 任务编辑 ==========
  addTask() {
    const taskList = this.data.taskList;
    taskList.push({ name: '', typeIndex: 0, rewardsStr: '', desc: '' });
    this.setData({ taskList });
  },

  removeTask(e) {
    const idx = e.currentTarget.dataset.index;
    const taskList = this.data.taskList;
    taskList.splice(idx, 1);
    this.setData({ taskList });
  },

  onTaskName(e) {
    const idx = e.currentTarget.dataset.index;
    const taskList = this.data.taskList;
    taskList[idx].name = e.detail.value;
    this.setData({ taskList });
  },

  onTaskType(e) {
    const idx = e.currentTarget.dataset.index;
    const taskList = this.data.taskList;
    taskList[idx].typeIndex = parseInt(e.detail.value);
    this.setData({ taskList });
  },

  onTaskRewards(e) {
    const idx = e.currentTarget.dataset.index;
    const taskList = this.data.taskList;
    taskList[idx].rewardsStr = e.detail.value;
    this.setData({ taskList });
  },

  onTaskDesc(e) {
    const idx = e.currentTarget.dataset.index;
    const taskList = this.data.taskList;
    taskList[idx].desc = e.detail.value;
    this.setData({ taskList });
  },

  // ========== 预设模板 ==========
  loadPreset(e) {
    const key = e.currentTarget.dataset.key;
    this.loadPresetData(key);
  },

  loadPresetData(key) {
    if (key === 'empty') {
      this.setData({ attrs: [] });
      return;
    }
    const preset = PRESETS[key];
    if (!preset) return;
    const grpOptions = this.data.grpOptions;
    const attrs = preset.attrs.map(a => ({
      name: a.name,
      value: a.value,
      grpIndex: grpOptions.indexOf(a.grp) >= 0 ? grpOptions.indexOf(a.grp) : 3,
    }));
    this.setData({ attrs });
  },

  loadTaskPreset(e) {
    const key = e.currentTarget.dataset.key;
    this.loadTaskPresetData(key);
  },

  loadTaskPresetData(key) {
    if (key === 'empty') {
      this.setData({ taskList: [] });
      return;
    }
    const preset = PRESETS[key];
    if (!preset) return;
    const typeOptions = this.data.typeOptions;
    const taskList = preset.tasks.map(t => ({
      name: t.name,
      typeIndex: typeOptions.indexOf(t.type) >= 0 ? typeOptions.indexOf(t.type) : 0,
      rewardsStr: t.rewards || '',
      desc: t.desc || '',
    }));
    this.setData({ taskList });
  },

  // ========== 解析奖励字符串 ==========
  /**
   * Bug#1：支持中文逗号"，"和英文逗号","分隔
   * 同时支持负值奖励，如"体质-2"
   * @param {string} str - 奖励字符串，如"体质+5，耐力+3"
   * @returns {Object} 解析后的奖励对象，如{体质: 5, 耐力: 3}
   */
  parseRewards(str) {
    const rewards = {};
    if (!str || !str.trim()) return rewards;

    // Bug#1：同时支持中文逗号和英文逗号分隔
    const segments = str.split(/[,，]/);

    for (const seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed) continue;

      // 匹配格式：属性名+数值 或 属性名-数值
      // 支持"体质+5"、"体质-2"、"体脂率(%)-1"等格式
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

  // ========== 提交初始化 ==========
  submitSetup() {
    const { playerName, playerAge, gender, birthYear, birthMonth, birthDay, birthHourIndex, selectedMode, attrs, taskList } = this.data;

    if (!playerName.trim()) {
      wx.showToast({ title: '请输入你的名字', icon: 'none' });
      return;
    }
    if (!playerAge && playerAge !== 0) {
      wx.showToast({ title: '请输入你的年龄', icon: 'none' });
      return;
    }
    if (!gender) {
      wx.showToast({ title: '请选择性别', icon: 'none' });
      return;
    }
    if (!birthYear || !birthMonth || !birthDay) {
      wx.showToast({ title: '请填写出生年月日', icon: 'none' });
      return;
    }
    if (!selectedMode) {
      wx.showToast({ title: '请选择一个模式', icon: 'none' });
      return;
    }
    if (attrs.length === 0) {
      wx.showToast({ title: '请至少添加一项属性', icon: 'none' });
      return;
    }
    if (taskList.length === 0) {
      wx.showToast({ title: '请至少添加一条任务', icon: 'none' });
      return;
    }

    // 构建属性数据（含负值检查）
    const grpOptions = this.data.grpOptions;
    const processedAttrs = [];
    const negativeAttrs = [];

    for (const a of attrs) {
      if (!a.name.trim()) continue;
      let value = a.value;
      // Bug#2：属性负值处理
      if (value < 0) {
        negativeAttrs.push(a.name);
        value = 0;
      }
      processedAttrs.push({
        name: a.name.trim(),
        value: value,
        grp: grpOptions[a.grpIndex] || '其它',
      });
    }

    // 如果有负值属性，Toast提示
    if (negativeAttrs.length > 0) {
      wx.showToast({
        title: '属性值不可为负数，已自动设为0',
        icon: 'none',
        duration: 2500,
      });
    }

    // 构建任务数据
    const typeOptions = this.data.typeOptions;
    const processedTasks = [];

    for (const t of taskList) {
      if (!t.name.trim()) continue;
      const rewards = this.parseRewards(t.rewardsStr);
      if (Object.keys(rewards).length === 0) {
        wx.showToast({ title: `任务「${t.name}」奖励格式错误`, icon: 'none' });
        return;
      }
      processedTasks.push({
        name: t.name.trim(),
        type: typeOptions[t.typeIndex] || '每日',
        desc: t.desc || '',
        rewards: rewards,
      });
    }

    if (processedAttrs.length === 0) {
      wx.showToast({ title: '请至少添加一项有效属性', icon: 'none' });
      return;
    }
    if (processedTasks.length === 0) {
      wx.showToast({ title: '请至少添加一条有效任务', icon: 'none' });
      return;
    }

    // 计算出生信息
    const by = parseInt(birthYear);
    const bm = parseInt(birthMonth);
    const bd = parseInt(birthDay);
    const baziResult = getBazi(by, bm, bd);
    let hourPillar = '';
    if (birthHourIndex >= 0) {
      hourPillar = getHourPillar(by, bm, bd, birthHourIndex);
    }
    const bazi = {
      year: baziResult.yearPillar,
      month: baziResult.monthPillar,
      day: baziResult.dayPillar,
      hour: hourPillar
    };

    // 提交到云函数
    this.setData({ submitting: true });

    wx.cloud.callFunction({
      name: 'setup',
      data: {
        player_name: playerName.trim(),
        player_age: playerAge,
        gender: gender,
        birth_year: by,
        birth_month: bm,
        birth_day: bd,
        birth_hour: birthHourIndex >= 0 ? birthHourIndex : -1,
        bazi: bazi,
        cultivation_enabled: selectedMode === 'cultivation', // 是否启用修仙模式
        attrs: processedAttrs,
        tasks: processedTasks,
      },
      success: (res) => {
        const result = res.result;
        if (result.ok) {
          wx.setStorageSync('setup_done', true);
          wx.setStorageSync('welcome_completed', true);
          wx.setStorageSync('bazi', bazi);
          wx.setStorageSync('theme', this.data.selectedTheme);
          app.globalData.theme = this.data.selectedTheme;
          // 如果是简洁模式，隐藏修仙相关UI
          if (selectedMode === 'simple') {
            wx.setStorageSync('cultivation_enabled', false);
          } else {
            wx.setStorageSync('cultivation_enabled', true);
          }
          wx.showToast({ title: '初始化完成！', icon: 'success' });
          setTimeout(() => {
            // 跳转到主面板（tabBar页面用switchTab）
            wx.switchTab({ url: '/pages/index/index' });
          }, 1000);
        } else if (result.hasData) {
          // 云端已有数据，恢复本地标志并跳转主页
          wx.setStorageSync('setup_done', true);
          wx.setStorageSync('welcome_completed', true);
          wx.showToast({ title: '检测到已有账号，正在恢复...', icon: 'none' });
          setTimeout(() => {
            wx.switchTab({ url: '/pages/index/index' });
          }, 1000);
        } else {
          wx.showToast({ title: result.message || '初始化失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('云函数调用失败：', err);
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      },
      complete: () => {
        this.setData({ submitting: false });
      },
    });
  },
});
