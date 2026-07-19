/**
 * 云函数：getStats
 * 数据统计 - 需求#9：本周/本月完成数、属性增长曲线、TOP5、灵力累计
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const { getUserRating, getRatingScore, MIND_ATTRS } = require('./levels');

function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const now = new Date();
  const today = getBeijingDateStr(now);

  // 本周起始（周一）— 使用北京时间的星期几
  const todayParts = today.split('-').map(Number);
  const beijingDayOfWeek = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]).getDay() || 7;
  const weekStart = getBeijingDateStr(new Date(now.getTime() - (beijingDayOfWeek - 1) * 24 * 60 * 60 * 1000));
  // 本月起始
  const monthStart = today.slice(0, 7) + '-01';

  try {
    // 获取玩家数据
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, message: '玩家数据不存在' };
    }
    const player = playerRes.data[0];

    // 获取所有日志（用于统计）
    const allLogsRes = await db.collection('logs')
      .where({ _openid: openid })
      .orderBy('log_date', 'desc')
      .limit(1000)
      .get();
    const allLogs = allLogsRes.data;

    // --- 1. 本周完成任务数 ---
    const weekLogs = allLogs.filter(log => log.log_date >= weekStart);
    const weekCount = weekLogs.length;

    // --- 2. 本月完成任务数 ---
    const monthLogs = allLogs.filter(log => log.log_date >= monthStart);
    const monthCount = monthLogs.length;

    // --- 3. 最常完成任务 TOP5 ---
    const taskFrequency = {};
    for (const log of allLogs) {
      taskFrequency[log.task_name] = (taskFrequency[log.task_name] || 0) + 1;
    }
    const top5 = Object.entries(taskFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // --- 4. 灵力累计获取量 ---
    const totalSpiritEarned = player.total_spirit_earned || player.spirit_stone || 0;

    // --- 5. 属性总值与评级（心境属性不计入评级） ---
    const nonMentalAttrs = (player.attrs || []).filter(a => !MIND_ATTRS.includes(a.name));
    const totalAttrSum = (player.attrs || []).reduce((sum, a) => sum + (a.value || 0), 0);
    const nonMentalSum = nonMentalAttrs.reduce((sum, a) => sum + (a.value || 0), 0);
    const userRating = getUserRating(nonMentalSum, nonMentalAttrs.length);
    const ratingScore = getRatingScore(nonMentalSum, nonMentalAttrs.length);

    // --- 5. 属性增长曲线（最近7天和30天） ---
    // 从日志中提取每天的属性变化，计算累计增长
    const attrGrowth7 = buildAttrGrowthCurve(allLogs, 7);
    const attrGrowth30 = buildAttrGrowthCurve(allLogs, 30);

    return {
      ok: true,
      weekCount: weekCount,
      monthCount: monthCount,
      top5: top5,
      spirit_stone: player.spirit_stone || 0,
      totalSpiritEarned: totalSpiritEarned,
      totalAttrSum: totalAttrSum,
      ratingScore: ratingScore,
      userRating: userRating,
      attrGrowth7: attrGrowth7,
      attrGrowth30: attrGrowth30,
    };
  } catch (err) {
    console.error(JSON.stringify({ func: 'getStats', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};

/**
 * 构建属性增长曲线
 * 从日志中提取最近N天每天的属性变化累计值
 * @param {Array} logs - 所有日志
 * @param {number} days - 天数
 * @returns {Array} [{date, totalChange}, ...]
 */
function buildAttrGrowthCurve(logs, days) {
  const now = new Date();
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(getBeijingDateStr(d));
  }

  // 统计每天的属性变化总和
  const dailyChanges = {};
  for (const date of dates) {
    dailyChanges[date] = 0;
  }

  for (const log of logs) {
    if (dailyChanges[log.log_date] !== undefined) {
      // 解析changes数组，如 ["体质+5", "耐力+3"]
      for (const change of (log.changes || [])) {
        const match = change.match(/[+-]?\d+$/);
        if (match) {
          dailyChanges[log.log_date] += parseInt(match[0]);
        }
      }
    }
  }

  // 转换为曲线数据（累计增长）
  let cumulative = 0;
  return dates.map(date => {
    cumulative += dailyChanges[date];
    return { date, totalChange: cumulative };
  });
}
