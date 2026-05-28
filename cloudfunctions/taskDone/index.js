/**
 * 云函数：taskDone
 * 完成任务 - 计算属性变化、写日志、更新等级、增加灵力
 * 需求覆盖：功能#4 应急任务完成后自动删除、功能#8 灵力奖励（按任务类型区分）
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const { getLevel } = require('./levels');

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
    const today = now.toISOString().slice(0, 10);

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
        const newVal = Math.max(0, attrs[attrIndex].value + delta);
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

    // 更新玩家数据
    await db.collection('players').doc(player._id).update({
      data: {
        attrs: attrs,
        spirit_stone: newSpiritStone,
        last_update: today,
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
          level: getLevel(attrName, attr.value),
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
    };
  } catch (err) {
    console.error('完成任务失败：', err);
    return { ok: false, message: '操作失败：' + err.message };
  }
};
