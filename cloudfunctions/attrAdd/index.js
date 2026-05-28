/**
 * 云函数：attrAdd
 * 添加新属性到玩家属性列表
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { name, value, grp } = event;

  // 参数校验
  if (!name || !name.trim()) {
    return { ok: false, message: '属性名不能为空' };
  }
  const attrValue = parseInt(value) || 0;
  if (attrValue < 0) {
    return { ok: false, message: '属性值不可为负数' };
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
    const today = new Date().toISOString().slice(0, 10);
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
    console.error('添加属性失败：', err);
    return { ok: false, message: '添加失败：' + err.message };
  }
};
