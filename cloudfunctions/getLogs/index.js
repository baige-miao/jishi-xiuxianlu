/**
 * 云函数：getLogs
 * 获取活动日志
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
  let { days = 7 } = event;
  if (typeof days !== 'number' || days < 1) days = 7;
  if (days > 30) days = 30; // 最多查询30天，防止滥用

  const now = new Date();
  const since = getBeijingDateStr(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));

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
    console.error(JSON.stringify({ func: 'getLogs', openid, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
