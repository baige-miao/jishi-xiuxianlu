/**
 * 云函数：sendReminder
 * 发送每日提醒订阅消息 - 需求#10（多提醒版本）
 * 遍历用户的所有提醒，匹配当前时间的发送消息
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const TEMPLATE_ID = 'PysPbrZESgPoWLcrcdqb23o7wiQyrTCuqo6RRbHbV1Y';

exports.main = async (event, context) => {
  const now = new Date();
  const currentTime = String(now.getHours()).padStart(2, '0') + ':' +
                      String(now.getMinutes()).padStart(2, '0');

  try {
    // 查找所有有提醒的用户
    const playersRes = await db.collection('players')
      .where({ 'reminders.time': currentTime })
      .get();

    if (playersRes.data.length === 0) {
      return { ok: true, message: '当前时间无用户需要提醒' };
    }

    const results = [];
    for (const player of playersRes.data) {
      // 找到匹配当前时间的提醒
      const matchedReminders = (player.reminders || []).filter(r => r.time === currentTime);

      for (const reminder of matchedReminders) {
        try {
          await cloud.openapi.subscribeMessage.send({
            touser: player._openid,
            templateId: TEMPLATE_ID,
            page: 'pages/index/index',
            data: {
              thing2: { value: '记事修仙录' },
              thing3: { value: reminder.content || '快去完成今日任务吧！' },
              date4: { value: reminder.time },
              time6: { value: currentTime },
            },
          });
          results.push({ openid: player._openid, time: reminder.time, success: true });
        } catch (sendErr) {
          console.error(`发送提醒失败 ${player._openid} ${reminder.time}:`, sendErr);
          results.push({ openid: player._openid, time: reminder.time, success: false, error: sendErr.message });
        }
      }
    }

    return {
      ok: true,
      message: `已处理 ${results.length} 条提醒`,
      results,
    };
  } catch (err) {
    console.error('发送提醒失败：', err);
    return { ok: false, message: '发送提醒失败：' + err.message };
  }
};
