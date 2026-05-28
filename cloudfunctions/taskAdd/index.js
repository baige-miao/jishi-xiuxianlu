/**
 * 云函数：taskAdd
 * 添加新任务
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { name, type, desc, rewards } = event;

  // 参数校验
  if (!name || !name.trim()) {
    return { ok: false, message: '任务名不能为空' };
  }
  const validTypes = ['每日', '特殊', '应急', '阶段'];
  if (!validTypes.includes(type)) {
    return { ok: false, message: '任务类型无效' };
  }
  if (!rewards || Object.keys(rewards).length === 0) {
    return { ok: false, message: '奖励规则不能为空' };
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    await db.collection('tasks').add({
      data: {
        _openid: openid,
        name: name.trim(),
        type: type,
        status: '未完成',
        description: desc || '',
        rewards: rewards,
        done_date: '',
        created_at: today,
      }
    });

    return { ok: true, message: `已添加任务：${name.trim()}` };
  } catch (err) {
    console.error('添加任务失败：', err);
    return { ok: false, message: '添加失败：' + err.message };
  }
};
