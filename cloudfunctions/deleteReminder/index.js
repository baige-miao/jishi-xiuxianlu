/**
 * 云函数：deleteReminder
 * 删除指定索引的提醒
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { index } = event;

  if (index === undefined || index === null) {
    return { ok: false, message: '缺少提醒索引' };
  }

  try {
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, message: '玩家数据不存在' };
    }

    const player = playerRes.data[0];
    const reminders = player.reminders || [];

    if (index < 0 || index >= reminders.length) {
      return { ok: false, message: '提醒不存在' };
    }

    const removed = reminders.splice(index, 1);

    await db.collection('players').doc(player._id).update({
      data: { reminders }
    });

    return { ok: true, message: `已删除 ${removed[0].time} 的提醒` };
  } catch (err) {
    console.error(JSON.stringify({ func: 'deleteReminder', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
