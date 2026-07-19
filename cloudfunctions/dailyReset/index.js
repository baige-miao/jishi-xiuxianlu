/**
 * 云函数：dailyReset
 * 定时触发器：每天凌晨 0:00 自动执行
 * 功能：检查昨日每日任务完成情况 → 更新连续打卡天数 → 重置今日任务
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 获取北京时间日期字符串 (UTC+8)
function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const beijing = new Date(utc + 8 * 60 * 60 * 1000);
  return beijing.toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const now = new Date();
  const today = getBeijingDateStr(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getBeijingDateStr(yesterday);

  try {
    // 获取所有需要重置的玩家
    const playersRes = await db.collection('players')
      .where({ last_morning: _.neq(today) })
      .get();

    let processed = 0;
    let streakPassed = 0;

    for (const player of playersRes.data) {
      try {
        const openid = player._openid;

        // 检查昨日任务是否全部完成
        let streak = 1;
        if (player.last_morning) {
          if (player.last_morning === yesterdayStr) {
            const dailyTasks = await db.collection('tasks')
              .where({ _openid: openid, type: '每日' })
              .get();
            const allDone = dailyTasks.data.length === 0 ||
              dailyTasks.data.every(t => t.status === '已完成');
            if (allDone) {
              streak = (player.streak || 0) + 1;
              streakPassed++;
              // 记录打卡：昨天完成了任务
              await db.collection('checkins').add({
                data: {
                  _openid: openid,
                  date: player.last_morning, // 昨天的日期
                  streak: streak,
                  createdAt: new Date(),
                },
              });
            }
          }
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
            days_no_run: (streak === 1 && player.last_morning) ? (player.days_no_run || 0) + 1 : (player.days_no_run || 0),
            last_update: today,
          }
        });

        processed++;
      } catch (playerErr) {
        console.error(JSON.stringify({ func: 'dailyReset.player', openid: player._openid, error: playerErr.message }));
      }
    }

    return {
      ok: true,
      message: `dailyReset 完成：${processed} 位玩家已重置，${streakPassed} 位连续打卡`,
      processed,
      streakPassed,
    };
  } catch (err) {
    console.error(JSON.stringify({ func: 'dailyReset', error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
