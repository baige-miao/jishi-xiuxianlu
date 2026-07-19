/**
 * 云函数：taskDone
 * 完成任务 - 计算属性变化、写日志、更新等级、增加灵力
 * 需求覆盖：功能#4 应急任务完成后自动删除、功能#8 灵力奖励（按任务类型区分）
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const { getLevel, MIND_ATTRS, getUserRating } = require('./levels');
const { checkAchievements } = require('./achievements');

function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { task_id } = event;

  if (!task_id) {
    return { ok: false, message: '缺少任务ID' };
  }

  try {
    // 查找任务
    const taskRes = await db.collection('tasks').doc(task_id).get();
    const task = taskRes.data;

    if (!task || task._openid !== openid) {
      return { ok: false, message: '任务不存在' };
    }
    if (task.status === '已完成') {
      return { ok: false, message: `任务「${task.name}」已完成` };
    }

    const rewards = task.rewards || {};
    if (Object.keys(rewards).length === 0) {
      return { ok: false, message: '该任务无奖励规则' };
    }

    const now = new Date();
    const today = getBeijingDateStr(now);

    // 获取玩家数据
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, message: '玩家数据不存在' };
    }
    const player = playerRes.data[0];
    const attrs = player.attrs || [];
    const changes = [];

    // 逐一更新属性值（支持负值奖励，如"体质-2"）
    for (const [attrName, delta] of Object.entries(rewards)) {
      const attrIndex = attrs.findIndex(a => a.name === attrName);
      if (attrIndex >= 0) {
        const maxVal = MIND_ATTRS.includes(attrName) ? 100 : Infinity;
        const newVal = Math.min(maxVal, Math.max(0, attrs[attrIndex].value + delta));
        attrs[attrIndex].value = newVal;
        // 更新最后提升日期（如果属性增加了）
        if (delta > 0) {
          attrs[attrIndex].lastImproveDate = today;
        }
        const sign = delta >= 0 ? '+' : '';
        changes.push(`${attrName}${sign}${delta}`);
      }
    }

    // 灵力奖励（按任务类型区分）
    const SPIRIT_REWARDS = { '每日': 10, '特殊': 30, '应急': 10, '阶段': 500 };
    const spiritReward = SPIRIT_REWARDS[task.type] || 10;
    let newSpiritStone = (player.spirit_stone || 0) + spiritReward;
    let spiritBonus = 0;

    // 每日任务全部完成，额外+50灵力
    if (task.type === '每日') {
      const allDaily = await db.collection('tasks').where({
        _openid: openid,
        type: '每日',
      }).get();
      const allDone = allDaily.data.length > 0 && allDaily.data.every(t => t.status === '已完成' || t._id === task_id);
      if (allDone) {
        spiritBonus = 50;
        newSpiritStone += spiritBonus;
      }
    }

    // 累计计数器
    const totalTasksDone = (player.total_tasks_done || 0) + 1;
    const totalSpiritEarned = (player.total_spirit_earned || 0) + spiritReward + spiritBonus;

    // 成就检查
    const nonMentalAttrs = attrs.filter(a => !MIND_ATTRS.includes(a.name));
    const nonMentalSum = nonMentalAttrs.reduce((s, a) => s + a.value, 0);
    const userRating = getUserRating(nonMentalSum, nonMentalAttrs.length);

    const { achievements: updatedAch, unlocked } = checkAchievements(
      { streak: player.streak || 0, cultivation_level: player.cultivation_level || 0 },
      player.achievements || {},
      {
        taskDoneCount: totalTasksDone,
        totalSpiritEarned: totalSpiritEarned,
        userRating: userRating,
        today: today,
      }
    );

    // 更新玩家数据（一次写入）
    await db.collection('players').doc(player._id).update({
      data: {
        attrs: attrs,
        spirit_stone: newSpiritStone,
        last_update: today,
        total_tasks_done: totalTasksDone,
        total_spirit_earned: totalSpiritEarned,
        achievements: updatedAch,
      }
    });

    // 标记任务完成
    await db.collection('tasks').doc(task_id).update({
      data: {
        status: '已完成',
        done_date: today,
      }
    });

    // 写日志
    await db.collection('logs').add({
      data: {
        _openid: openid,
        log_date: today,
        task_name: task.name,
        changes: changes,
        created_at: now.toISOString(),
      }
    });

    // 特殊：晨跑清零未晨跑天数
    if (task.name === '晨跑') {
      await db.collection('players').doc(player._id).update({
        data: { days_no_run: 0 }
      });
    }

    // 查询各属性的新等级
    const levelUpdates = [];
    for (const [attrName, delta] of Object.entries(rewards)) {
      const attr = attrs.find(a => a.name === attrName);
      if (attr) {
        levelUpdates.push({
          name: attrName,
          value: attr.value,
          level: getLevel(attrName, attr.value, attr.grp),
        });
      }
    }

    // 功能#4：应急任务完成后自动删除
    if (task.type === '应急') {
      await db.collection('tasks').doc(task_id).remove();
    }

    return {
      ok: true,
      changes: changes,
      levels: levelUpdates,
      spirit_stone: newSpiritStone,
      spiritReward: spiritReward,
      spiritBonus: spiritBonus,
      isEmergencyDeleted: task.type === '应急',
      newAchievements: unlocked,
    };
  } catch (err) {
    console.error(JSON.stringify({ func: 'taskDone', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
