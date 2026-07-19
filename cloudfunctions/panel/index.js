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
const { checkAchievements } = require('./achievements');

// 获取北京时间日期字符串 (UTC+8)
function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const beijing = new Date(utc + 8 * 60 * 60 * 1000);
  return beijing.toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const now = new Date();
  const today = getBeijingDateStr(now);

  try {
    // 获取玩家数据
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, needSetup: true, message: '未找到玩家数据，请先完成初始化' };
    }
    const player = playerRes.data[0];

    // --- 每日重置：由 dailyReset 定时云函数处理，panel 兜底 ---
    let dailyResetInfo = null;
    if (player.last_morning !== today) {
      // 定时器还没触发或漏执行，panel 兜底处理
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = getBeijingDateStr(yesterday);

      let streak = 1;
      if (player.last_morning === yesterdayStr) {
        // 昨天打开过，检查昨日任务完成情况
        const dailyTasks = await db.collection('tasks')
          .where({ _openid: openid, type: '每日' })
          .get();
        const allDone = dailyTasks.data.length === 0 ||
          dailyTasks.data.every(t => t.status === '已完成');
        if (allDone) {
          streak = (player.streak || 0) + 1;
        }
      }
      // last_morning 不是昨天 → 断签，streak 保持 1

      // 记录打卡：streak > 1 说明昨天完成了任务，写入 checkins 集合
      if (streak > 1) {
        // 打卡日期是昨天（完成任务的那天）
        await db.collection('checkins').add({
          data: {
            _openid: openid,
            date: player.last_morning, // 昨天的日期
            streak: streak,
            createdAt: new Date(),
          },
        });
      }

      // 重置每日任务状态
      const resetTasks = await db.collection('tasks')
        .where({ _openid: openid, type: '每日' })
        .get();
      for (const task of resetTasks.data) {
        await db.collection('tasks').doc(task._id).update({
          data: { status: '未完成', done_date: '' }
        });
      }

      // 更新玩家数据
      await db.collection('players').doc(player._id).update({
        data: {
          streak: streak,
          last_morning: today,
          days_no_run: (streak === 1 && player.last_morning) ? (player.days_no_run || 0) + 1 : (player.days_no_run || 0),
          last_update: today,
        }
      });

      // 刷新本地 player 对象
      const origLastMorning = player.last_morning;
      player.streak = streak;
      player.last_morning = today;
      player.last_update = today;
      if (streak === 1 && origLastMorning) {
        player.days_no_run = (player.days_no_run || 0) + 1;
      }

      dailyResetInfo = {
        streak: streak,
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
      // 计算距上次提升的天数
      let daysSinceImprove = 0;
      if (attr.lastImproveDate) {
        const lastDate = new Date(attr.lastImproveDate + 'T00:00:00+08:00');
        daysSinceImprove = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      } else {
        daysSinceImprove = DECAY_CONFIG.decayDays;
      }

      const { newValue, decayAmount } = calculateDecay(attr.value, daysSinceImprove);
      if (decayAmount > 0) {
        decayApplied = true;
        attr.value = newValue;
        attr.lastImproveDate = today;
      }

      totalAttrSum += attr.value;
      if (!MIND_ATTRS.includes(attr.name)) {
        nonMentalSum += attr.value;
        nonMentalCount++;
      }

      const result = {
        name: attr.name,
        value: attr.value,
        grp: attr.grp,
        level: getLevel(attr.name, attr.value, attr.grp),
      };
      if (attr.lastImproveDate) {
        result.lastImproveDate = attr.lastImproveDate;
      }
      return result;
    });

    // 如果发生了衰减，回写数据库（去除 level 显示字段）
    if (decayApplied) {
      const cleanAttrs = attrs.map(({ level, ...rest }) => rest);
      await db.collection('players').doc(player._id).update({
        data: { attrs: cleanAttrs }
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
      // 阶段任务携带子任务
      if (task.type === '阶段' && task.subtasks) {
        entry.subtasks = task.subtasks;
      }
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
    const sevenDaysAgo = getBeijingDateStr(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
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

    // --- 一次性迁移：初始化累计计数器 ---
    if (player.total_tasks_done === undefined) {
      const logCountRes = await db.collection('logs')
        .where({ _openid: openid })
        .count();
      player.total_tasks_done = logCountRes.total;
      await db.collection('players').doc(player._id).update({
        data: { total_tasks_done: logCountRes.total }
      });
    }
    if (player.total_spirit_earned === undefined) {
      player.total_spirit_earned = player.spirit_stone || 0;
      await db.collection('players').doc(player._id).update({
        data: { total_spirit_earned: player.total_spirit_earned }
      });
    }

    // --- 成就检查 ---
    const { achievements: updatedAch, unlocked } = checkAchievements(
      player,
      player.achievements || {},
      {
        taskDoneCount: player.total_tasks_done || 0,
        totalSpiritEarned: player.total_spirit_earned || 0,
        userRating: userRating,
        today: today,
      }
    );

    // 有新成就则写入数据库
    if (unlocked.length > 0) {
      await db.collection('players').doc(player._id).update({
        data: { achievements: updatedAch }
      });
    }

    // 审核模式开关（服务端读config集合，无权限问题）
    let review_mode = false;
    try {
      const configRes = await db.collection('config').doc('review').get();
      review_mode = configRes.data.review_mode === true;
    } catch (e) { /* config不存在则默认false */ }
    console.log('[panel] review_mode =', review_mode);

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
      reminders: player.reminders || (player.reminder_time ? [{ time: player.reminder_time, content: player.reminder_content || '快去完成今日任务吧！' }] : []),
      bazi: player.bazi || null,
      daily_reset: dailyResetInfo,
      achievements: updatedAch,
      newAchievements: unlocked,
      cultivation_enabled: player.cultivation_enabled !== false,
      review_mode: review_mode,
    };
  } catch (err) {
    console.error(JSON.stringify({ func: 'panel', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
