/**
 * 云函数：attrUpdate
 * 更新属性值（用于心情类属性手动调整）
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const MIND_ATTRS = ['精神', '心情', '意志力', '专注力', '精力'];

function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { name, value, delta } = event;

  if (!name || !name.trim()) {
    return { ok: false, message: '属性名不能为空' };
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

    // 支持两种模式：绝对值 (value) 或增量 (delta)
    let newValue;
    if (delta !== undefined) {
      newValue = attr.value + parseInt(delta);
    } else {
      newValue = parseInt(value);
    }

    if (isNaN(newValue) || newValue < 0) {
      return { ok: false, message: '属性值不能为负数' };
    }
    // 心境属性上限100，其他属性上限999
    const maxVal = MIND_ATTRS.includes(name.trim()) ? 100 : 999;
    if (newValue > maxVal) {
      newValue = maxVal;
    }

    if (newValue > attr.value) {
      attr.lastImproveDate = getBeijingDateStr(new Date());
    }
    attr.value = newValue;

    await db.collection('players').doc(player._id).update({
      data: { attrs: attrs }
    });

    return { ok: true, message: `${name.trim()} 已更新为 ${newValue}` };
  } catch (err) {
    console.error(JSON.stringify({ func: 'attrUpdate', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
