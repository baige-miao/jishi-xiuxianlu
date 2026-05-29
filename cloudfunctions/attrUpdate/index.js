/**
 * 云函数：attrUpdate
 * 更新属性值（用于心情类属性手动调整）
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const MIND_ATTRS = ['精神', '心情', '意志力', '专注力', '精力'];

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { name, value } = event;

  if (!name || !name.trim()) {
    return { ok: false, message: '属性名不能为空' };
  }
  let newValue = parseInt(value);
  if (isNaN(newValue) || newValue < 0) {
    return { ok: false, message: '属性值不能为负数' };
  }
  if (MIND_ATTRS.includes(name.trim()) && newValue > 100) {
    newValue = 100;
  }

  try {
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, message: '未找到玩家数据' };
    }
    const player = playerRes.data[0];
    const attrs = player.attrs || [];

    const attr = attrs.find(a => a.name === name.trim());
    if (!attr) {
      return { ok: false, message: `属性「${name.trim()}」不存在` };
    }

    attr.value = newValue;
    attr.lastImproveDate = new Date().toISOString().slice(0, 10);

    await db.collection('players').doc(player._id).update({
      data: { attrs: attrs }
    });

    return { ok: true, message: `${name.trim()} 已更新为 ${newValue}` };
  } catch (err) {
    console.error('更新属性失败：', err);
    return { ok: false, message: '更新失败：' + err.message };
  }
};
