/**
 * 成就系统
 * 通用成就（简洁模式+修仙模式）+ 修仙专属成就
 */

const ACHIEVEMENTS = [
  // === 通用成就 ===
  { id: 'first_task',      name: '万事开头',   desc: '完成第一个任务',         icon: '🌱', category: '初出茅庐' },
  { id: 'streak_7',        name: '七日不辍',   desc: '连续打卡7天',            icon: '🔥', category: '持之以恒' },
  { id: 'streak_14',       name: '两周坚持',   desc: '连续打卡14天',           icon: '🔥', category: '持之以恒' },
  { id: 'streak_30',       name: '月满三十',   desc: '连续打卡30天',           icon: '🔥', category: '持之以恒' },
  { id: 'streak_60',       name: '两月征程',   desc: '连续打卡60天',           icon: '🔥', category: '持之以恒' },
  { id: 'streak_90',       name: '百日之约',   desc: '连续打卡90天',           icon: '🔥', category: '持之以恒' },
  { id: 'streak_180',      name: '半载修行',   desc: '连续打卡180天',          icon: '🔥', category: '持之以恒' },
  { id: 'streak_365',      name: '登峰造极',   desc: '连续打卡365天',          icon: '👑', category: '持之以恒' },
  { id: 'tasks_10',        name: '小试牛刀',   desc: '累计完成10个任务',       icon: '📋', category: '积少成多' },
  { id: 'tasks_100',       name: '百战不殆',   desc: '累计完成100个任务',      icon: '📋', category: '积少成多' },
  { id: 'tasks_500',       name: '千锤百炼',   desc: '累计完成500个任务',      icon: '⚔️', category: '积少成多' },
  { id: 'tasks_1000',      name: '功成名就',   desc: '累计完成1000个任务',     icon: '🏆', category: '积少成多' },
  { id: 'rating_英才',     name: '崭露头角',   desc: '用户评级达到英才',       icon: '🏅', category: '评级成就' },
  { id: 'rating_俊杰',     name: '锋芒毕露',   desc: '用户评级达到俊杰',       icon: '🏅', category: '评级成就' },
  { id: 'rating_大师',     name: '一代大师',   desc: '用户评级达到大师',       icon: '🏆', category: '评级成就' },
  { id: 'rating_宗师',     name: '宗师风范',   desc: '用户评级达到宗师',       icon: '🏆', category: '评级成就' },
  { id: 'rating_传奇',     name: '传奇之路',   desc: '用户评级达到传奇',       icon: '👑', category: '评级成就' },
  { id: 'rating_神话',     name: '神话传说',   desc: '用户评级达到神话',       icon: '👑', category: '评级成就' },

  // === 修仙专属成就 ===
  { id: 'first_breakthrough', name: '破境初试', desc: '首次修仙突破成功',    icon: '✨', category: '修行之始', cultivationOnly: true },
  { id: 'spirit_100',      name: '灵气初聚',   desc: '累计获得100灵力',       icon: '💫', category: '灵力修行', cultivationOnly: true },
  { id: 'spirit_1000',     name: '灵力充沛',   desc: '累计获得1000灵力',      icon: '💫', category: '灵力修行', cultivationOnly: true },
  { id: 'spirit_10000',    name: '灵海无涯',   desc: '累计获得10000灵力',     icon: '🌊', category: '灵力修行', cultivationOnly: true },
  { id: 'spirit_50000',    name: '灵力浩瀚',   desc: '累计获得50000灵力',     icon: '🌊', category: '灵力修行', cultivationOnly: true },
  { id: 'cultivation_10',  name: '筑基有成',   desc: '达到筑基境',            icon: '🌀', category: '境界突破', cultivationOnly: true },
  { id: 'cultivation_19',  name: '结晶圆满',   desc: '达到结晶境',            icon: '💎', category: '境界突破', cultivationOnly: true },
  { id: 'cultivation_28',  name: '金丹大道',   desc: '达到金丹境',            icon: '⚡', category: '境界突破', cultivationOnly: true },
  { id: 'cultivation_37',  name: '元婴初成',   desc: '达到元婴境',            icon: '⚡', category: '境界突破', cultivationOnly: true },
  { id: 'cultivation_46',  name: '化神之路',   desc: '达到化神境',            icon: '⚡', category: '境界突破', cultivationOnly: true },
  { id: 'cultivation_64',  name: '悟道通玄',   desc: '达到悟道境',            icon: '🌟', category: '境界突破', cultivationOnly: true },
  { id: 'cultivation_73',  name: '羽化归真',   desc: '达到羽化境',            icon: '🌟', category: '境界突破', cultivationOnly: true },
  { id: 'cultivation_81',  name: '飞升登仙',   desc: '达到登仙境',            icon: '🌟', category: '境界突破', cultivationOnly: true },
];

// 评级顺序（从低到高）
const RATING_ORDER = ['平民', '新秀', '英才', '精英', '俊杰', '大师', '宗师', '传奇', '神话'];

/**
 * 判断当前评级是否 >= 目标评级
 */
function higherOrEqual(current, target) {
  const ci = RATING_ORDER.indexOf(current);
  const ti = RATING_ORDER.indexOf(target);
  if (ci < 0 || ti < 0) return false;
  return ci >= ti;
}

/**
 * 检查并解锁成就
 * @param {object} player - 玩家文档
 * @param {object} existingAchievements - 已解锁成就 { id: dateStr }
 * @param {object} context - { taskDoneCount, totalSpiritEarned, userRating, today }
 * @returns {{ achievements: object, unlocked: array }}
 */
function checkAchievements(player, existingAchievements, context) {
  const achMap = Object.assign({}, existingAchievements || {});
  const unlocked = [];

  const checks = {
    'first_task':        function() { return context.taskDoneCount >= 1; },
    'first_breakthrough': function() { return (player.cultivation_level || 0) >= 1; },
    'streak_7':          function() { return (player.streak || 0) >= 7; },
    'streak_14':         function() { return (player.streak || 0) >= 14; },
    'streak_30':         function() { return (player.streak || 0) >= 30; },
    'streak_60':         function() { return (player.streak || 0) >= 60; },
    'streak_90':         function() { return (player.streak || 0) >= 90; },
    'streak_180':        function() { return (player.streak || 0) >= 180; },
    'streak_365':        function() { return (player.streak || 0) >= 365; },
    'tasks_10':          function() { return context.taskDoneCount >= 10; },
    'tasks_100':         function() { return context.taskDoneCount >= 100; },
    'tasks_500':         function() { return context.taskDoneCount >= 500; },
    'tasks_1000':        function() { return context.taskDoneCount >= 1000; },
    'spirit_100':        function() { return context.totalSpiritEarned >= 100; },
    'spirit_1000':       function() { return context.totalSpiritEarned >= 1000; },
    'spirit_10000':      function() { return context.totalSpiritEarned >= 10000; },
    'spirit_50000':      function() { return context.totalSpiritEarned >= 50000; },
    'cultivation_10':    function() { return (player.cultivation_level || 0) >= 10; },
    'cultivation_19':    function() { return (player.cultivation_level || 0) >= 19; },
    'cultivation_28':    function() { return (player.cultivation_level || 0) >= 28; },
    'cultivation_37':    function() { return (player.cultivation_level || 0) >= 37; },
    'cultivation_46':    function() { return (player.cultivation_level || 0) >= 46; },
    'cultivation_64':    function() { return (player.cultivation_level || 0) >= 64; },
    'cultivation_73':    function() { return (player.cultivation_level || 0) >= 73; },
    'cultivation_81':    function() { return (player.cultivation_level || 0) >= 81; },
    'rating_英才':        function() { return higherOrEqual(context.userRating, '英才'); },
    'rating_俊杰':        function() { return higherOrEqual(context.userRating, '俊杰'); },
    'rating_大师':        function() { return higherOrEqual(context.userRating, '大师'); },
    'rating_宗师':        function() { return higherOrEqual(context.userRating, '宗师'); },
    'rating_传奇':        function() { return higherOrEqual(context.userRating, '传奇'); },
    'rating_神话':        function() { return higherOrEqual(context.userRating, '神话'); },
  };

  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var ach = ACHIEVEMENTS[i];
    if (achMap[ach.id]) continue;
    if (checks[ach.id] && checks[ach.id]()) {
      achMap[ach.id] = context.today;
      unlocked.push({ id: ach.id, name: ach.name, desc: ach.desc, icon: ach.icon });
    }
  }

  return { achievements: achMap, unlocked: unlocked };
}

/**
 * 根据ID获取成就定义
 */
function getAchievementById(id) {
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    if (ACHIEVEMENTS[i].id === id) return ACHIEVEMENTS[i];
  }
  return null;
}

module.exports = {
  ACHIEVEMENTS: ACHIEVEMENTS,
  checkAchievements: checkAchievements,
  getAchievementById: getAchievementById,
  RATING_ORDER: RATING_ORDER,
};
