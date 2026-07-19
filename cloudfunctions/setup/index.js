/**
 * 云函数：setup
 * 初始化设置 - 创建玩家数据、属性、任务
 * 需求覆盖：Bug#2 属性负值处理（自动设为0并返回提示）
 *
 * 更新说明：
 * - 新增 cultivation_enabled 字段，记录是否启用修仙模式
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const MIND_ATTRS = ['精神', '心情', '意志力', '专注力', '精力'];

function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const { player_name, player_age, gender, birth_year, birth_month, birth_day, birth_hour, bazi, cultivation_enabled, attrs, tasks } = event;

  // 参数校验
  if (!player_name || !player_name.trim()) {
    return { ok: false, message: '请输入你的名字' };
  }
  if (!attrs || attrs.length === 0) {
    return { ok: false, message: '请至少添加一项属性' };
  }
  if (!tasks || tasks.length === 0) {
    return { ok: false, message: '请至少添加一条任务' };
  }

  const now = new Date();
  const today = getBeijingDateStr(now);

  // 属性负值处理：小于0自动设为0，记录提示
  const negativeWarnings = [];
  const processedAttrs = attrs.map(attr => {
    let value = parseInt(attr.value) || 0;
    if (value < 0) {
      negativeWarnings.push(attr.name);
      value = 0;
    }
    if (MIND_ATTRS.includes(attr.name) && value > 100) {
      value = 100;
    }
    return {
      name: attr.name,
      value: value,
      grp: attr.grp || '其它',
      lastImproveDate: today, // 用于衰减计算
    };
  });

  try {
    const openid = cloud.getWXContext().OPENID;

    // 安全检查：云端已有数据时阻止重新初始化，防止清缓存后误删数据
    const existingPlayer = await db.collection('players').where({ _openid: openid }).get();
    if (existingPlayer.data.length > 0) {
      return {
        ok: false,
        hasData: true,
        message: '检测到云端已有账号数据，请勿重复初始化。如需重新设置，请先在设置页清除数据。',
      };
    }

    // 新用户：写入数据
    await db.collection('tasks').where({ _openid: openid }).remove();
    await db.collection('logs').where({ _openid: openid }).remove();

    // 写入玩家信息（players集合，合并config和attrs）
    const playerData = {
      _openid: openid,
      player_name: player_name.trim(),
      player_age: parseInt(player_age) || 18,
      gender: gender || '',
      birth_year: parseInt(birth_year) || 0,
      birth_month: parseInt(birth_month) || 0,
      birth_day: parseInt(birth_day) || 0,
      birth_hour: parseInt(birth_hour) || -1,
      bazi: bazi || { year: '', month: '', day: '', hour: '' },
      cultivation_enabled: cultivation_enabled === true, // 是否启用修仙模式
      streak: 0,
      last_update: today,
      last_morning: '', // 昨天的日期，用于连续打卡判断
      days_no_run: 0,
      attrs: processedAttrs,
      spirit_stone: 0,           // 灵气值
      cultivation_level: 0,      // 修仙等级编号（0=凡人）
      reminder_time: '',         // 提醒时间（HH:mm格式）
      created_at: db.serverDate(),
    };
    await db.collection('players').add({ data: playerData });

    // 写入任务列表
    const taskBatch = tasks.map(task => ({
      _openid: openid,
      name: task.name,
      type: task.type || '每日',
      status: '未完成',
      description: task.desc || '',
      rewards: task.rewards || {},
      done_date: '',
      created_at: today,
    }));

    // 逐条写入（云数据库无批量add）
    for (const taskData of taskBatch) {
      await db.collection('tasks').add({ data: taskData });
    }

    // 构建返回消息
    let message = '初始化完成！';
    if (negativeWarnings.length > 0) {
      message += ` 以下属性值不可为负数，已自动设为0：${negativeWarnings.join('、')}`;
    }

    return {
      ok: true,
      message: message,
      negativeAttrs: negativeWarnings,
    };
  } catch (err) {
    console.error(JSON.stringify({ func: 'setup', openid: cloud.getWXContext().OPENID, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
