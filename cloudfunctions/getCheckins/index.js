/**
 * 云函数：getCheckins
 * 获取指定月份的打卡记录
 * 参数：year, month（1-12）
 * 返回：该月所有打卡日期列表
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { year, month } = event;

  if (!year || !month) {
    return { ok: false, message: '缺少参数' };
  }

  // 构造月份范围
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  // 下个月第一天
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStr = String(nextMonth).padStart(2, '0');
  const endDate = `${nextYear}-${nextMonthStr}-01`;

  try {
    const res = await db.collection('checkins')
      .where({
        _openid: openid,
        date: _.gte(startDate).and(_.lt(endDate)),
      })
      .orderBy('date', 'asc')
      .get();

    // 返回日期列表和统计
    const dates = res.data.map(r => r.date);
    // 去重（同一天可能有多条记录）
    const uniqueDates = [...new Set(dates)];

    return {
      ok: true,
      dates: uniqueDates,
      total: uniqueDates.length,
    };
  } catch (err) {
    return { ok: false, message: err.message };
  }
};
