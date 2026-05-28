/**
 * 云函数：setReminder
 * 添加每日提醒 - 需求#10（多提醒版本）
 * 向 reminders 数组追加一条提醒，最多5个，相同时间去重
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { reminder_time, reminder_content } = event;

  if (!reminder_time) {
    return { ok: false, message: '请设置提醒时间' };
  }

  // 验证时间格式
  const timeMatch = reminder_time.match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) {
    return { ok: false, message: '时间格式不正确，请使用HH:mm格式' };
  }

  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, message: '时间范围不正确' };
  }

  try {
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, message: '玩家数据不存在' };
    }

    const player = playerRes.data[0];
    const reminders = player.reminders || [];

    // 检查是否已存在相同时段的提醒
    const exists = reminders.some(r => r.time === reminder_time);
    if (exists) {
      return { ok: false, message: `${reminder_time} 的提醒已存在` };
    }

    // 限制最多5个提醒
    if (reminders.length >= 5) {
      return { ok: false, message: '最多设置5个提醒' };
    }

    const newReminder = {
      time: reminder_time,
      content: reminder_content || '快去完成今日任务吧！',
    };

    await db.collection('players').doc(player._id).update({
      data: { reminders: _.push(newReminder) }
    });

    return { ok: true, message: `已添加 ${reminder_time} 的提醒` };
  } catch (err) {
    console.error('设置提醒失败：', err);
    return { ok: false, message: '设置失败：' + err.message };
  }
};
