/**
 * 主题配置模块
 * 定义4种UI主题的完整配色方案
 */

// 主题列表（用于选择器展示）
const THEME_LIST = [
  {
    key: 'dark',
    name: '暗黑主题',
    icon: '🌙',
    desc: '经典暗色风格',
  },
  {
    key: 'ancient',
    name: '修仙复古',
    icon: '📜',
    desc: '羊皮纸/竹简风格',
  },
  {
    key: 'light',
    name: '轻量简约',
    icon: '☀️',
    desc: '纯白浅色系',
  },
  {
    key: 'cyber',
    name: '赛博朋克',
    icon: '🌆',
    desc: '霓虹色风格',
  },
];

// 主题对应的导航栏和标签栏颜色
const THEME_COLORS = {
  dark: {
    navBg: '#0a0a14',
    navText: 'white',
    tabBarBg: '#141428',
    tabBarColor: '#888888',
    tabBarSelectedColor: '#00d4aa',
  },
  ancient: {
    navBg: '#8b4513',
    navText: 'white',
    tabBarBg: '#a0522d',
    tabBarColor: '#dcc89a',
    tabBarSelectedColor: '#f0c040',
  },
  light: {
    navBg: '#f8f9fa',
    navText: 'black',
    tabBarBg: '#ffffff',
    tabBarColor: '#999999',
    tabBarSelectedColor: '#4a90d9',
  },
  cyber: {
    navBg: '#1a0044',
    navText: 'white',
    tabBarBg: '#0d0221',
    tabBarColor: '#8888aa',
    tabBarSelectedColor: '#ff00ff',
  },
};

/**
 * 获取主题类名
 * @param {string} themeKey - 主题标识
 * @returns {string} CSS类名
 */
function getThemeClass(themeKey) {
  return 'theme-' + (themeKey || 'dark');
}

/**
 * 获取主题数据（用于页面data）
 * @param {string} themeKey - 主题标识
 * @returns {{ theme: string, themeClass: string }}
 */
function getThemeData(themeKey) {
  return {
    theme: themeKey || 'dark',
    themeClass: getThemeClass(themeKey || 'dark'),
  };
}

/**
 * 应用主题到导航栏和标签栏
 * @param {string} themeKey - 主题标识
 */
function applyThemeToSystemBars(themeKey) {
  const colors = THEME_COLORS[themeKey || 'dark'];
  if (!colors) return;

  // 设置导航栏颜色
  try {
    wx.setNavigationBarColor({
      frontColor: colors.navText === 'white' ? '#ffffff' : '#000000',
      backgroundColor: colors.navBg,
      animation: { duration: 300, timingFunc: 'easeIn' },
    });
  } catch (e) {
    console.warn('setNavigationBarColor failed:', e);
  }

  // 设置标签栏颜色
  try {
    wx.setTabBarStyle({
      color: colors.tabBarColor,
      selectedColor: colors.tabBarSelectedColor,
      backgroundColor: colors.tabBarBg,
      borderStyle: 'black',
    });
  } catch (e) {
    console.warn('setTabBarStyle failed:', e);
  }
}

module.exports = {
  THEME_LIST,
  THEME_COLORS,
  getThemeClass,
  getThemeData,
  applyThemeToSystemBars,
};
