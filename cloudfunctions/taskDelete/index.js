/**
 * 云函数：taskDelete
 * 删除任务 - 需求#5：所有任务增加删除功能
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { task_id } = event;

  if (!task_id) {
    return { ok: false, message: '缺少任务ID' };
  }

  try {
    // 验证任务属于当前用户
    const taskRes = await db.collection('tasks').doc(task_id).get();
    const task = taskRes.data;

    if (!task || task._openid !== openid) {
      return { ok: false, message: '任务不存在或无权删除' };
    }

    // 删除任务
    await db.collection('tasks').doc(task_id).remove();

    return { ok: true, message: `已删除任务：${task.name}` };
  } catch (err) {
    console.error('删除任务失败：', err);
    return { ok: false, message: '删除失败：' + err.message };
  }
};
