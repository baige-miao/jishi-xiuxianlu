/**
 * 出生信息计算工具
 *
 * 日柱：使用万年历JSON查表（准确）
 * 年柱：五虎遁算法
 * 月柱：五虎遁算法 + 节气边界处理
 */

// 天干地支表
const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 五行对应
const WU_XING = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
  "子": "水", "丑": "土", "寅": "木", "卯": "木",
  "辰": "土", "巳": "火", "午": "火", "未": "土",
  "申": "金", "酉": "金", "戌": "土", "亥": "水"
};

// 月柱年上起月表（年干→正月天干索引）
// 口诀：甲己之年丙作首，乙庚之岁戊为头，丙辛必定寻庚起，丁壬壬位顺行流，戊癸何方发，甲寅之上好追求
const MONTH_START_GAN = {
  "甲": 2, "己": 2,  // 甲己之年丙作首（丙=索引2）
  "乙": 4, "庚": 4,  // 乙庚之岁戊为头（戊=索引4）
  "丙": 6, "辛": 6,  // 丙辛必定寻庚起（庚=索引6）
  "丁": 8, "壬": 8,  // 丁壬壬位顺行流（壬=索引8）
  "戊": 0, "癸": 0,  // 戊癸何方发，甲寅之上好追求（甲=索引0）
};

// 24节气近似日期（月柱分界用）
// 按月份顺序排列：1月→12月
const JIE_QI = [
  { zhi: 1, month: 1, day: 6 },   // 丑月：小寒1.6前后
  { zhi: 2, month: 2, day: 4 },   // 寅月：立春2.4前后
  { zhi: 3, month: 3, day: 6 },   // 卯月：惊蛰3.6前后
  { zhi: 4, month: 4, day: 5 },   // 辰月：清明4.5前后
  { zhi: 5, month: 5, day: 6 },   // 巳月：立夏5.6前后
  { zhi: 6, month: 6, day: 6 },   // 午月：芒种6.6前后
  { zhi: 7, month: 7, day: 7 },   // 未月：小暑7.7前后
  { zhi: 8, month: 8, day: 8 },   // 申月：立秋8.8前后
  { zhi: 9, month: 9, day: 8 },   // 酉月：白露9.8前后
  { zhi: 10, month: 10, day: 9 }, // 戌月：寒露10.9前后
  { zhi: 11, month: 11, day: 8 }, // 亥月：立冬11.8前后
  { zhi: 0, month: 12, day: 7 },  // 子月：大雪12.7前后
];

/**
 * 获取日柱干支（基准日期法）
 * 基准：2000-01-01 = 戊午日（戊=索引4，午=索引6）
 * @param {number} year - 公历年
 * @param {number} month - 公历月
 * @param {number} day - 公历日
 * @returns {string} 日柱干支
 */
function getDayPillar(year, month, day) {
  var base = new Date(2000, 0, 1); // 2000-01-01
  var target = new Date(year, month - 1, day);
  var diffDays = Math.round((target - base) / 86400000);
  var ganIdx = ((4 + diffDays) % 10 + 10) % 10; // 戊=4
  var zhiIdx = ((6 + diffDays) % 12 + 12) % 12; // 午=6
  return TIAN_GAN[ganIdx] + DI_ZHI[zhiIdx];
}

/**
 * 获取年柱干支（五虎遁算法）
 * @param {number} year - 公历年
 * @param {number} month - 公历月
 * @param {number} day - 公历日
 * @returns {string} 年柱干支
 */
function getYearPillar(year, month, day) {
  // 判断是否在立春前
  const liChunDay = JIE_QI[0]; // 立春约2月4日
  let actualYear = year;

  if (month < liChunDay.month || (month === liChunDay.month && day < liChunDay.day)) {
    actualYear = year - 1; // 立春前用上一年
  }

  // 年柱天干地支（以1984甲子年为基准）
  const baseYear = 1984;
  const diff = actualYear - baseYear;
  const ganIndex = ((diff % 10) + 10) % 10;
  const zhiIndex = ((diff % 12) + 12) % 12;

  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

/**
 * 获取月柱干支（五虎遁算法 + 节气边界）
 * @param {number} year - 公历年
 * @param {number} month - 公历月
 * @param {number} day - 公历日
 * @returns {string} 月柱干支
 */
function getMonthPillar(year, month, day) {
  // 1. 找到当前节气对应的月支
  let monthZhiIndex = -1;

  for (let i = 0; i < JIE_QI.length; i++) {
    const jie = JIE_QI[i];
    if (month > jie.month || (month === jie.month && day >= jie.day)) {
      monthZhiIndex = jie.zhi;
    }
  }

  // 还没到1月小寒就是上一年的丑月
  if (monthZhiIndex === -1) {
    monthZhiIndex = 1; // 丑月
  }

  // 2. 确定年柱用于五虎遁
  const liChunDay = JIE_QI[0];
  let actualYear = year;
  if (month < liChunDay.month || (month === liChunDay.month && day < liChunDay.day)) {
    actualYear = year - 1;
  }

  // 获取年干
  const yearGan = getYearPillar(year, month, day).charAt(0);

  // 3. 五虎遁：根据年干确定正月（寅月）天干索引
  const startGan = MONTH_START_GAN[yearGan];
  // 月柱天干索引 = startGan + (月支索引 - 2)（寅=2，所以-2）
  const monthGanIndex = (startGan + (monthZhiIndex - 2) + 10) % 10;

  return TIAN_GAN[monthGanIndex] + DI_ZHI[monthZhiIndex];
}

/**
 * 获取完整八字
 * @param {number} year - 公历年
 * @param {number} month - 公历月
 * @param {number} day - 公历日
 * @returns {Object} 八字对象
 */
function getBazi(year, month, day) {
  return {
    yearPillar: getYearPillar(year, month, day),
    monthPillar: getMonthPillar(year, month, day),
    dayPillar: getDayPillar(year, month, day),
  };
}

/**
 * 获取天干五行
 * @param {string} gan - 天干
 * @returns {string} 五行
 */
function getGanWuXing(gan) {
  return WU_XING[gan] || '';
}

/**
 * 获取地支五行
 * @param {string} zhi - 地支
 * @returns {string} 五行
 */
function getZhiWuXing(zhi) {
  return WU_XING[zhi] || '';
}

// 日上起时辰天干起始表（日干→子时天干索引）
// 口诀：甲己日起甲子时，乙庚日起丙子时，丙辛日起戊子时，丁壬日起庚子时，戊癸日起壬子时
const HOUR_START_GAN = {
  "甲": 0, "己": 0,  // 甲己日起甲子（甲=索引0）
  "乙": 2, "庚": 2,  // 乙庚日起丙子（丙=索引2）
  "丙": 4, "辛": 4,  // 丙辛日起戊子（戊=索引4）
  "丁": 6, "壬": 6,  // 丁壬日起庚子（庚=索引6）
  "戊": 8, "癸": 8,  // 戊癸日起壬子（壬=索引8）
};

/**
 * 获取时柱干支（日上起时法）
 * @param {number} year - 公历年
 * @param {number} month - 公历月
 * @param {number} day - 公历日
 * @param {number} hourIndex - 时辰索引 0-11（0=子时,1=丑时,...,11=亥时）
 * @returns {string} 时柱干支
 */
function getHourPillar(year, month, day, hourIndex) {
  if (hourIndex < 0 || hourIndex > 11) {
    console.error('时辰索引超出范围:', hourIndex);
    return '未知';
  }

  // 获取日干
  const dayGanZhi = getDayPillar(year, month, day);
  if (dayGanZhi === '未知') return '未知';

  const dayGan = dayGanZhi.charAt(0);

  // 根据日干确定子时天干起始索引
  const startGanIndex = HOUR_START_GAN[dayGan];

  // 时柱天干 = 起始天干 + 时辰偏移
  const hourGanIndex = (startGanIndex + hourIndex) % 10;

  return TIAN_GAN[hourGanIndex] + DI_ZHI[hourIndex];
}

/**
 * 获取流日干支查询
 * @param {number} year - 公历年
 * @param {number} month - 公历月
 * @param {number} day - 公历日
 * @returns {Object} 流日干支信息
 */
function getLiuriGanzhi(year, month, day) {
  const ganzhi = getDayPillar(year, month, day);
  if (ganzhi === '未知') {
    return null;
  }

  const gan = ganzhi.charAt(0);
  const zhi = ganzhi.charAt(1);

  return {
    gan: gan,
    zhi: zhi,
    ganzhi: ganzhi,
    wuxingGan: WU_XING[gan],
    wuxingZhi: WU_XING[zhi],
  };
}

// 五行生克关系表（我→他 → 关系）
// 相生：木生火，火生土，土生金，金生水，水生木
// 相克：木克土，土克水，水克火，火克金，金克木
const SHENG = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
const KE = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };

// 阴阳分组
const YIN_GAN = ["乙", "丁", "己", "辛", "癸"];
const YANG_GAN = ["甲", "丙", "戊", "庚", "壬"];

function isYangGan(gan) {
  return YANG_GAN.indexOf(gan) !== -1;
}

function isSameYinYang(gan1, gan2) {
  return isYangGan(gan1) === isYangGan(gan2);
}

/**
 * 获取十神关系
 * @param {string} riZhu - 日柱干支，如"庚午"
 * @param {string} liuRiGan - 流日天干，如"乙"
 * @returns {string} 十神关系
 */
function getShishen(riZhu, liuRiGan) {
  const riGan = riZhu.charAt(0);
  const riWuxing = WU_XING[riGan];
  const liuWuxing = WU_XING[liuRiGan];

  if (!riWuxing || !liuWuxing) return '未知';

  const sameYinYang = isSameYinYang(riGan, liuRiGan);

  if (riWuxing === liuWuxing) {
    // 同我
    return sameYinYang ? '比肩' : '劫财';
  } else if (SHENG[riWuxing] === liuWuxing) {
    // 我生
    return sameYinYang ? '食神' : '伤官';
  } else if (SHENG[liuWuxing] === riWuxing) {
    // 生我
    return sameYinYang ? '偏印' : '正印';
  } else if (KE[riWuxing] === liuWuxing) {
    // 我克
    return sameYinYang ? '偏财' : '正财';
  } else if (KE[liuWuxing] === riWuxing) {
    // 克我
    return sameYinYang ? '七杀' : '正官';
  }

  return '未知';
}

/**
 * 获取五行生克关系
 * @param {string} riZhu - 日柱干支，如"庚午"
 * @param {string} liuRiGan - 流日天干，如"乙"
 * @param {string} liuRiZhi - 流日地支，如"巳"
 * @returns {Object} { ganRelation: "X生Y", zhiRelation: "X克Y" }
 */
function getWuxingRelation(riZhu, liuRiGan, liuRiZhi) {
  const riGan = riZhu.charAt(0);
  const riWuxing = WU_XING[riGan];
  const liuGanWuxing = WU_XING[liuRiGan];
  const liuZhiWuxing = WU_XING[liuRiZhi];

  function getRelation(fromWx, toWx) {
    if (fromWx === toWx) return '比和';
    if (SHENG[fromWx] === toWx) return fromWx + '生' + toWx;
    if (KE[fromWx] === toWx) return fromWx + '克' + toWx;
    if (SHENG[toWx] === fromWx) return toWx + '生' + fromWx;
    if (KE[toWx] === fromWx) return toWx + '克' + fromWx;
    return '未知';
  }

  return {
    ganRelation: getRelation(liuGanWuxing, riWuxing),
    zhiRelation: getRelation(liuZhiWuxing, riWuxing),
  };
}

// 测试
function test() {
  const tests = [
    { date: [2000, 1, 1], expectedDay: "戊午" },
    { date: [2006, 10, 23], expectedDay: "乙酉" },
    { date: [2020, 1, 1], expectedDay: "癸卯" },
    { date: [2024, 1, 1], expectedDay: "甲子" },
    { date: [1980, 2, 1], expectedDay: "甲辰" },
  ];

  console.log("日柱验证:");
  tests.forEach(({ date, expectedDay }) => {
    const [y, m, d] = date;
    const actual = getDayPillar(y, m, d);
    const status = actual === expectedDay ? "✅" : "❌";
    console.log(`${status} ${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} → ${actual} (应为 ${expectedDay})`);
  });

  // 时柱测试
  console.log("\n时柱验证（日上起时法）:");
  // 2024-01-01 日柱甲子，甲日起甲子时
  // 子时(0)=甲子，丑时(1)=乙丑，寅时(2)=丙寅，午时(6)=庚午
  const hourTests = [
    { date: [2024, 1, 1], hourIndex: 0, expected: "甲子" },
    { date: [2024, 1, 1], hourIndex: 1, expected: "乙丑" },
    { date: [2024, 1, 1], hourIndex: 6, expected: "庚午" },
    // 2000-01-01 日柱戊午，戊日起壬子时
    // 子时(0)=壬子，午时(6)=戊午
    { date: [2000, 1, 1], hourIndex: 0, expected: "壬子" },
    { date: [2000, 1, 1], hourIndex: 6, expected: "戊午" },
  ];

  hourTests.forEach(({ date, hourIndex, expected }) => {
    const [y, m, d] = date;
    const actual = getHourPillar(y, m, d, hourIndex);
    const status = actual === expected ? "✅" : "❌";
    const shichenName = DI_ZHI[hourIndex] + "时";
    console.log(`${status} ${y}-${m}-${d} ${shichenName}(${hourIndex}) → ${actual} (应为 ${expected})`);
  });

  // 流日干支测试
  console.log("\n流日干支验证:");
  const liuri = getLiuriGanzhi(2024, 1, 1);
  console.log(`2024-01-01 流日: ${JSON.stringify(liuri)}`);

  // 十神测试
  console.log("\n十神验证:");
  // 日柱庚午，流日天干乙 → 庚金克乙木，庚阳乙阴→正财
  const ss1 = getShishen("庚午", "乙");
  console.log(`日庚 十神乙 → ${ss1} (应为 正财) ${ss1 === "正财" ? "✅" : "❌"}`);

  // 日柱庚午，流日天干辛 → 金同金，庚阳辛阴→劫财
  const ss2 = getShishen("庚午", "辛");
  console.log(`日庚 十神辛 → ${ss2} (应为 劫财) ${ss2 === "劫财" ? "✅" : "❌"}`);

  // 日柱庚午，流日天干丙 → 火克金，庚阳丙阳→七杀
  const ss3 = getShishen("庚午", "丙");
  console.log(`日庚 十神丙 → ${ss3} (应为 七杀) ${ss3 === "七杀" ? "✅" : "❌"}`);

  // 日柱庚午，流日天干壬 → 金生水，庚阳壬阳→食神
  const ss4 = getShishen("庚午", "壬");
  console.log(`日庚 十神壬 → ${ss4} (应为 食神) ${ss4 === "食神" ? "✅" : "❌"}`);

  // 五行生克测试
  console.log("\n五行生克验证:");
  const wx = getWuxingRelation("庚午", "乙", "巳");
  console.log(`日庚 十神乙巳 → 天干:${wx.ganRelation} 地支:${wx.zhiRelation}`);
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getDayPillar,
    getYearPillar,
    getMonthPillar,
    getBazi,
    getGanWuXing,
    getZhiWuXing,
    getHourPillar,
    getLiuriGanzhi,
    getShishen,
    getWuxingRelation,
    TIAN_GAN,
    DI_ZHI,
    WU_XING,
  };
}
