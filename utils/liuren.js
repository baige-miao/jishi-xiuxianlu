/**
 * 小六壬文化趣玩核心算法
 * 六神：大安→留连→速喜→赤口→小吉→空亡（循环）
 * 月起大安，日起月落宫，时起日落宫，得三宫结果
 */

// 六神定义（掌诀顺序）
const LIUREN_GODS = [
  {
    name: '大安',
    wuxing: '木',
    color: '青色',
    direction: '东方',
    poem: '大安事事昌，求财在坤方，失物去不远，宅舍保安康。',
    meaning: '身不动时，诸事安稳。人未动，时未到，静待时机。',
  },
  {
    name: '留连',
    wuxing: '水',
    color: '黑色',
    direction: '北方',
    poem: '留连事难成，求谋日未明，官事只宜缓，去者未回程。',
    meaning: '人未归时，事未决。拖延反复，不可急躁。',
  },
  {
    name: '速喜',
    wuxing: '火',
    color: '红色',
    direction: '南方',
    poem: '速喜喜来临，求财向南行，失物申未午，逢人路上寻。',
    meaning: '喜来时，有好消息。贵人相助，事半功倍。',
  },
  {
    name: '赤口',
    wuxing: '金',
    color: '白色',
    direction: '西方',
    poem: '赤口主口舌，官非切要防，失物速速找，行人有惊慌。',
    meaning: '官事凶，口舌是非。慎言慎行，防人之心不可无。',
  },
  {
    name: '小吉',
    wuxing: '水',
    color: '黑色',
    direction: '北方',
    poem: '小吉最吉昌，路上好商量，阴人来报喜，失物在坤方。',
    meaning: '人来喜时，诸事顺遂。和合吉利，最宜求谋。',
  },
  {
    name: '空亡',
    wuxing: '土',
    color: '黄色',
    direction: '中央',
    poem: '空亡事不祥，阴人多乖张，求财无利益，行人有灾殃。',
    meaning: '音信稀，落空无果。宜守不宜攻，凡事谨慎。',
  },
];

/**
 * 小六壬体验计算
 * @param {number} month - 月份 1-12
 * @param {number} day - 日期 1-30
 * @param {number} hourIndex - 时辰索引 0-11（子=0, 丑=1, ..., 亥=11）
 * @returns {Object} { monthGod, dayGod, timeGod, grid }
 */
function calcLiuren(month, day, hourIndex) {
  const hourNum = hourIndex + 1; // 子=1, 丑=2, ..., 亥=12

  // 月起大安：从大安(0)开始数月份
  const monthGodIdx = (month - 1) % 6;
  // 日起月落宫：从月宫开始数日期
  const dayGodIdx = (monthGodIdx + day - 1) % 6;
  // 时起日落宫：从日宫开始数时辰
  const timeGodIdx = (dayGodIdx + hourNum - 1) % 6;

  const monthGod = LIUREN_GODS[monthGodIdx];
  const dayGod = LIUREN_GODS[dayGodIdx];
  const timeGod = LIUREN_GODS[timeGodIdx];

  return {
    monthGod,
    dayGod,
    timeGod,
    monthGodIdx,
    dayGodIdx,
    timeGodIdx,
  };
}

/**
 * 获取时辰中文名
 */
function getHourName(index) {
  const names = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return names[index] || '子';
}

/**
 * 获取时辰对应时间段描述
 */
function getHourRange(index) {
  const ranges = [
    '23:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00',
    '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00',
    '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00',
  ];
  return ranges[index] || '';
}

module.exports = {
  LIUREN_GODS,
  calcLiuren,
  getHourName,
  getHourRange,
};
