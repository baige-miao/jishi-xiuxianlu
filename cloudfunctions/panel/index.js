/**
 * 云函数：panel
 * 获取主面板数据 - 属性、任务、日志、修仙等级、用户评级
 * 需求覆盖：功能#6 属性衰减、功能#7 用户评级、功能#8 修仙等级
 *
 * 更新说明：
 * - 移除手动重置逻辑，改为自动根据日期判断是否需要重置每日任务
 * - 每次调用时检查 last_morning 是否等于今天，不同则自动重置
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入公共工具
const { getLevel, getCultivationDisplay, getNextBreakthroughCost, getUserRating, getRatingScore, calculateDecay, DECAY_CONFIG, MIND_ATTRS } = require('./levels');

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  try {
    // 获取玩家数据
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, needSetup: true, message: '未找到玩家数据，请先完成初始化' };
    }
    const player = playerRes.data[0];

    // --- 每日重置由 dailyReset 定时云函数处理（凌晨 0:00 自动触发） ---
    // panel 只读取当前 streak，不负责计算和重置
    let dailyResetInfo = null;
    if (player.last_morning !== today) {
      // 定时器可能还没触发，给一个提示
      dailyResetInfo = {
        streak: player.streak || 0,
        days_no_run: player.days_no_run || 0,
        milestone: '',
        message: '',
      };
    }

    // --- 自动迁移：身心 → 体质/心境 ---
    let migrated = false;
    if (player.attrs && player.attrs.some(a => a.grp === '身心')) {
      player.attrs = player.attrs.map(a => {
        if (a.grp === '身心') {
          migrated = true;
          return { ...a, grp: MIND_ATTRS.includes(a.name) ? '心境' : '体质' };
        }
        return a;
      });
      await db.collection('players').doc(player._id).update({
        data: { attrs: player.attrs }
      });
    }

    // --- 属性衰减计算 ---
    let totalAttrSum = 0;
    let nonMentalSum = 0;
    let nonMentalCount = 0;
    let decayApplied = false;
    const attrs = (player.attrs || []).map(attr => {
      totalAttrSum += attr.value;
      if (!MIND_ATTRS.includes(attr.name)) {
        nonMentalSum += attr.value;
        nonMentalCount++;
      }

      // 计算距上次提升的天数
      let daysSinceImprove = 0;
      if (attr.lastImproveDate) {
        const lastDate = new Date(attr.lastImproveDate);
        daysSinceImprove = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      } else {
        // 没有记录上次提升日期，用创建日期
        daysSinceImprove = DECAY_CONFIG.decayDays; // 默认触发衰减检查
      }

      const { newValue, decayAmount } = calculateDecay(attr.value, daysSinceImprove);
      if (decayAmount > 0) {
        decayApplied = true;
        attr.value = newValue;
        attr.lastImproveDate = today; // 重置衰减计数
      }

      const result = {
        name: attr.name,
        value: attr.value,
        grp: attr.grp,
        level: getLevel(attr.name, attr.value),
      };
      if (attr.lastImproveDate) {
        result.lastImproveDate = attr.lastImproveDate;
      }
      return result;
    });

    // 如果发生了衰减，回写数据库
    if (decayApplied) {
      await db.collection('players').doc(player._id).update({
        data: { attrs: attrs }
      });
    }

    // 获取任务列表
    const taskRes = await db.collection('tasks').where({ _openid: openid }).get();
    const allTasks = taskRes.data;

    // 按类型分组任务
    const tasks = { '每日': [], '特殊': [], '应急': [], '阶段': [], '阶段_已完成': [] };
    for (const task of allTasks) {
      const entry = {
        _id: task._id,
        name: task.name,
        type: task.type,
        status: task.status,
        description: task.description,
        rewards: task.rewards || {},
      };
      // 特殊任务完成后隐藏
      if (task.type === '特殊' && task.status === '已完成') continue;
      // 阶段任务已完成的单独分组
      if (task.type === '阶段' && task.status === '已完成') {
        tasks['阶段_已完成'].push(entry);
      } else {
        tasks[task.type].push(entry);
      }
    }

    // 每日任务完成统计
    const dailyDone = tasks['每日'].filter(t => t.status === '已完成').length;
    const dailyTotal = tasks['每日'].length;

    // 获取最近7天日志
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const logRes = await db.collection('logs')
      .where({ _openid: openid, log_date: _.gte(sevenDaysAgo) })
      .orderBy('log_date', 'desc')
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    const logs = logRes.data.map(log => ({
      date: log.log_date,
      task_name: log.task_name,
      changes: log.changes || [],
    }));

    // 修仙等级显示
    const cultivation = getCultivationDisplay(player.cultivation_level || 0);

    // 修仙突破信息
    const breakthrough = getNextBreakthroughCost(player.cultivation_level || 0);

    // 用户评级
    const userRating = getUserRating(nonMentalSum, nonMentalCount);
    const ratingScore = getRatingScore(nonMentalSum, nonMentalCount);

    return {
      ok: true,
      player_name: player.player_name,
      player_age: player.player_age,
      streak: player.streak || 0,
      last_update: player.last_update || '',
      days_no_run: player.days_no_run || 0,
      attrs: attrs,
      tasks: tasks,
      daily_done: dailyDone,
      daily_total: dailyTotal,
      logs: logs,
      spirit_stone: player.spirit_stone || 0,
      cultivation: cultivation,
      breakthrough: breakthrough,
      user_rating: userRating,
      rating_score: ratingScore,
      total_attr_sum: nonMentalSum,
      // 兼容旧数据：如果有 reminder_time 但没有 reminders，自动迁移
      reminders: player.reminders || (player.reminder_time ? [{ time: player.reminder_time, content: player.reminder_content || '快去完成今日任务吧！' }] : []),
      // 八字数据（用于运势功能）
      bazi: player.bazi || null,
      // 自动重置信息（如果今天刚重置）
      daily_reset: dailyResetInfo,
    };
  } catch (err) {
    console.error('获取面板数据失败：', err);
    return { ok: false, message: '获取数据失败：' + err.message };
  }
};
