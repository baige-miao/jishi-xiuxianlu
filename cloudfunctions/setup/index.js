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
  const today = now.toISOString().slice(0, 10);

  // 属性负值处理：小于0自动设为0，记录提示
  const negativeWarnings = [];
  const processedAttrs = attrs.map(attr => {
    let value = parseInt(attr.value) || 0;
    if (value < 0) {
      negativeWarnings.push(attr.name);
      value = 0;
    }
    return {
      name: attr.name,
      value: value,
      grp: attr.grp || '其它',
      lastImproveDate: today, // 用于衰减计算
    };
  });

  try {
    // 清除旧数据（重新初始化）
    const openid = cloud.getWXContext().OPENID;

    // 删除该用户的旧数据
    await db.collection('players').where({ _openid: openid }).remove();
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
    console.error('初始化失败：', err);
    return { ok: false, message: '初始化失败：' + err.message };
  }
};
