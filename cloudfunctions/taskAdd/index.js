/**
 * 云函数：taskAdd
 * 添加新任务
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { name, type, desc, rewards, subtasks } = event;

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

  const today = getBeijingDateStr(new Date());

  try {
    const taskDoc = {
      _openid: openid,
      name: name.trim(),
      type: type,
      status: '未完成',
      description: desc || '',
      rewards: rewards,
      done_date: '',
      created_at: today,
    };

    // 阶段任务支持子任务
    if (type === '阶段' && subtasks && Array.isArray(subtasks) && subtasks.length > 0) {
      taskDoc.subtasks = subtasks.map(s => ({
        name: typeof s === 'string' ? s : s.name || '',
        done: false,
      }));
    }

    await db.collection('tasks').add({ data: taskDoc });

    return { ok: true, message: `已添加任务：${name.trim()}` };
  } catch (err) {
    console.error(JSON.stringify({ func: 'taskAdd', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
