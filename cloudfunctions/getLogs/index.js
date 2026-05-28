/**
 * 云函数：getLogs
 * 获取活动日志
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { days = 7 } = event; // 默认获取最近7天

  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const logRes = await db.collection('logs')
      .where({
        _openid: openid,
        log_date: _.gte(since),
      })
      .orderBy('log_date', 'desc')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();

    const logs = logRes.data.map(log => ({
      date: log.log_date,
      task_name: log.task_name,
      changes: log.changes || [],
    }));

    return { ok: true, logs: logs };
  } catch (err) {
    console.error('获取日志失败：', err);
    return { ok: false, message: '获取日志失败：' + err.message };
  }
};
