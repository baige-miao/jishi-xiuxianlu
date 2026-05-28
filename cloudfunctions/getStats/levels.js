/**
 * 公共工具模块
 * 包含：等级系统、修仙体系、用户评级、属性衰减逻辑
 * 前端页面和云函数共用此文件的核心常量与计算函数
 */

// ============================================================
// 一、等级描述系统（每10级一个称号，保留原有7档大段位）
// ============================================================

// 通用等级：每10级一个称号
const STD_LEVELS = [
  { min: 0,   max: 10,   label: '毫无建树' },
  { min: 11,  max: 20,   label: '初窥门径' },
  { min: 21,  max: 30,   label: '渐入佳境' },
  { min: 31,  max: 40,   label: '略有小成' },
  { min: 41,  max: 50,   label: '登堂入室' },
  { min: 51,  max: 60,   label: '游刃有余' },
  { min: 61,  max: 70,   label: '融会贯通' },
  { min: 71,  max: 80,   label: '触类旁通' },
  { min: 81,  max: 90,   label: '炉火纯青' },
  { min: 91,  max: 100,  label: '心领神会' },
  { min: 101, max: 150,  label: '出类拔萃' },
  { min: 151, max: 200,  label: '卓尔不群' },
  { min: 201, max: 300,  label: '登峰造极' },
  { min: 301, max: 400,  label: '超凡入圣' },
  { min: 401, max: 500,  label: '独步天下' },
  { min: 501, max: 700,  label: '一代宗师' },
  { min: 701, max: 1000, label: '万世师表' },
  { min: 1001, max: Infinity, label: '神话传说' },
];

// 学识专属等级
const KNOWLEDGE_LEVELS = [
  { min: 0,   max: 10,   label: '懵懂小白' },
  { min: 11,  max: 20,   label: '略知一二' },
  { min: 21,  max: 30,   label: '初窥门径' },
  { min: 31,  max: 40,   label: '小有所知' },
  { min: 41,  max: 50,   label: '渐有所悟' },
  { min: 51,  max: 60,   label: '初窥堂奥' },
  { min: 61,  max: 70,   label: '学识渐长' },
  { min: 71,  max: 80,   label: '博闻强识' },
  { min: 81,  max: 90,   label: '博学多才' },
  { min: 91,  max: 100,  label: '满腹经纶' },
  { min: 101, max: 200,  label: '学富五车' },
  { min: 201, max: 500,  label: '通古博今' },
  { min: 501, max: Infinity, label: '一代宗师' },
];

// 体质专属等级（无上限）
const BODY_LEVELS = [
  { min: 0,   max: 10,   label: '羸弱不堪' },
  { min: 11,  max: 20,   label: '身体无恙' },
  { min: 21,  max: 30,   label: '精力充沛' },
  { min: 31,  max: 40,   label: '气血充盈' },
  { min: 41,  max: 50,   label: '体魄强健' },
  { min: 51,  max: 60,   label: '龙精虎猛' },
  { min: 61,  max: 70,   label: '寒暑不侵' },
  { min: 71,  max: 80,   label: '举重若轻' },
  { min: 81,  max: 90,   label: '神完气足' },
  { min: 91,  max: 100,  label: '脱胎换骨' },
  { min: 101, max: 200,  label: '铜皮铁骨' },
  { min: 201, max: 500,  label: '百毒不侵' },
  { min: 501, max: Infinity, label: '金刚不坏' },
];

// 精神专属等级（上限100）
const MENTAL_LEVELS = [
  { min: 0,   max: 10,   label: '萎靡不振' },
  { min: 11,  max: 20,   label: '心力交瘁' },
  { min: 21,  max: 30,   label: '心浮气躁' },
  { min: 31,  max: 40,   label: '漫不经心' },
  { min: 41,  max: 50,   label: '平淡无奇' },
  { min: 51,  max: 60,   label: '神清气爽' },
  { min: 61,  max: 70,   label: '聚精会神' },
  { min: 71,  max: 80,   label: '兴致勃勃' },
  { min: 81,  max: 90,   label: '精神焕发' },
  { min: 91,  max: 99,   label: '思如泉涌' },
  { min: 100, max: 100,  label: '天人合一' },
];

// 意志力专属等级（上限100）
const WILLPOWER_LEVELS = [
  { min: 0,   max: 10,   label: '意兴阑珊' },
  { min: 11,  max: 20,   label: '有心无力' },
  { min: 21,  max: 30,   label: '顾盼神飞' },
  { min: 31,  max: 40,   label: '勉力而为' },
  { min: 41,  max: 50,   label: '循规蹈矩' },
  { min: 51,  max: 60,   label: '心无旁骛' },
  { min: 61,  max: 70,   label: '孜孜不倦' },
  { min: 71,  max: 80,   label: '愈挫愈勇' },
  { min: 81,  max: 90,   label: '乐在其中' },
  { min: 91,  max: 99,   label: '百折不挠' },
  { min: 100, max: 100,  label: '浑然忘我' },
];

// 心情专属等级（上限100）
const MOOD_LEVELS = [
  { min: 0,   max: 10,   label: '万念俱灰' },
  { min: 11,  max: 20,   label: '忧心忡忡' },
  { min: 21,  max: 30,   label: '心烦意乱' },
  { min: 31,  max: 40,   label: '怅然若失' },
  { min: 41,  max: 50,   label: '波澜不惊' },
  { min: 51,  max: 60,   label: '从容自若' },
  { min: 61,  max: 70,   label: '怡然自得' },
  { min: 71,  max: 80,   label: '兴致盎然' },
  { min: 81,  max: 90,   label: '心花怒放' },
  { min: 91,  max: 99,   label: '欣喜若狂' },
  { min: 100, max: 100,  label: '心旷神怡' },
];

// 属性名 → 专属等级表映射
// 其他属性使用通用等级表 STD_LEVELS
const CUSTOM_LEVEL_MAP = {
  '学识': KNOWLEDGE_LEVELS,
  '体质': BODY_LEVELS,
  '精神': MENTAL_LEVELS,
  '意志力': WILLPOWER_LEVELS,
  '心情': MOOD_LEVELS,
};

/**
 * 根据属性名和数值返回等级描述
 * @param {string} attrName - 属性名
 * @param {number} value - 属性值
 * @returns {string} 等级描述
 */
function getLevel(attrName, value) {
  const table = CUSTOM_LEVEL_MAP[attrName] || STD_LEVELS;
  for (const item of table) {
    if (value >= item.min && value <= item.max) return item.label;
  }
  return '未知';
}


// ============================================================
// 二、修仙体系
// ============================================================

/**
 * 修仙境界定义
 * 10个境界，每境界9层，共90级
 * 练气 → 筑基 → 结晶 → 金丹 → 具灵 → 元婴 → 化神 → 悟道 → 羽化 → 登仙
 */
const CULTIVATION_REALMS = [
  { name: '练气', layers: 9, baseCost: 10, costIncrement: 5 },
  { name: '筑基', layers: 9, baseCost: 60, costIncrement: 10 },
  { name: '结晶', layers: 9, baseCost: 150, costIncrement: 20 },
  { name: '金丹', layers: 9, baseCost: 350, costIncrement: 40 },
  { name: '具灵', layers: 9, baseCost: 700, costIncrement: 80 },
  { name: '元婴', layers: 9, baseCost: 1500, costIncrement: 150 },
  { name: '化神', layers: 9, baseCost: 3000, costIncrement: 300 },
  { name: '悟道', layers: 9, baseCost: 6000, costIncrement: 500 },
  { name: '羽化', layers: 9, baseCost: 12000, costIncrement: 1000 },
  { name: '登仙', layers: 9, baseCost: 25000, costIncrement: 2000 },
];

/**
 * 大境界突破感悟文案（从当前境界突破到下一境界时显示）
 * key = 当前境界名
 */
const BREAKTHROUGH_MESSAGES = {
  '练气': '道基初成，你感到天地灵气涌入体内，经脉中灵力流转不息。从此踏入真正的修行之路。',
  '筑基': '道基之上，灵力开始凝结，点点星光在丹田中汇聚。你隐约触摸到了更高层次的力量。',
  '结晶': '灵力结晶不断压缩、融合，最终化为一颗璀璨金丹！金丹一成，修为大进，你已非凡人可比。',
  '金丹': '金丹之中，一缕灵识渐渐苏醒。你开始拥有属于自己的灵觉，感知天地的方式发生了质变。',
  '具灵': '灵识不断壮大，万千杂念在你心中翻涌。忽然间，你斩断了所有犹豫与迷茫，心中唯剩一念——你自己的道。这一念如利剑破开迷障，元婴自灵识中凝结而出。从此，你不再随波逐流，而是踏上了属于自己的修行之路。',
  '元婴': '元婴与天地交感，你渐渐忘却了肉身的存在。某一刹那，你分不清哪些是自己的意识，哪些是天地的脉动——你与万物融为一体。在这融合之中，你终于看清了剥离一切后那个最纯粹的自己。化神一成，天地即你，你即天地。',
  '化神': '你不再只是一个修炼者，而是开始承担天地运转的因果。一言一行皆牵动法则，你学会了以天心代己心，以公正代私情。执掌权柄并非荣耀，而是沉重的责任——但你甘之如饴。万法归一，你就是那法则的一部分。',
  '悟道': '你一一了结此界的因果恩仇，不欠人，也不被人欠。心魔在最后一缕尘缘斩断时烟消云散。肉身开始蜕变，仙光从体内透出。你已无牵无挂，如破茧之蝶，只待那最终一跃。',
  '羽化': '天地法则降临，你不再抵抗，而是彻底放开了自我。你的意识如滴水归入汪洋，融入大道的永恒之中。自此，你不再是"你"，而是大道的一种显化。登仙！超脱凡尘，逍遥天地间。',
};

// 大境界突破失败率（具灵之后的境界跨越）
// key = 当前境界名，value = 失败概率 (0-1)
const MAJOR_BREAKTHROUGH_FAIL_RATES = {
  '具灵': 0.20,
  '元婴': 0.30,
  '化神': 0.40,
  '悟道': 0.55,
  '羽化': 0.70,
};

// 突破失败文案（叙事风格，与成功文案对应）
const BREAKTHROUGH_FAIL_MESSAGES = {
  '具灵': '灵识翻涌，万千大道在你眼前交错闪烁，你伸手去抓，却什么也抓不住。迷障越来越浓，你渐渐迷失在其中。待灵光散去，半数灵力已不知所踪。',
  '元婴': '你闭目感应天地，试图让意识融入万物。然而就在即将触碰的那一刹那，一声惊雷将你拉回了自身。天地依旧遥远，你的灵力却已溃散了大半。',
  '化神': '法则的重量压上你的肩头，因果之线如蛛网般缠绕全身。你咬牙承受，却在最后一刻心生退缩。天道无情，半数灵力在反噬中化为乌有。',
  '悟道': '你提起剑，斩向最后一缕尘缘。然而那尘缘中浮现的面孔让你心头一颤，剑锋偏了半寸。心魔趁这一瞬的动摇破体而出，半数灵力被吞噬殆尽。',
  '羽化': '仙光已起，你的身体开始透明。就在即将融入太虚的那一刻，你忽然想起了什么——那一丝牵挂如锚般将你钉在了凡尘。光芒散去，半数灵力消散于天地之间。',
};

// 大境界突破成功率提升配置
// key = 当前境界名，value = 条件数组（每个条件有描述、检查函数、加成）
// checkType: 'maxAttr'=最高属性, 'streak'=连续打卡, 'cultDays'=修行天数,
//            'features'=使用功能数, 'totalTasks'=总任务完成, 'skillAttrs'=学识+技能种类,
//            'attrsAbove'=属性≥阈值的数量, 'bodyAttr'=体质值, 'stageTasks'=阶段任务完成,
//            'diary'=日记篇数, 'mindAll'=心境属性全部达标
const BREAKTHROUGH_BOOSTS = {
  '具灵': [
    { desc: '最高属性 ≥ 200', checkType: 'maxAttr', threshold: 200, boost: 0.05 },
    { desc: '最高属性 ≥ 300', checkType: 'maxAttr', threshold: 300, boost: 0.10 },
    { desc: '连续打卡 ≥ 30天', checkType: 'streak', threshold: 30, boost: 0.10 },
  ],
  '元婴': [
    { desc: '修行天数 ≥ 90', checkType: 'cultDays', threshold: 90, boost: 0.10 },
    { desc: '修行天数 ≥ 180', checkType: 'cultDays', threshold: 180, boost: 0.20 },
    { desc: '使用功能 ≥ 4种', checkType: 'features', threshold: 4, boost: 0.10 },
  ],
  '化神': [
    { desc: '总任务完成 ≥ 100', checkType: 'totalTasks', threshold: 100, boost: 0.10 },
    { desc: '总任务完成 ≥ 300', checkType: 'totalTasks', threshold: 300, boost: 0.20 },
    { desc: '学识+技能属性 ≥ 30种', checkType: 'skillAttrs', threshold: 30, boost: 0.10 },
  ],
  '悟道': [
    { desc: '属性≥200的数量 ≥ 3', checkType: 'attrsAbove', threshold: 200, count: 3, boost: 0.10 },
    { desc: '属性≥200的数量 ≥ 5', checkType: 'attrsAbove', threshold: 200, count: 5, boost: 0.20 },
    { desc: '体质 ≥ 150', checkType: 'bodyAttr', threshold: 150, boost: 0.10 },
    { desc: '阶段任务完成 ≥ 9个', checkType: 'stageTasks', threshold: 9, boost: 0.20 },
  ],
  '羽化': [
    { desc: '日记 ≥ 30篇', checkType: 'diary', threshold: 30, boost: 0.15 },
    { desc: '日记 ≥ 100篇', checkType: 'diary', threshold: 100, boost: 0.25 },
    { desc: '心境属性全部 ≥ 80', checkType: 'mindAll', threshold: 80, boost: 0.15 },
    { desc: '心境属性全部 ≥ 90', checkType: 'mindAll', threshold: 90, boost: 0.25 },
    { desc: '心境属性全部 = 100', checkType: 'mindAll', threshold: 100, boost: 0.35 },
  ],
};

/**
 * 小境界突破描述（同境界内每层突破时随机显示）
 */
const REALM_CHANGES = {
  '练气': ['你感觉体内灵力更加充沛', '经脉中灵气流转更加顺畅', '你对灵气的感知又敏锐了一分'],
  '筑基': ['你的道基更加稳固', '丹田中的灵力更加凝实', '修为更进一步'],
  '结晶': ['丹田中的灵力结晶更加璀璨', '灵力的纯度又提升了一层'],
  '金丹': ['金丹光芒更盛', '金丹中的灵力更加浑厚', '你的金丹又凝实了几分'],
  '具灵': ['你的神识更加敏锐', '对天地的感知更深了一层', '灵觉范围又扩大了'],
  '元婴': ['元婴更加凝实', '神识覆盖范围更广', '元婴散发出淡淡的光芒'],
  '化神': ['你与天地的联系更加紧密', '化神之力不断深化', '你对天道的感悟又进了一步'],
  '悟道': ['你对大道的理解又深了一层', '万法在你眼中更加清晰'],
  '羽化': ['你的肉身正在蜕变', '仙光更加浓郁', '离飞升又近了一步'],
};

/**
 * 根据修仙等级编号返回境界名和层号
 * @param {number} level - 修仙等级编号
 * @returns {{ realm: string, layer: number, display: string }}
 */
function getCultivationDisplay(level) {
  if (!level || level <= 0) {
    return { realm: '凡人', layer: 0, display: '凡人' };
  }

  let offset = level;
  for (const realm of CULTIVATION_REALMS) {
    if (offset <= realm.layers) {
      return {
        realm: realm.name,
        layer: offset,
        display: `${realm.name}${offset}层`,
      };
    }
    offset -= realm.layers;
  }

  return { realm: '登仙', layer: 9, display: '登仙9层（圆满）' };
}

/**
 * 计算突破到下一阶需要的灵力
 * @param {number} currentLevel - 当前修仙等级编号
 * @returns {{ cost: number, target: string } | null} 如果已满级返回null
 */
function getNextBreakthroughCost(currentLevel) {
  let offset = currentLevel || 0;
  for (const realm of CULTIVATION_REALMS) {
    if (offset < realm.layers) {
      const cost = realm.baseCost + offset * realm.costIncrement;
      const targetDisplay = offset === 0
        ? `${realm.name}1层`
        : `${realm.name}${offset + 1}层`;
      return { cost, target: targetDisplay };
    }
    offset -= realm.layers;
  }
  return null;
}

/**
 * 判断突破是否为大境界跨越（当前境界最后一层→下一境界第一层）
 * @param {number} currentLevel - 当前等级编号
 * @returns {{ isMajor: boolean, fromRealm: string, toRealm: string, message: string } | null}
 */
function getBreakthroughInfo(currentLevel) {
  const current = getCultivationDisplay(currentLevel || 0);
  const next = getCultivationDisplay((currentLevel || 0) + 1);

  // 是否跨越大境界（境界名变化）
  const isMajor = current.realm !== next.realm && current.realm !== '凡人';

  if (isMajor) {
    const message = BREAKTHROUGH_MESSAGES[current.realm] || '你突破了！';
    return {
      isMajor: true,
      fromRealm: current.realm,
      toRealm: next.realm,
      message,
    };
  }

  // 小境界突破：随机选一条描述
  const realmName = next.realm === '凡人' ? '练气' : next.realm;
  const changes = REALM_CHANGES[realmName] || ['修为有所提升'];
  const message = changes[Math.floor(Math.random() * changes.length)];
  return {
    isMajor: false,
    fromRealm: current.realm,
    toRealm: next.realm,
    message,
  };
}


// ============================================================
// 三、用户评级（根据非心境属性的深度计算）
// ============================================================

// 心境类属性（可手动调整，不计入评级）
const MIND_ATTRS = ['精神', '心情', '意志力', '专注力', '精力'];

const USER_RATINGS = [
  { min: 0,    max: 50,    label: '平民' },
  { min: 51,   max: 150,   label: '新秀' },
  { min: 151,  max: 300,   label: '英才' },
  { min: 301,  max: 500,   label: '精英' },
  { min: 501,  max: 800,   label: '俊杰' },
  { min: 801,  max: 1200,  label: '大师' },
  { min: 1201, max: 1800,  label: '宗师' },
  { min: 1801, max: 2800,  label: '传奇' },
  { min: 2801, max: Infinity, label: '神话' },
];

/**
 * 根据非心境属性的深度计算用户评级
 * 公式：得分 = 平均值 × ln(属性数量) × 2
 * 心境属性（精神/心情/意志力/专注力/精力）不计入评级
 * @param {number} nonMentalSum - 非心境属性值总和
 * @param {number} nonMentalCount - 非心境属性数量
 * @returns {string} 评级标签
 */
function getUserRating(nonMentalSum, nonMentalCount) {
  if (!nonMentalCount || nonMentalCount <= 0) return '平民';
  const average = nonMentalSum / nonMentalCount;
  const score = average * Math.log(nonMentalCount) * 2;
  for (const item of USER_RATINGS) {
    if (score >= item.min && score <= item.max) return item.label;
  }
  return '平民';
}

/**
 * 计算评级数值得分
 * @param {number} nonMentalSum - 非心境属性值总和
 * @param {number} nonMentalCount - 非心境属性数量
 * @returns {number} 评级得分
 */
function getRatingScore(nonMentalSum, nonMentalCount) {
  if (!nonMentalCount || nonMentalCount <= 0) return 0;
  return (nonMentalSum / nonMentalCount) * Math.log(nonMentalCount) * 2;
}

/**
 * 计算评级进度信息（当前段位、下一段位、进度百分比）
 * @param {number} score - 评级得分
 * @param {string} rating - 当前评级标签
 * @returns {{ currentTier, nextTier, ratingPct, nextRatingLabel, ratingTiers }}
 */
function getRatingProgress(score, rating) {
  const currentTier = USER_RATINGS.find(r => r.label === rating);
  const tierIndex = USER_RATINGS.indexOf(currentTier);
  const nextTier = tierIndex < USER_RATINGS.length - 1 ? USER_RATINGS[tierIndex + 1] : null;
  const ratingPct = nextTier
    ? Math.min(Math.round((score - currentTier.min) / (nextTier.min - currentTier.min) * 100), 100)
    : 100;
  const nextRatingLabel = nextTier ? nextTier.label : '已满级';
  const ratingTiers = USER_RATINGS.map(r => ({
    label: r.label,
    range: r.max === Infinity ? `${r.min}+` : `${r.min}-${r.max}`,
    active: r.label === rating,
  }));
  return { currentTier, nextTier, ratingPct, nextRatingLabel, ratingTiers };
}


// ============================================================
// 四、属性衰减逻辑
// ============================================================

/**
 * 属性衰减配置
 * - decayDays: 连续未提升天数阈值（默认7天）
 * - decayRate: 每天衰减比例（默认5%）
 * - decayMin: 衰减最低值（默认1）
 */
const DECAY_CONFIG = {
  decayDays: 7,
  decayRate: 0.05,
  decayMin: 1,
};

/**
 * 计算属性衰减值
 * @param {number} value - 当前属性值
 * @param {number} daysSinceLastImprove - 距上次提升的天数
 * @returns {{ newValue: number, decayAmount: number }}
 */
function calculateDecay(value, daysSinceLastImprove) {
  if (daysSinceLastImprove < DECAY_CONFIG.decayDays) {
    return { newValue: value, decayAmount: 0 };
  }

  // 超过阈值天数后，每天衰减 decayRate
  const excessDays = daysSinceLastImprove - DECAY_CONFIG.decayDays + 1;
  let newValue = value;
  let totalDecay = 0;

  for (let i = 0; i < excessDays; i++) {
    const decay = Math.max(1, Math.floor(newValue * DECAY_CONFIG.decayRate));
    if (newValue - decay < DECAY_CONFIG.decayMin) {
      totalDecay += newValue - DECAY_CONFIG.decayMin;
      newValue = DECAY_CONFIG.decayMin;
      break;
    }
    newValue -= decay;
    totalDecay += decay;
  }

  return { newValue, decayAmount: totalDecay };
}


// ============================================================
// 五、数值颜色（用于前端渲染）
// ============================================================

/**
 * 根据属性值返回对应的颜色标识
 * @param {number} value - 属性值
 * @returns {string} 颜色标识
 */
function getValColor(value) {
  if (value <= 10) return 'red';
  if (value <= 30) return 'orange';
  if (value <= 60) return 'blue';
  if (value <= 100) return 'green';
  if (value <= 200) return 'purple';
  if (value <= 500) return 'deepblue';
  return 'gold';
}

/**
 * 根据属性值返回对应的 CSS 类名（文字颜色）
 */
function getValClass(value) {
  if (value <= 10) return 'val-10';
  if (value <= 30) return 'val-30';
  if (value <= 60) return 'val-60';
  if (value <= 100) return 'val-100';
  if (value <= 200) return 'val-200';
  if (value <= 500) return 'val-bg-500';
  return 'val-max';
}

/**
 * 根据属性值返回对应的 CSS 类名（背景颜色）
 */
function getValBgClass(value) {
  if (value <= 10) return 'val-bg-10';
  if (value <= 30) return 'val-bg-30';
  if (value <= 60) return 'val-bg-60';
  if (value <= 100) return 'val-bg-100';
  if (value <= 200) return 'val-bg-200';
  if (value <= 500) return 'val-bg-500';
  return 'val-bg-max';
}


// ============================================================
// 导出（兼容云函数和小程序前端）
// ============================================================
module.exports = {
  // 等级系统
  STD_LEVELS,
  KNOWLEDGE_LEVELS,
  BODY_LEVELS,
  MENTAL_LEVELS,
  WILLPOWER_LEVELS,
  MOOD_LEVELS,
  CUSTOM_LEVEL_MAP,
  getLevel,
  // 修仙体系
  CULTIVATION_REALMS,
  BREAKTHROUGH_MESSAGES,
  MAJOR_BREAKTHROUGH_FAIL_RATES,
  BREAKTHROUGH_FAIL_MESSAGES,
  BREAKTHROUGH_BOOSTS,
  REALM_CHANGES,
  getCultivationDisplay,
  getNextBreakthroughCost,
  getBreakthroughInfo,
  // 用户评级
  MIND_ATTRS,
  USER_RATINGS,
  getUserRating,
  getRatingScore,
  getRatingProgress,
  // 属性衰减
  DECAY_CONFIG,
  calculateDecay,
  // 工具
  getValColor,
  getValClass,
  getValBgClass,
};
