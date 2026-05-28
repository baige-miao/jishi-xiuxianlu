/**
 * 云函数：dailyReset
 * 定时触发器：每天凌晨 0:00 自动执行
 * 功能：检查昨日每日任务完成情况 → 更新连续打卡天数 → 重置今日任务
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // 获取所有需要重置的玩家
  const playersRes = await db.collection('players')
    .where({ last_morning: _.neq(today) })
    .get();

  let processed = 0;
  let streakPassed = 0;

  for (const player of playersRes.data) {
    const openid = player._openid;

    // 检查昨日任务是否全部完成
    let streak = 1;
    if (player.last_morning) {
      if (player.last_morning === yesterdayStr) {
        // 昨天打开过，检查昨日任务完成情况
        const dailyTasks = await db.collection('tasks')
          .where({ _openid: openid, type: '每日' })
          .get();
        const allDone = dailyTasks.data.length > 0 &&
          dailyTasks.data.every(t => t.status === '已完成');
        if (allDone) {
          streak = (player.streak || 0) + 1;
          streakPassed++;
        }
      }
      // last_morning 不是昨天 → 断签，streak 保持 1
    }

    // 重置今日每日任务
    const tasks = await db.collection('tasks')
      .where({ _openid: openid, type: '每日' })
      .get();
    for (const task of tasks.data) {
      await db.collection('tasks').doc(task._id).update({
        data: { status: '未完成', done_date: '' }
      });
    }

    // 更新玩家数据
    await db.collection('players').doc(player._id).update({
      data: {
        streak: streak,
        last_morning: today,
        days_no_run: streak === 1 ? (player.days_no_run || 0) + 1 : (player.days_no_run || 0),
        last_update: today,
      }
    });

    processed++;
  }

  return {
    ok: true,
    message: `dailyReset 完成：${processed} 位玩家已重置，${streakPassed} 位连续打卡`,
    processed,
    streakPassed,
  };
};
