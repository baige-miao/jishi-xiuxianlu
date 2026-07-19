/**
 * 塔罗牌数据模块
 * 包含78张塔罗牌的名称、图标、正位/逆位含义
 *
 * 数据结构：
 * - majorArcana: 大阿尔卡纳（22张）
 * - minorArcana: 小阿尔卡纳（56张，4组×14张）
 * - spreads: 牌阵定义
 */

// ============================================================
// 一、大阿尔卡纳（Major Arcana）- 22张
// ============================================================
const MAJOR_ARCANA = [
  {
    id: 0,
    name: '愚者',
    icon: '🃏',
    element: '风',
    upright: '新开始、冒险、天真、自由、无限可能',
    reversed: '鲁莽、冒险、不计后果、缺乏计划',
    description: '愚者代表新的开始和无限的可能性。他带着纯真的心态踏上旅程，不被过去所束缚。',
  },
  {
    id: 1,
    name: '魔术师',
    icon: '🎩',
    element: '风',
    upright: '意志力、创造力、技能、自信、实现目标',
    reversed: '欺骗、操纵、能力不足、缺乏自信',
    description: '魔术师拥有将想法变为现实的能力。他掌握着四大元素的力量，象征着创造力和行动力。',
  },
  {
    id: 2,
    name: '女祭司',
    icon: '🌙',
    element: '水',
    upright: '直觉、潜意识、神秘、内在智慧、静待时机',
    reversed: '忽视直觉、缺乏内在声音、表面化',
    description: '女祭司代表潜意识和直觉的力量。她坐在明暗两柱之间，象征着平衡和内在的智慧。',
  },
  {
    id: 3,
    name: '女皇',
    icon: '👑',
    element: '土',
    upright: '丰饶、母性、自然、感官享受、创造力',
    reversed: '过度依赖、缺乏安全感、创造力受阻',
    description: '女皇是大地之母，代表丰饶和创造力。她象征着自然的力量和生命的滋养。',
  },
  {
    id: 4,
    name: '皇帝',
    icon: '🏛️',
    element: '火',
    upright: '权威、结构、稳定、领导力、规则',
    reversed: '专制、僵化、缺乏灵活性、控制欲',
    description: '皇帝是权威和秩序的象征。他建立规则和结构，提供稳定和安全。',
  },
  {
    id: 5,
    name: '教皇',
    icon: '📿',
    element: '土',
    upright: '传统、信仰、教育、精神指导、智慧传承',
    reversed: '教条主义、叛逆、缺乏信仰、非传统',
    description: '教皇是精神导师，代表传统和信仰。他传递智慧和精神上的指导。',
  },
  {
    id: 6,
    name: '恋人',
    icon: '💕',
    element: '风',
    upright: '爱情、选择、和谐、关系、价值观',
    reversed: '不和谐、错误选择、价值观冲突、分离',
    description: '恋人代表爱情和选择。它象征着重要的决定和人际关系中的和谐。',
  },
  {
    id: 7,
    name: '战车',
    icon: '⚔️',
    element: '水',
    upright: '意志力、胜利、决心、自律、前进',
    reversed: '缺乏方向、失控、挫败、缺乏意志力',
    description: '战车代表胜利和决心。驾驭者通过意志力控制对立的力量，勇往直前。',
  },
  {
    id: 8,
    name: '力量',
    icon: '🦁',
    element: '火',
    upright: '勇气、耐心、内在力量、慈悲、柔克刚',
    reversed: '自我怀疑、软弱、缺乏自信、恐惧',
    description: '力量代表内在的力量和勇气。女性驯服狮子，象征着以柔克刚的智慧。',
  },
  {
    id: 9,
    name: '隐士',
    icon: '🏔️',
    element: '土',
    upright: '内省、孤独、智慧、寻求真理、指引',
    reversed: '孤立、逃避、固执、拒绝帮助',
    description: '隐士代表内省和寻求真理。他提着灯笼在黑暗中寻找智慧和方向。',
  },
  {
    id: 10,
    name: '命运之轮',
    icon: '🎡',
    element: '火',
    upright: '命运、转折、循环、机遇、好运',
    reversed: '坏运、抗拒改变、失控、破坏循环',
    description: '命运之轮代表生命的循环和变化。它提醒我们命运的起伏和机遇的到来。',
  },
  {
    id: 11,
    name: '正义',
    icon: '⚖️',
    element: '风',
    upright: '公平、真相、因果、平衡、法律',
    reversed: '不公正、欺骗、逃避责任、不诚实',
    description: '正义代表公平和真相。她手持天平和剑，象征着平衡和因果报应。',
  },
  {
    id: 12,
    name: '倒吊人',
    icon: '🙃',
    element: '水',
    upright: '牺牲、放慢脚步、新视角、放手、等待',
    reversed: '拖延、抗拒、自私、不愿牺牲',
    description: '倒吊人代表牺牲和新的视角。他自愿倒挂，从不同的角度看世界。',
  },
  {
    id: 13,
    name: '死神',
    icon: '💀',
    element: '水',
    upright: '结束与转变、放下、新生、转型',
    reversed: '抗拒改变、停滞不前、恐惧转变',
    description: '死神代表结束和新的开始。它不是字面上的死亡，而是象征着转变和重生。',
  },
  {
    id: 14,
    name: '节制',
    icon: '🏺',
    element: '火',
    upright: '平衡、耐心、适度、融合、和谐',
    reversed: '失衡、过度、缺乏耐心、冲突',
    description: '节制代表平衡和适度。天使在两杯之间倒水，象征着融合和和谐。',
  },
  {
    id: 15,
    name: '恶魔',
    icon: '😈',
    element: '土',
    upright: '束缚、诱惑、物质主义、执着、阴影',
    reversed: '解脱、释放、克服诱惑、觉醒',
    description: '恶魔代表束缚和诱惑。它提醒我们物质主义和欲望的陷阱。',
  },
  {
    id: 16,
    name: '塔',
    icon: '🗼',
    element: '火',
    upright: '突变、毁灭、觉醒、解放、真相',
    reversed: '逃避灾难、恐惧改变、延迟痛苦',
    description: '塔代表突然的变化和觉醒。它象征着旧有结构的崩塌和真相的揭示。',
  },
  {
    id: 17,
    name: '星星',
    icon: '⭐',
    element: '风',
    upright: '希望、灵感、平静、信仰、治愈',
    reversed: '失望、缺乏信心、绝望、断开连接',
    description: '星星代表希望和灵感。女性在星空下倒水，象征着治愈和精神上的更新。',
  },
  {
    id: 18,
    name: '月亮',
    icon: '🌕',
    element: '水',
    upright: '幻觉、恐惧、潜意识、迷惑、直觉',
    reversed: '释放恐惧、清晰、误解被消除',
    description: '月亮代表潜意识和幻觉。它提醒我们要面对内心的恐惧和迷惑。',
  },
  {
    id: 19,
    name: '太阳',
    icon: '☀️',
    element: '火',
    upright: '快乐、成功、活力、真相、乐观',
    reversed: '暂时的挫折、过度乐观、缺乏清晰',
    description: '太阳代表快乐和成功。它象征着光明、活力和积极的能量。',
  },
  {
    id: 20,
    name: '审判',
    icon: '📯',
    element: '火',
    upright: '觉醒、重生、反思、召唤、评估',
    reversed: '自我怀疑、拒绝反思、逃避评估',
    description: '审判代表觉醒和重生。天使吹响号角，召唤人们反思和评估自己的人生。',
  },
  {
    id: 21,
    name: '世界',
    icon: '🌍',
    element: '土',
    upright: '完成、圆满、成就、旅程结束、整合',
    reversed: '未完成、缺乏闭合、延迟完成',
    description: '世界代表完成和圆满。它象征着一个旅程的结束和新旅程的开始。',
  },
];

// ============================================================
// 二、小阿尔卡纳（Minor Arcana）- 56张
// ============================================================

// 花色定义
const SUITS = {
  wands: {
    name: '权杖',
    icon: '🪄',
    element: '火',
    theme: '行动/意志/创造',
  },
  cups: {
    name: '圣杯',
    icon: '🏆',
    element: '水',
    theme: '情感/关系/直觉',
  },
  swords: {
    name: '宝剑',
    icon: '⚔️',
    element: '风',
    theme: '思维/冲突/真相',
  },
  pentacles: {
    name: '星币',
    icon: '💰',
    element: '土',
    theme: '物质/财富/身体',
  },
};

// 数字牌定义
const NUMBER_CARDS = [
  { name: 'Ace', value: 1, meaning: '新的开始、潜力、起源' },
  { name: '二', value: 2, meaning: '平衡、对立、选择' },
  { name: '三', value: 3, meaning: '成长、初步成果、合作' },
  { name: '四', value: 4, meaning: '稳定、基础、休息' },
  { name: '五', value: 5, meaning: '冲突、挑战、变化' },
  { name: '六', value: 6, meaning: '和谐、交流、回馈' },
  { name: '七', value: 7, meaning: '内在反思、考验、挑战' },
  { name: '八', value: 8, meaning: '运动、行动力、力量' },
  { name: '九', value: 9, meaning: '接近完成、收获、满足' },
  { name: '十', value: 10, meaning: '完成、循环结束、负担' },
];

// 宫廷牌定义
const COURT_CARDS = [
  { name: '侍从', role: 'Page', meaning: '消息、新开始、学习者' },
  { name: '骑士', role: 'Knight', meaning: '行动、追求、变化' },
  { name: '王后', role: 'Queen', meaning: '直觉、滋养、内在力量' },
  { name: '国王', role: 'King', meaning: '权威、掌控、外在力量' },
];

/**
 * 生成小阿尔卡纳牌组
 * @returns {Array} 56张小阿尔卡纳牌
 */
function generateMinorArcana() {
  const cards = [];
  let id = 22; // 从22开始（大阿尔卡纳0-21）

  for (const [suitKey, suit] of Object.entries(SUITS)) {
    // 数字牌
    for (const num of NUMBER_CARDS) {
      cards.push({
        id: id++,
        name: `${suit.name}${num.name}`,
        suit: suitKey,
        suitName: suit.name,
        icon: suit.icon,
        element: suit.element,
        value: num.value,
        type: 'number',
        upright: `${num.meaning}（${suit.theme}）`,
        reversed: `${num.meaning}的阻碍或过度（${suit.theme}）`,
        description: `${suit.name}${num.name}代表${suit.theme}领域中${num.meaning}的能量。`,
      });
    }

    // 宫廷牌
    for (const court of COURT_CARDS) {
      cards.push({
        id: id++,
        name: `${suit.name}${court.name}`,
        suit: suitKey,
        suitName: suit.name,
        icon: suit.icon,
        element: suit.element,
        role: court.role,
        type: 'court',
        upright: `${court.meaning}（${suit.theme}）`,
        reversed: `${court.meaning}的阻碍或过度（${suit.theme}）`,
        description: `${suit.name}${court.name}代表${suit.theme}领域中${court.meaning}的能量。`,
      });
    }
  }

  return cards;
}

// 生成完整的小阿尔卡纳
const MINOR_ARCANA = generateMinorArcana();

// ============================================================
// 三、完整牌组（78张）
// ============================================================
const ALL_CARDS = [...MAJOR_ARCANA, ...MINOR_ARCANA];

// ============================================================
// 四、牌阵定义
// ============================================================
const SPREADS = {
  single: {
    name: '单张牌',
    description: '最简单的牌阵，抽一张牌直接回答问题',
    count: 1,
    positions: [
      { name: '答案', description: '直接回答你的问题' },
    ],
  },
  threeCard: {
    name: '三张牌',
    description: '经典的三张牌阵，了解过去、现在和未来',
    count: 3,
    positions: [
      { name: '过去', description: '问题的根源或过去的影响' },
      { name: '现在', description: '当前的状况' },
      { name: '未来', description: '可能的发展方向' },
    ],
  },
  celticCross: {
    name: '凯尔特十字',
    description: '最经典的牌阵，全面深入地分析问题',
    count: 10,
    positions: [
      { name: '现状', description: '当前的核心状况' },
      { name: '挑战', description: '当前面临的阻碍或挑战' },
      { name: '根源', description: '问题的根源或过去的影响' },
      { name: '近期过去', description: '最近发生的事情' },
      { name: '目标', description: '潜意识中的目标或期望' },
      { name: '近期未来', description: '即将发生的事情' },
      { name: '自我态度', description: '你对此事的看法' },
      { name: '环境影响', description: '外部环境的影响' },
      { name: '希望与恐惧', description: '内心深处的希望和恐惧' },
      { name: '最终结果', description: '事情的可能走向' },
    ],
  },
};

// ============================================================
// 五、工具函数
// ============================================================

/**
 * Fisher-Yates 洗牌算法
 * @param {Array} array - 要洗牌的数组
 * @returns {Array} 洗牌后的数组
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 抽牌
 * @param {number} count - 抽牌数量
 * @returns {Array} 抽到的牌（包含正逆位）
 */
function drawCards(count) {
  const shuffled = shuffleArray(ALL_CARDS);
  const drawn = shuffled.slice(0, count);

  return drawn.map(card => {
    const isReversed = Math.random() < 0.5;
    return {
      ...card,
      isReversed,
      orientation: isReversed ? '逆位' : '正位',
    };
  });
}

/**
 * 获取牌的解读
 * @param {Object} card - 牌对象
 * @returns {string} 解读文本
 */
function getCardReading(card) {
  const orientation = card.isReversed ? '逆位' : '正位';
  const meaning = card.isReversed ? card.reversed : card.upright;

  return `【${card.name}（${orientation}）】\n${meaning}\n\n${card.description}`;
}

/**
 * 获取牌阵解读
 * @param {Array} cards - 抽到的牌
 * @param {string} spreadType - 牌阵类型
 * @returns {string} 完整解读
 */
function getSpreadReading(cards, spreadType) {
  const spread = SPREADS[spreadType];
  if (!spread) return '未知牌阵';

  let reading = `🔮 ${spread.name}牌阵解读\n`;
  reading += '━'.repeat(20) + '\n\n';

  cards.forEach((card, index) => {
    const position = spread.positions[index];
    const orientation = card.isReversed ? '逆位' : '正位';
    const meaning = card.isReversed ? card.reversed : card.upright;

    reading += `📍 ${position.name}：${position.description}\n`;
    reading += `🃏 ${card.icon} ${card.name}（${orientation}）\n`;
    reading += `📖 ${meaning}\n\n`;
  });

  reading += '━'.repeat(20) + '\n';
  reading += '💡 提示：复制以上结果，可粘贴到AI助手获取更详细的解读。';

  return reading;
}

// ============================================================
// 导出
// ============================================================
module.exports = {
  MAJOR_ARCANA,
  MINOR_ARCANA,
  ALL_CARDS,
  SUITS,
  SPREADS,
  shuffleArray,
  drawCards,
  getCardReading,
  getSpreadReading,
};
