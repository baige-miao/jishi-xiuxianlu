/**
 * 云函数：breakthrough
 * 修仙突破 - 大境界突破有失败概率，可通过条件降低失败率
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const {
  getNextBreakthroughCost, getCultivationDisplay, getBreakthroughInfo,
  MAJOR_BREAKTHROUGH_FAIL_RATES, BREAKTHROUGH_FAIL_MESSAGES,
  BREAKTHROUGH_BOOSTS, MIND_ATTRS,
} = require('./levels');

/**
 * 根据 checkType 计算单个条件是否满足
 */
function checkBoostCondition(condition, playerData) {
  const { checkType, threshold, count } = condition;
  switch (checkType) {
    case 'maxAttr':
      return playerData.maxAttr >= threshold;
    case 'streak':
      return playerData.streak >= threshold;
    case 'cultDays':
      return playerData.cultDays >= threshold;
    case 'features':
      return playerData.featureCount >= threshold;
    case 'totalTasks':
      return playerData.totalTasks >= threshold;
    case 'skillAttrs':
      return playerData.skillAttrCount >= threshold;
    case 'attrsAbove':
      return playerData.attrsAbove200 >= count;
    case 'bodyAttr':
      return playerData.bodyAttr >= threshold;
    case 'stageTasks':
      return playerData.stageTasks >= threshold;
    case 'diary':
      return playerData.diaryCount >= threshold;
    case 'mindAll':
      return playerData.mindAllMin >= threshold;
    default:
      return false;
  }
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const isPreview = event.preview === true;

  try {
    const playerRes = await db.collection('players').where({ _openid: openid }).get();
    if (playerRes.data.length === 0) {
      return { ok: false, message: '玩家数据不存在' };
    }
    const player = playerRes.data[0];
    const currentLevel = player.cultivation_level || 0;
    const currentSpirit = player.spirit_stone || 0;

    // 计算突破所需灵气
    const breakthrough = getNextBreakthroughCost(currentLevel);
    if (!breakthrough) {
      return { ok: false, message: '已达到最高境界，无法继续突破' };
    }

    // 预览模式：只返回成功率信息，不执行突破
    const info = getBreakthroughInfo(currentLevel);
    const baseFailRate = MAJOR_BREAKTHROUGH_FAIL_RATES[info.fromRealm] || 0;
    const boosts = BREAKTHROUGH_BOOSTS[info.fromRealm] || [];

    if (isPreview) {
      let effectiveFailRate = baseFailRate;
      let totalBoost = 0;
      const boostDetails = [];

      if (info.isMajor && baseFailRate > 0 && boosts.length > 0) {
        const attrs = player.attrs || [];
        const playerData = {
          maxAttr: attrs.length > 0 ? Math.max(...attrs.map(a => a.value)) : 0,
          streak: player.streak || 0,
          cultDays: player.created_at ? Math.floor((Date.now() - new Date(player.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
          featureCount: 0, totalTasks: 0, skillAttrCount: 0,
          attrsAbove200: attrs.filter(a => a.value >= 200).length,
          bodyAttr: (attrs.find(a => a.name === '体质') || {}).value || 0,
          stageTasks: 0, diaryCount: 0,
          mindAllMin: (() => {
            const mindAttrs = attrs.filter(a => MIND_ATTRS.includes(a.name));
            return mindAttrs.length > 0 ? Math.min(...mindAttrs.map(a => a.value)) : 0;
          })(),
        };
        // 查询任务数据
        try {
          const tasksRes = await db.collection('tasks').where({ _openid: openid }).get();
          const tasks = tasksRes.data || [];
          playerData.totalTasks = tasks.filter(t => t.status === '已完成').length;
          playerData.stageTasks = tasks.filter(t => t.type === '阶段' && t.status === '已完成').length;
        } catch (e) {}
        playerData.skillAttrCount = attrs.filter(a => a.grp === '学识' || a.grp === '技能').length;
        // 查询日记
        try {
          const diaryRes = await db.collection('diaries').where({ _openid: openid }).count();
          playerData.diaryCount = diaryRes.total || 0;
        } catch (e) {}
        // 功能种类
        let featureCount = 0;
        if (playerData.totalTasks > 0) featureCount++;
        try { const m = await db.collection('memos').where({ _openid: openid }).count(); if (m.total > 0) featureCount++; } catch (e) {}
        if (playerData.diaryCount > 0) featureCount++;
        if (player.reminders && player.reminders.length > 0) featureCount++;
        if (currentLevel > 0) featureCount++;
        if (player.daily_fortune) featureCount++;
        playerData.featureCount = featureCount;

        for (const cond of boosts) {
          const met = checkBoostCondition(cond, playerData);
          if (met) totalBoost += cond.boost;
          boostDetails.push({ desc: cond.desc, met, boost: cond.boost });
        }
        effectiveFailRate = Math.max(0.05, baseFailRate - totalBoost);
      }

      return {
        ok: true,
        preview: true,
        isMajor: info.isMajor,
        fromRealm: info.fromRealm,
        toRealm: info.toRealm,
        cost: breakthrough.cost,
        currentSpirit,
        baseFailRate,
        effectiveFailRate,
        boostDetails,
      };
    }

    // 检查灵气是否足够
    if (currentSpirit < breakthrough.cost) {
      return {
        ok: false,
        message: `灵力不足！需要 ${breakthrough.cost} 灵力，当前 ${currentSpirit}`,
      };
    }

    let effectiveFailRate = baseFailRate;
    let totalBoost = 0;
    const boostDetails = [];

    // 如果是大境界突破且有加成配置，计算加成
    if (info.isMajor && baseFailRate > 0 && boosts.length > 0) {
      // 并行查询所需数据
      const attrs = player.attrs || [];

      // 属性相关数据
      const maxAttr = attrs.length > 0 ? Math.max(...attrs.map(a => a.value)) : 0;
      const skillAttrCount = attrs.filter(a => a.grp === '学识' || a.grp === '技能').length;
      const attrsAbove200 = attrs.filter(a => a.value >= 200).length;
      const bodyAttrObj = attrs.find(a => a.name === '体质');
      const bodyAttr = bodyAttrObj ? bodyAttrObj.value : 0;
      const mindAttrs = attrs.filter(a => MIND_ATTRS.includes(a.name));
      const mindAllMin = mindAttrs.length > 0 ? Math.min(...mindAttrs.map(a => a.value)) : 0;

      // 连续打卡
      const streak = player.streak || 0;

      // 修行天数
      let cultDays = 0;
      if (player.created_at) {
        cultDays = Math.floor((Date.now() - new Date(player.created_at).getTime()) / (1000 * 60 * 60 * 24));
      }

      // 查询任务完成数和阶段任务完成数
      let totalTasks = 0;
      let stageTasks = 0;
      try {
        const tasksRes = await db.collection('tasks').where({ _openid: openid }).get();
        const tasks = tasksRes.data || [];
        totalTasks = tasks.filter(t => t.status === '已完成').length;
        stageTasks = tasks.filter(t => t.type === '阶段' && t.status === '已完成').length;
      } catch (e) { /* 集合可能不存在 */ }

      // 查询日记篇数
      let diaryCount = 0;
      try {
        const diaryRes = await db.collection('diaries').where({ _openid: openid }).count();
        diaryCount = diaryRes.total || 0;
      } catch (e) { /* 集合可能不存在 */ }

      // 使用功能种类数（检查各集合是否有数据）
      let featureCount = 0;
      // 任务
      if (totalTasks > 0) featureCount++;
      // 备忘录
      try {
        const memosRes = await db.collection('memos').where({ _openid: openid }).count();
        if (memosRes.total > 0) featureCount++;
      } catch (e) {}
      // 日记
      if (diaryCount > 0) featureCount++;
      // 提醒
      if (player.reminders && player.reminders.length > 0) featureCount++;
      // 修仙（等级>0说明突破过）
      if (currentLevel > 0) featureCount++;
      // 每日趣读
      if (player.daily_fortune) featureCount++;

      const playerData = {
        maxAttr, streak, cultDays, featureCount, totalTasks,
        skillAttrCount, attrsAbove200, bodyAttr, stageTasks,
        diaryCount, mindAllMin,
      };

      // 计算每个条件的加成
      for (const cond of boosts) {
        const met = checkBoostCondition(cond, playerData);
        if (met) {
          totalBoost += cond.boost;
          boostDetails.push({ desc: cond.desc, met: true, boost: cond.boost });
        } else {
          boostDetails.push({ desc: cond.desc, met: false, boost: 0 });
        }
      }

      effectiveFailRate = Math.max(0.05, baseFailRate - totalBoost);
    }

    // 执行突破判定
    if (info.isMajor && baseFailRate > 0) {
      if (Math.random() < effectiveFailRate) {
        // 突破失败：扣一半灵力，等级不变
        const lostSpirit = Math.floor(breakthrough.cost / 2);
        const newSpirit = currentSpirit - lostSpirit;

        await db.collection('players').doc(player._id).update({
          data: { spirit_stone: newSpirit }
        });

        const failMsg = BREAKTHROUGH_FAIL_MESSAGES[info.fromRealm] || '突破失败，半数灵力消散。';
        return {
          ok: true,
          failed: true,
          message: failMsg,
          isMajor: true,
          fromRealm: info.fromRealm,
          toRealm: info.toRealm,
          newLevel: currentLevel,
          newSpirit: newSpirit,
          display: getCultivationDisplay(currentLevel).display,
          baseFailRate,
          effectiveFailRate,
          boostDetails,
        };
      }
    }

    // 执行突破
    const newLevel = currentLevel + 1;
    const newSpirit = currentSpirit - breakthrough.cost;

    await db.collection('players').doc(player._id).update({
      data: {
        cultivation_level: newLevel,
        spirit_stone: newSpirit,
      }
    });

    const newDisplay = getCultivationDisplay(newLevel);

    return {
      ok: true,
      failed: false,
      message: info.message,
      isMajor: info.isMajor,
      fromRealm: info.fromRealm,
      toRealm: info.toRealm,
      newLevel: newLevel,
      newSpirit: newSpirit,
      display: newDisplay.display,
      baseFailRate,
      effectiveFailRate,
      boostDetails,
    };
  } catch (err) {
    console.error(JSON.stringify({ func: 'breakthrough', openid: cloud.getWXContext().OPENID, error: err.message, stack: err.stack }));
    return { ok: false, message: '操作失败，请稍后再试' };
  }
};
