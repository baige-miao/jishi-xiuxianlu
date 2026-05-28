/**
 * 云函数：memos
 * 备忘录 CRUD 操作
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { action } = event;

  try {
    switch (action) {
      case 'list':
        return await handleList(openid);
      case 'add':
        return await handleAdd(openid, event);
      case 'update':
        return await handleUpdate(openid, event);
      case 'delete':
        return await handleDelete(openid, event);
      default:
        return { ok: false, message: '未知操作：' + action };
    }
  } catch (err) {
    console.error('memos 云函数错误：', err);
    return { ok: false, message: '操作失败：' + err.message };
  }
};

// 查询列表
async function handleList(openid) {
  const res = await db.collection('memos')
    .where({ _openid: openid })
    .orderBy('updated_at', 'desc')
    .limit(100)
    .get();
  return { ok: true, memos: res.data };
}

// 新建备忘录
async function handleAdd(openid, event) {
  const { title, content } = event;
  const now = new Date().toISOString();
  const res = await db.collection('memos').add({
    data: {
      _openid: openid,
      title: title || '无标题',
      content: content || '',
      created_at: now,
      updated_at: now,
    },
  });
  return { ok: true, _id: res._id };
}

// 更新备忘录
async function handleUpdate(openid, event) {
  const { _id, title, content } = event;
  if (!_id) return { ok: false, message: '缺少备忘录ID' };

  // 验证所有权
  const doc = await db.collection('memos').doc(_id).get();
  if (doc.data._openid !== openid) {
    return { ok: false, message: '无权修改此备忘录' };
  }

  await db.collection('memos').doc(_id).update({
    data: {
      title: title || '无标题',
      content: content || '',
      updated_at: new Date().toISOString(),
    },
  });
  return { ok: true };
}

// 删除备忘录
async function handleDelete(openid, event) {
  const { _id } = event;
  if (!_id) return { ok: false, message: '缺少备忘录ID' };

  // 验证所有权
  const doc = await db.collection('memos').doc(_id).get();
  if (doc.data._openid !== openid) {
    return { ok: false, message: '无权删除此备忘录' };
  }

  await db.collection('memos').doc(_id).remove();
  return { ok: true };
}
