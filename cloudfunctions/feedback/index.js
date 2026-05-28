/**
 * 云函数：feedback
 * 存储用户反馈
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { content, contact } = event;

  if (!content || !content.trim()) {
    return { ok: false, message: '请输入反馈内容' };
  }

  try {
    await db.collection('feedback').add({
      data: {
        _openid: openid,
        content: content.trim(),
        contact: (contact || '').trim(),
        created_at: new Date().toISOString(),
      }
    });

    return { ok: true, message: '感谢你的反馈！' };
  } catch (err) {
    console.error('提交反馈失败：', err);
    return { ok: false, message: '提交失败，请稍后重试' };
  }
};
