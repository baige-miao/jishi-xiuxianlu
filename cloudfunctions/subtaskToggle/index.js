/**
 * 云函数：subtaskToggle
 * 切换阶段任务的子任务完成状态
 * 当所有子任务完成时，自动触发任务完成流程
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { task_id, subtask_index } = event;

  if (!task_id || subtask_index === undefined) {
    return { ok: false, message: '缺少参数' };
  }

  try {
    const taskRes = await db.collection('tasks').doc(task_id).get();
    const task = taskRes.data;
    const idx = parseInt(subtask_index, 10);

    if (task._openid !== openid) {
      return { ok: false, message: '无权操作此任务' };
    }
    if (!task.subtasks || !task.subtasks[idx]) {
      return { ok: false, message: '子任务不存在' };
    }

    // 切换子任务状态
    const newDone = !task.subtasks[idx].done;
    const fieldPath = `subtasks.${idx}.done`;
    await db.collection('tasks').doc(task_id).update({
      data: { [fieldPath]: newDone },
    });

    // 检查是否全部完成
    const updatedSubtasks = task.subtasks.map((s, i) =>
      i === idx ? { ...s, done: newDone } : s
    );
    const allDone = updatedSubtasks.every(s => s.done);

    return {
      ok: true,
      done: newDone,
      allDone,
      subtasks: updatedSubtasks,
    };
  } catch (err) {
    console.error(JSON.stringify({ func: 'subtaskToggle', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
