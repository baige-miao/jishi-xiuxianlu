/**
 * 云函数：sendReminder
 * 发送每日提醒订阅消息 - 需求#10（多提醒版本）
 * 遍历用户的所有提醒，匹配当前时间的发送消息
 * 提醒为持久化每日重复，通过 lastSendDate 防止同一天重复发送
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const TEMPLATE_ID = 'PysPbrZESgPoWLcrcdqb23o7wiQyrTCuqo6RRbHbV1Y';

function getBeijingDateStr(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const beijingNow = new Date(utc + 8 * 60 * 60 * 1000);
  const currentTime = String(beijingNow.getHours()).padStart(2, '0') + ':' +
                      String(beijingNow.getMinutes()).padStart(2, '0');
  const todayStr = getBeijingDateStr(now);

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
      // 找到匹配当前时间且今天未发送的提醒
      const matchedReminders = (player.reminders || []).filter(
        r => r.time === currentTime && r.lastSendDate !== todayStr
      );

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
          // 发送成功，标记今天已发送（保留提醒，不删除）
          await db.collection('players').doc(player._id).update({
            data: {
              reminders: _.set(
                (player.reminders || []).map(r =>
                  (r.time === reminder.time && r.content === reminder.content)
                    ? { ...r, lastSendDate: todayStr }
                    : r
                )
              ),
            },
          });
          results.push({ openid: player._openid, time: reminder.time, success: true });
        } catch (sendErr) {
          console.error(JSON.stringify({ func: 'sendReminder.send', openid: player._openid, time: reminder.time, error: sendErr.message }));
          results.push({ openid: player._openid, time: reminder.time, success: false, error: sendErr.errCode || sendErr.message });
        }
      }
    }

    return {
      ok: true,
      message: `已处理 ${results.length} 条提醒`,
      results,
    };
  } catch (err) {
    console.error(JSON.stringify({ func: 'sendReminder', error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
