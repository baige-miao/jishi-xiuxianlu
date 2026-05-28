/**
 * 云函数：attrDelete
 * 删除玩家属性
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { name } = event;

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

    const idx = attrs.findIndex(a => a.name === name.trim());
    if (idx === -1) {
      return { ok: false, message: `属性「${name.trim()}」不存在` };
    }

    attrs.splice(idx, 1);

    await db.collection('players').doc(player._id).update({
      data: { attrs: attrs }
    });

    return { ok: true, message: `已删除属性：${name.trim()}` };
  } catch (err) {
    console.error('删除属性失败：', err);
    return { ok: false, message: '删除失败：' + err.message };
  }
};
