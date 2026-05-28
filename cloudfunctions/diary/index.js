/**
 * 云函数：diary
 * 日记 CRUD 操作 + 自动摘要生成
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { action } = event;

  try {
    switch (action) {
      case 'get':
        return await handleGet(openid, event);
      case 'list':
        return await handleList(openid, event);
      case 'save':
        return await handleSave(openid, event);
      case 'delete':
        return await handleDelete(openid, event);
      case 'getAutoSummary':
        return await handleGetAutoSummary(openid, event);
      default:
        return { ok: false, message: '未知操作：' + action };
    }
  } catch (err) {
    console.error('diary 云函数错误：', err);
    return { ok: false, message: '操作失败：' + err.message };
  }
};

// 获取指定日期的日记
async function handleGet(openid, event) {
  const { date } = event;
  if (!date) return { ok: false, message: '缺少日期参数' };

  const res = await db.collection('diaries')
    .where({ _openid: openid, date })
    .get();

  if (res.data.length > 0) {
    return { ok: true, diary: res.data[0] };
  }
  return { ok: true, diary: null };
}

// 获取日记列表
async function handleList(openid, event) {
  const { limit = 30, skip = 0 } = event;

  const res = await db.collection('diaries')
    .where({ _openid: openid })
    .orderBy('date', 'desc')
    .skip(skip)
    .limit(limit)
    .get();

  return { ok: true, diaries: res.data };
}

// 保存日记（新增或更新）
async function handleSave(openid, event) {
  const { date, content, mood_emoji, weather_emoji } = event;
  if (!date) return { ok: false, message: '缺少日期参数' };

  const now = new Date().toISOString();

  // 查找是否已存在
  const existing = await db.collection('diaries')
    .where({ _openid: openid, date })
    .get();

  if (existing.data.length > 0) {
    // 更新
    await db.collection('diaries').doc(existing.data[0]._id).update({
      data: {
        content: content || '',
        mood_emoji: mood_emoji || '',
        weather_emoji: weather_emoji || '',
        updated_at: now,
      },
    });
    return { ok: true, _id: existing.data[0]._id, action: 'updated' };
  } else {
    // 新增
    const res = await db.collection('diaries').add({
      data: {
        _openid: openid,
        date,
        content: content || '',
        mood_emoji: mood_emoji || '',
        weather_emoji: weather_emoji || '',
        auto_summary: '',
        images: [],
        created_at: now,
        updated_at: now,
      },
    });
    return { ok: true, _id: res._id, action: 'created' };
  }
}

// 删除日记
async function handleDelete(openid, event) {
  const { _id } = event;
  if (!_id) return { ok: false, message: '缺少日记ID' };

  // 验证所有权
  const doc = await db.collection('diaries').doc(_id).get();
  if (doc.data._openid !== openid) {
    return { ok: false, message: '无权删除此日记' };
  }

  await db.collection('diaries').doc(_id).remove();
  return { ok: true };
}

// 获取自动摘要（从当日日志生成）
async function handleGetAutoSummary(openid, event) {
  const { date } = event;
  if (!date) return { ok: false, message: '缺少日期参数' };

  // 查询当天的任务完成日志
  const logsRes = await db.collection('logs')
    .where({ _openid: openid, log_date: date })
    .get();

  const logs = logsRes.data;
  if (logs.length === 0) {
    return { ok: true, summary: '', taskCount: 0 };
  }

  // 生成摘要
  const taskNames = logs.map(l => l.task_name);
  const uniqueTasks = [...new Set(taskNames)];
  const changes = logs.reduce((acc, l) => {
    if (l.changes && l.changes.length > 0) {
      acc.push(...l.changes);
    }
    return acc;
  }, []);

  let summary = `今日完成了 ${logs.length} 个任务`;
  if (uniqueTasks.length > 0) {
    summary += `：${uniqueTasks.join('、')}`;
  }
  if (changes.length > 0) {
    summary += `。属性变化：${changes.join('；')}`;
  }

  return { ok: true, summary, taskCount: logs.length };
}
