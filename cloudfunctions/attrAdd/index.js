/**
 * 云函数：attrAdd
 * 添加新属性到玩家属性列表
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
  const { name, value, grp } = event;

  // 参数校验
  if (!name || !name.trim()) {
    return { ok: false, message: '属性名不能为空' };
  }
  let attrValue = parseInt(value) || 0;
  if (attrValue < 0) {
    return { ok: false, message: '属性值不可为负数' };
  }
  if (MIND_ATTRS.includes(name.trim()) && attrValue > 100) {
    attrValue = 100;
  }
  const validGrps = ['体质', '心境', '学识', '技能', '其它'];
  const attrGrp = validGrps.includes(grp) ? grp : '其它';

  try {
    // 获取玩家数据
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, message: '未找到玩家数据' };
    }
    const player = playerRes.data[0];
    const attrs = player.attrs || [];

    // 检查重名
    if (attrs.some(a => a.name === name.trim())) {
      return { ok: false, message: `属性「${name.trim()}」已存在` };
    }

    // 添加新属性
    const today = getBeijingDateStr(new Date());
    attrs.push({
      name: name.trim(),
      value: attrValue,
      grp: attrGrp,
      lastImproveDate: today,
    });

    await db.collection('players').doc(player._id).update({
      data: { attrs: attrs }
    });

    return { ok: true, message: `已添加属性：${name.trim()}` };
  } catch (err) {
    console.error(JSON.stringify({ func: 'attrAdd', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
