// 云函数入口文件 - 八字流日运势（v2：身强弱+喜忌分析）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ==================== 基础数据 ====================

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const GAN_WUXING = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' }
const ZHI_WUXING = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' }
const GAN_YINYANG = { '甲': 0, '乙': 1, '丙': 0, '丁': 1, '戊': 0, '己': 1, '庚': 0, '辛': 1, '壬': 0, '癸': 1 }

// 五行生克
const WUXING_SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' } // 我生
const WUXING_SHENG_WO = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' } // 生我
const WUXING_KE = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' } // 我克
const WUXING_KE_WO = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' } // 克我

// 十神分类（按对日主的作用）
// 生扶：比肩、劫财、正印、偏印
// 克泄耗：正官、七杀、食神、伤官、正财、偏财

// ==================== 身强身弱判断 ====================

/**
 * 判断十神类别：'self'=比劫, 'resource'=印星, 'output'=食伤, 'wealth'=财星, 'authority'=官杀
 */
function getShishenCategory(riWuxing, targetGan) {
  const targetWuxing = GAN_WUXING[targetGan]
  if (riWuxing === targetWuxing) return 'self' // 比肩劫财
  if (WUXING_SHENG_WO[riWuxing] === targetWuxing) return 'resource' // 印星（生我）
  if (WUXING_SHENG[riWuxing] === targetWuxing) return 'output' // 食伤（我生）
  if (WUXING_KE[riWuxing] === targetWuxing) return 'wealth' // 财星（我克）
  if (WUXING_KE_WO[riWuxing] === targetWuxing) return 'authority' // 官杀（克我）
  return 'unknown'
}

/**
 * 地支藏干表（简化版：取本气+中气）
 */
const ZHI_CANG_GAN = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
  '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
  '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
}

/**
 * 判断身强身弱
 * 依据：月令（最重要）+ 其他干支对日主的生扶/克泄耗
 * 返回：'strong' 或 'weak'
 *
 * 权重设计：
 * - 月令藏干：每个 ±3（月令权重最高）
 * - 其他天干：每个 ±1.5
 * - 其他地支藏干：本气 ±1.5，中气 ±0.5，余气 ±0.3
 */
function judgeStrength(bazi) {
  const riGan = bazi.day.charAt(0)
  const riWuxing = GAN_WUXING[riGan]
  const monthZhi = bazi.month.charAt(1) // 月支（月令）

  // 月令藏干对日主的作用（权重最高）
  let monthScore = 0
  const monthCangGans = ZHI_CANG_GAN[monthZhi] || []
  for (const cg of monthCangGans) {
    const cat = getShishenCategory(riWuxing, cg)
    if (cat === 'self' || cat === 'resource') monthScore += 3
    else if (cat === 'output' || cat === 'wealth' || cat === 'authority') monthScore -= 3
  }

  // 其他干支计分
  let otherScore = 0
  const pillars = [
    { gan: bazi.year.charAt(0), zhi: bazi.year.charAt(1) },
    { gan: bazi.month.charAt(0), zhi: null }, // 月支已算过
    { gan: bazi.day.charAt(0), zhi: bazi.day.charAt(1) },
  ]
  if (bazi.hour) {
    pillars.push({ gan: bazi.hour.charAt(0), zhi: bazi.hour.charAt(1) })
  }

  for (const p of pillars) {
    // 天干
    const ganCat = getShishenCategory(riWuxing, p.gan)
    if (ganCat === 'self' || ganCat === 'resource') otherScore += 1.5
    else if (ganCat === 'output' || ganCat === 'wealth' || ganCat === 'authority') otherScore -= 1.5

    // 地支藏干（本气权重高）
    if (p.zhi) {
      const cangGans = ZHI_CANG_GAN[p.zhi] || []
      const weights = [1.5, 0.5, 0.3] // 本气、中气、余气
      for (let i = 0; i < cangGans.length; i++) {
        const cat = getShishenCategory(riWuxing, cangGans[i])
        const w = weights[i] || 0.3
        if (cat === 'self' || cat === 'resource') otherScore += w
        else if (cat === 'output' || cat === 'wealth' || cat === 'authority') otherScore -= w
      }
    }
  }

  const total = monthScore + otherScore
  return total >= 0 ? 'strong' : 'weak'
}

/**
 * 根据身强弱确定喜用神五行
 * 身强：喜克泄耗（官杀、食伤、财星的五行）
 * 身弱：喜生扶（印星、比劫的五行）
 */
function getXiYong(riWuxing, strength) {
  if (strength === 'strong') {
    // 身强喜克泄耗
    return {
      xi: [WUXING_KE_WO[riWuxing], WUXING_SHENG[riWuxing], WUXING_KE[riWuxing]], // 克我、我生、我克
      ji: [riWuxing, WUXING_SHENG_WO[riWuxing]], // 同我、生我
      strength: '身强',
      strengthDesc: '日主得令得势，自身力量充沛，喜克泄耗以平衡，忌再生扶'
    }
  } else {
    // 身弱喜生扶
    return {
      xi: [WUXING_SHENG_WO[riWuxing], riWuxing], // 生我、同我
      ji: [WUXING_KE_WO[riWuxing], WUXING_SHENG[riWuxing], WUXING_KE[riWuxing]], // 克我、我生、我克
      strength: '身弱',
      strengthDesc: '日主失令失势，自身力量不足，喜生扶以补益，忌克泄耗'
    }
  }
}

// ==================== 十神判断 ====================

function getShishen(riZhuGan, targetGan) {
  const riWuxing = GAN_WUXING[riZhuGan]
  const targetWuxing = GAN_WUXING[targetGan]
  const sameYinYang = (GAN_YINYANG[riZhuGan] === GAN_YINYANG[targetGan])

  if (riWuxing === targetWuxing) return sameYinYang ? '比肩' : '劫财'
  if (WUXING_SHENG[riWuxing] === targetWuxing) return sameYinYang ? '食神' : '伤官'
  if (WUXING_SHENG_WO[riWuxing] === targetWuxing) return sameYinYang ? '偏印' : '正印'
  if (WUXING_KE[riWuxing] === targetWuxing) return sameYinYang ? '偏财' : '正财'
  if (WUXING_KE_WO[riWuxing] === targetWuxing) return sameYinYang ? '七杀' : '正官'
  return '未知'
}

/**
 * 判断某五行对日主是喜神还是忌神
 */
function isXiOrJi(riWuxing, targetWuxing, xiyong) {
  if (xiyong.xi.includes(targetWuxing)) return '喜神'
  if (xiyong.ji.includes(targetWuxing)) return '忌神'
  return '中性'
}

// ==================== 地支关系 ====================

/**
 * 地支六合
 */
const LIU_HE = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午'
}

/**
 * 地支半合（取两支）
 */
const BAN_HE = {
  '申子': '水', '子辰': '水', '申辰': '水',
  '寅午': '火', '午戌': '火', '寅戌': '火',
  '巳酉': '金', '酉丑': '金', '巳丑': '金',
  '亥卯': '木', '卯未': '木', '亥未': '木'
}

/**
 * 地支六冲
 */
const LIU_CHONG = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳'
}

/**
 * 分析流日地支与命局地支的关系
 */
function analyzeZhiRelations(bazi, liuriZhi) {
  const relations = []
  const zhiList = [
    { name: '年支', zhi: bazi.year.charAt(1) },
    { name: '月支', zhi: bazi.month.charAt(1) },
    { name: '日支', zhi: bazi.day.charAt(1) },
  ]
  if (bazi.hour) {
    zhiList.push({ name: '时支', zhi: bazi.hour.charAt(1) })
  }

  for (const item of zhiList) {
    const bz = item.zhi
    if (!bz) continue

    // 六合
    if (LIU_HE[liuriZhi] === bz) {
      const heWuxing = getHeWuxing(liuriZhi, bz)
      relations.push({ target: item.name, type: '六合', detail: `${liuriZhi}${bz}六合化${heWuxing}` })
    }

    // 半合
    const banHeKey1 = liuriZhi + bz
    const banHeKey2 = bz + liuriZhi
    if (BAN_HE[banHeKey1]) {
      relations.push({ target: item.name, type: '半合', detail: `${liuriZhi}${bz}半合${BAN_HE[banHeKey1]}局` })
    } else if (BAN_HE[banHeKey2]) {
      relations.push({ target: item.name, type: '半合', detail: `${bz}${liuriZhi}半合${BAN_HE[banHeKey2]}局` })
    }

    // 六冲
    if (LIU_CHONG[liuriZhi] === bz) {
      relations.push({ target: item.name, type: '六冲', detail: `${liuriZhi}${bz}相冲` })
    }
  }

  return relations
}

/**
 * 六合化五行
 */
function getHeWuxing(z1, z2) {
  const pair = z1 + z2
  const map = { '子丑': '土', '丑子': '土', '寅亥': '木', '亥寅': '木', '卯戌': '火', '戌卯': '火', '辰酉': '金', '酉辰': '金', '巳申': '水', '申巳': '水', '午未': '土', '未午': '土' }
  return map[pair] || ''
}

// ==================== 计算日柱干支 ====================

function calcDayGanzhi(dateStr) {
  const target = new Date(dateStr + 'T00:00:00+08:00')
  const base = new Date('2000-01-01T00:00:00+08:00')
  const diffMs = target.getTime() - base.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  const ganIdx = ((4 + diffDays) % 10 + 10) % 10
  const zhiIdx = ((6 + diffDays) % 12 + 12) % 12
  const gan = TIAN_GAN[ganIdx]
  const zhi = DI_ZHI[zhiIdx]
  return { gan, zhi, ganzhi: gan + zhi, wuxingGan: GAN_WUXING[gan], wuxingZhi: ZHI_WUXING[zhi] }
}

// ==================== 综合分析 ====================

/**
 * 生成流日运势分析
 */
function analyzeFortune(bazi, liuri, hasHour) {
  const riGan = bazi.day.charAt(0)
  const riWuxing = GAN_WUXING[riGan]

  // 1. 身强身弱
  const strength = judgeStrength(bazi)
  const xiyong = getXiYong(riWuxing, strength)

  // 2. 流日天干十神 + 喜忌
  const liuriShishen = getShishen(riGan, liuri.gan)
  const liuriGanXiJi = isXiOrJi(riWuxing, liuri.wuxingGan, xiyong)

  // 3. 流日地支五行喜忌
  const liuriZhiXiJi = isXiOrJi(riWuxing, liuri.wuxingZhi, xiyong)

  // 4. 地支关系分析
  const zhiRelations = analyzeZhiRelations(bazi, liuri.zhi)

  // 5. 地支关系对喜忌的影响（半合化出的五行如果改变喜忌需要调整）
  let zhiXiJiAdjusted = liuriZhiXiJi
  let zhiRelationEffect = ''
  for (const rel of zhiRelations) {
    if (rel.type === '半合' || rel.type === '六合') {
      // 合化后的五行
      const heWuxing = rel.detail.match(/化(.)/)?.[1] || ''
      if (heWuxing) {
        const heXiJi = isXiOrJi(riWuxing, heWuxing, xiyong)
        if (heXiJi === '忌神') {
          zhiXiJiAdjusted = '忌神'
          zhiRelationEffect += `${rel.detail}，化出忌神${heWuxing}，泄身。`
        } else if (heXiJi === '喜神') {
          zhiRelationEffect += `${rel.detail}，化出喜神${heWuxing}，有利。`
        }
      }
    }
  }

  // 6. 天干关系分析（流日天干与命局天干的克制）
  const ganRelations = []
  const pillarGans = [
    { name: '年干', gan: bazi.year.charAt(0) },
    { name: '月干', gan: bazi.month.charAt(0) },
  ]
  if (hasHour) {
    pillarGans.push({ name: '时干', gan: bazi.hour.charAt(0) })
  }
  for (const pg of pillarGans) {
    // 流日天干被命局天干克制？
    const pgWuxing = GAN_WUXING[pg.gan]
    // 命局天干克流日天干
    if (WUXING_KE[pgWuxing] === liuri.wuxingGan) {
      const pgShishen = getShishen(riGan, pg.gan)
      ganRelations.push({ name: pg.name, gan: pg.gan, effect: `${pg.gan}${pgShishen}克制流日${liuri.gan}，减轻${liuriShishen}压力` })
    }
    // 流日天干克命局天干
    if (WUXING_KE[liuri.wuxingGan] === pgWuxing) {
      const pgShishen = getShishen(riGan, pg.gan)
      ganRelations.push({ name: pg.name, gan: pg.gan, effect: `流日${liuri.gan}克制${pg.gan}${pgShishen}` })
    }
  }

  // 7. 综合评分
  let score = 50

  // 天干部分
  if (liuriGanXiJi === '喜神') score += 15
  else if (liuriGanXiJi === '忌神') score -= 15

  // 地支部分（考虑合化调整后）
  if (zhiXiJiAdjusted === '喜神') score += 12
  else if (zhiXiJiAdjusted === '忌神') score -= 12

  // 地支关系修正
  for (const rel of zhiRelations) {
    if (rel.type === '六冲') score -= 5
    if (rel.type === '六合' && zhiRelationEffect.includes('忌神')) score -= 3
    if (rel.type === '半合' && zhiRelationEffect.includes('忌神')) score -= 3
  }

  // 天干关系修正（命局天干克制流日天干=减轻压力）
  for (const gr of ganRelations) {
    if (gr.effect.includes('减轻')) score += 5
  }

  // 时柱
  if (hasHour) {
    const hourGanWuxing = GAN_WUXING[bazi.hour.charAt(0)]
    const hourXiJi = isXiOrJi(riWuxing, hourGanWuxing, xiyong)
    if (hourXiJi === '喜神') score += 5
    else if (hourXiJi === '忌神') score -= 5
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  // 8. 运势等级
  let level
  if (score >= 75) level = '大吉'
  else if (score >= 60) level = '吉'
  else if (score >= 45) level = '平'
  else if (score >= 30) level = '凶'
  else level = '大凶'

  // 9. 生成摘要
  const summary = generateSummary(liuriShishen, liuriGanXiJi, liuriZhiXiJi, strength, zhiRelationEffect)

  // 10. 生成五行分析
  const wuxingDetail = generateWuxingDetail(liuri, riGan, riWuxing, strength, xiyong, liuriShishen, liuriGanXiJi, liuriZhiXiJi, zhiRelations, zhiRelationEffect, ganRelations, hasHour, bazi.hour)

  // 11. 生成各柱对照
  const pillars = generatePillars(bazi, liuri, riGan, riWuxing, xiyong, strength, hasHour)

  // DEBUG: 打印各柱喜忌
  console.log('=== DEBUG pillars xiJi ===')
  console.log('strength:', strength, 'xiyong.strength:', xiyong.strength)
  for (const p of pillars) {
    console.log(`${p.name}: bazi=${p.bazi}, relation=${p.relation}, xiJi=${p.xiJi}`)
  }

  // 12. 生成宜忌
  const yiji = generateYiji(liuriShishen, liuriGanXiJi, liuriZhiXiJi, zhiRelations, strength, liuri)

  return {
    level, score, liuriShishen, liuriGanXiJi, liuriZhiXiJi,
    strength: xiyong.strength, strengthDesc: xiyong.strengthDesc,
    summary, wuxingDetail, pillars, yiji,
    zhiRelations, ganRelations
  }
}

// ==================== 文字生成 ====================

function generateSummary(shishen, ganXiJi, zhiXiJi, strength, zhiEffect) {
  let text = ''

  // 天干部分
  if (ganXiJi === '忌神') {
    text += `天干${shishen}为忌神，主压力`
  } else if (ganXiJi === '喜神') {
    text += `天干${shishen}为喜神，主助力`
  } else {
    text += `天干${shishen}，影响中性`
  }

  // 地支部分
  if (zhiXiJi === '忌神') {
    text += `；地支五行${zhiXiJi}，耗身`
  } else if (zhiXiJi === '喜神') {
    text += `；地支五行${zhiXiJi}，帮身`
  } else {
    text += `；地支影响中性`
  }

  // 合化效果
  if (zhiEffect) {
    if (zhiEffect.includes('忌神')) {
      text += `。地支合化引动忌神，需留意`
    } else if (zhiEffect.includes('喜神')) {
      text += `。地支合化引动喜神，有利`
    }
  }

  // 综合
  if (ganXiJi === '忌神' && zhiXiJi === '喜神') {
    text += `。天干压力与地支助力交织，运势平偏小吉`
  } else if (ganXiJi === '喜神' && zhiXiJi === '忌神') {
    text += `。天干助力被地支消耗，先好后平`
  } else if (ganXiJi === '忌神' && zhiXiJi === '忌神') {
    text += `。天干地支皆不利，宜低调谨慎`
  } else if (ganXiJi === '喜神' && zhiXiJi === '喜神') {
    text += `。天干地支皆有利，运势向好`
  }

  text += `。（${strength}）`
  return text
}

function generateWuxingDetail(liuri, riGan, riWuxing, strength, xiyong, shishen, ganXiJi, zhiXiJi, zhiRelations, zhiEffect, ganRelations, hasHour, hourPillar) {
  let text = ''

  // 身强弱
  text += `你的日主${riGan}${riWuxing}，${xiyong.strengthDesc}。`

  // 天干分析
  text += `流日${liuri.ganzhi}，天干${liuri.gan}${liuri.wuxingGan}为${shishen}，`
  if (ganXiJi === '忌神') {
    text += `是${strength === 'weak' ? '克泄耗' : '生扶'}日主的${ganXiJi}，带来${shishen === '正官' || shishen === '七杀' ? '压力、约束' : shishen === '食神' || shishen === '伤官' ? '精力消耗、思虑过多' : '财务消耗'}。`
  } else {
    text += `是${strength === 'weak' ? '生扶' : '克泄耗'}日主的${ganXiJi}，${shishen === '正印' || shishen === '偏印' ? '有贵人相助、灵感涌现' : shishen === '比肩' || shishen === '劫财' ? '有人帮忙、精力充沛' : '带来机遇'}。`
  }

  // 地支分析
  text += `地支${liuri.zhi}${liuri.wuxingZhi}为${zhiXiJi}，`
  if (zhiXiJi === '忌神') {
    text += `消耗日主力量。`
  } else {
    text += `补充日主力量。`
  }

  // 地支关系
  if (zhiRelations.length > 0) {
    text += `流日地支${liuri.zhi}与命局：`
    text += zhiRelations.map(r => r.detail).join('；') + '。'
    if (zhiEffect) text += zhiEffect
  }

  // 天干关系
  if (ganRelations.length > 0) {
    text += ganRelations.map(r => r.effect).join('。') + '。'
  }

  return text
}

function generatePillars(bazi, liuri, riGan, riWuxing, xiyong, strength, hasHour) {
  const pillars = []

  const configs = [
    { name: '年柱', bazi: bazi.year },
    { name: '月柱', bazi: bazi.month },
    { name: '日柱', bazi: bazi.day, isSelf: true },
    { name: '时柱', bazi: bazi.hour, skipIfNoHour: true },
  ]

  for (const cfg of configs) {
    if (cfg.skipIfNoHour && !hasHour) continue
    if (!cfg.bazi) continue

    // 日柱特殊处理：天干是自身，地支是日支
    if (cfg.isSelf) {
      const pZhi = cfg.bazi.charAt(1)
      const zhiWuxing = ZHI_WUXING[pZhi]
      const zhiXiJi = isXiOrJi(riWuxing, zhiWuxing, xiyong)
      const cangGan = (ZHI_CANG_GAN[pZhi] || [])[0] || ''
      const zhiShishen = cangGan ? getShishen(riGan, cangGan) : ''
      const detail = `天干${riGan}为自身日主，地支${pZhi}藏${cangGan}${zhiShishen}${zhiXiJi}，${zhiXiJi === '喜神' ? '坐支得力，根基稳固' : '坐支不利，根基不稳，压力常伴'}`
      pillars.push({ name: cfg.name, bazi: cfg.bazi, relation: '自身', xiJi: zhiXiJi, detail })
      continue
    }

    const pGan = cfg.bazi.charAt(0)
    const shishen = getShishen(riGan, pGan)
    const shishenCat = getShishenCategory(riWuxing, pGan)
    const xiJi = (shishenCat === 'self' || shishenCat === 'resource') ?
      (xiyong.strength === 'weak' ? '喜神' : '忌神') :
      (xiyong.strength === 'weak' ? '忌神' : '喜神')

    let detail = ''
    if (xiJi === '喜神') {
      detail = `${shishen}为喜神，${getShishenDetail(shishen, '喜', xiyong.strength)}`
    } else {
      detail = `${shishen}为忌神，${getShishenDetail(shishen, '忌', xiyong.strength)}`
    }

    pillars.push({ name: cfg.name, bazi: cfg.bazi, relation: shishen, xiJi, detail })
  }

  return pillars
}

/**
 * 十神详细解读（区分喜忌，结合身强弱）
 */
function getShishenDetail(shishen, xiJi, strength) {
  const details = {
    '比肩': {
      '喜': '有人相助，合作共赢，精力充沛',
      '忌': strength === 'weak' ? '争夺有限资源，破耗钱财' : '竞争激烈，独立行事'
    },
    '劫财': {
      '喜': '朋友帮忙，借力打力，有人分担',
      '忌': strength === 'weak' ? '钱财流失，被人利用，冲动破财' : '冲动消费，钱财不稳'
    },
    '食神': {
      '喜': '才华展现，享受生活，创意丰富',
      '忌': strength === 'weak' ? '泄身耗气，精力不足，思虑过多' : '安逸懒散，拖延不前'
    },
    '伤官': {
      '喜': '创新突破，表达自我，才华横溢',
      '忌': strength === 'weak' ? '泄身严重，精力透支，口舌消耗' : '叛逆冲动，口舌是非'
    },
    '偏财': {
      '喜': '意外收获，人缘旺盛，把握机会',
      '忌': strength === 'weak' ? '身弱不担财，为财奔波，钱财难留' : '贪心挥霍，钱财不稳'
    },
    '正财': {
      '喜': '正当收入，稳定务实，财运亨通',
      '忌': strength === 'weak' ? '身弱不担财，求财辛苦，身心俱疲' : '吝啬固执，为钱劳碌'
    },
    '七杀': {
      '喜': '魄力十足，挑战成功，突破自我',
      '忌': strength === 'weak' ? '杀重身轻，压力巨大，小人作祟' : '压力过大，健康受损'
    },
    '正官': {
      '喜': '贵人提携，事业有成，地位提升',
      '忌': strength === 'weak' ? '官重身弱，约束压迫，责任过重' : '上司刁难，束手束脚'
    },
    '偏印': {
      '喜': '灵感涌现，偏门得利，贵人暗助',
      '忌': strength === 'weak' ? '枭神夺食，思虑过度，孤僻封闭' : '多疑敏感，偏激执拗'
    },
    '正印': {
      '喜': '贵人相助，学业进步，庇护安稳',
      '忌': strength === 'weak' ? '印重身弱反成依赖，优柔寡断' : '依赖懒惰，错失良机'
    }
  }
  return (details[shishen] && details[shishen][xiJi]) || '影响中性'
}

function generateYiji(shishen, ganXiJi, zhiXiJi, zhiRelations, strength, liuri) {
  const yi = []
  const ji = []

  // 根据天干喜忌
  if (ganXiJi === '忌神') {
    if (shishen === '正官' || shishen === '七杀') {
      ji.push('与权威正面冲突', '硬碰硬')
      yi.push('借力打力', '找朋友帮忙')
    } else if (shishen === '食神' || shishen === '伤官') {
      ji.push('过度思虑', '空想不行动')
      yi.push('动手做事', '运动释放')
    } else if (shishen === '正财' || shishen === '偏财') {
      ji.push('大额投资', '为钱奔波')
      yi.push('量入为出', '务实理财')
    }
  } else if (ganXiJi === '喜神') {
    if (shishen === '正印' || shishen === '偏印') {
      yi.push('求学考试', '拜访贵人', '读书充电')
    } else if (shishen === '比肩' || shishen === '劫财') {
      yi.push('合作洽谈', '社交聚会', '团队协作')
    } else if (shishen === '食神' || shishen === '伤官') {
      yi.push('创作表达', '展示才华', '学习新技能')
    }
  }

  // 根据地支关系
  for (const rel of zhiRelations) {
    if (rel.type === '半合' && rel.detail.includes('火')) {
      ji.push('陷入空想', '思虑过重')
    }
    if (rel.type === '六冲') {
      ji.push('冲动决策', '情绪波动')
      yi.push('冷静观察', '稳中求进')
    }
  }

  // 根据地支喜忌
  if (zhiXiJi === '喜神') {
    yi.push('借助身边资源', '把握地利')
  } else if (zhiXiJi === '忌神') {
    ji.push('单打独斗')
  }

  // 通用补充
  if (strength === 'weak') {
    yi.push('休息养神', '寻求支持')
    ji.push('过度劳累', '逞强硬撑')
  }

  // 去重
  return {
    yi: [...new Set(yi)].slice(0, 5),
    ji: [...new Set(ji)].slice(0, 5)
  }
}

// ==================== 云函数入口 ====================

exports.main = async (event, context) => {
  try {
    const { birth_bazi, target_date } = event

    if (!birth_bazi || !birth_bazi.day) {
      return { ok: false, error: '缺少日柱信息' }
    }
    if (!target_date) {
      return { ok: false, error: '缺少查询日期' }
    }

    const bazi = {
      year: birth_bazi.year || '',
      month: birth_bazi.month || '',
      day: birth_bazi.day,
      hour: birth_bazi.hour || ''
    }
    const hasHour = !!(bazi.hour && bazi.hour.length >= 2)

    // 计算流日干支
    const liuri = calcDayGanzhi(target_date)

    // 综合分析
    const result = analyzeFortune(bazi, liuri, hasHour)

    return {
      ok: true,
      date: target_date,
      liuri: {
        gan: liuri.gan,
        zhi: liuri.zhi,
        ganzhi: liuri.ganzhi,
        wuxingGan: liuri.wuxingGan,
        wuxingZhi: liuri.wuxingZhi
      },
      shishen: result.liuriShishen,
      luck_level: result.level,
      luck_score: result.score,
      strength: result.strength,
      strength_desc: result.strengthDesc,
      summary: result.summary,
      wuxing_detail: result.wuxingDetail,
      pillars: result.pillars,
      yiji: result.yiji,
      has_hour: hasHour
    }
  } catch (err) {
    return { ok: false, error: err.message || '计算出错' }
  }
}
