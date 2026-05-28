/**
 * 备忘录页面
 * 卡片列表 + 全屏编辑器，自动保存草稿
 */
const app = getApp();
const { getThemeData, applyThemeToSystemBars } = require('../../utils/theme');

Page({
  data: {
    themeClass: '',
    memos: [],
    loading: true,
    // 编辑模式
    editing: false,
    editId: '',
    editTitle: '',
    editContent: '',
    saveStatus: '', // 'saving' | 'saved' | ''
    // 滑动删除
    touchStartX: 0,
    swipedId: '',
  },

  _saveTimer: null,
  _isSaving: false,
  _pendingSave: false,

  onShow() {
    const themeData = getThemeData(app.globalData.theme);
    applyThemeToSystemBars(app.globalData.theme);
    this.setData(themeData);
    this.loadMemos();
  },

  onUnload() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
  },

  // 加载备忘录列表
  loadMemos() {
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'memos',
      data: { action: 'list' },
      success: (res) => {
        if (res.result.ok) {
          const memos = res.result.memos.map(m => ({
            ...m,
            preview: (m.content || '').slice(0, 50),
            timeStr: this.formatTime(m.updated_at),
          }));
          this.setData({ memos, loading: false });
        } else {
          wx.showToast({ title: '加载失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ loading: false });
      },
    });
  },

  // 格式化时间
  formatTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  // 新建备忘录
  addMemo() {
    this.setData({
      editing: true,
      editId: '',
      editTitle: '',
      editContent: '',
      saveStatus: '',
    });
  },

  // 编辑备忘录
  editMemo(e) {
    const { id } = e.currentTarget.dataset;
    const memo = this.data.memos.find(m => m._id === id);
    if (!memo) return;
    this.setData({
      editing: true,
      editId: memo._id,
      editTitle: memo.title || '',
      editContent: memo.content || '',
      saveStatus: '',
      swipedId: '',
    });
  },

  // 删除备忘录
  deleteMemo(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条备忘录吗？',
      confirmColor: '#ef5350',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'memos',
            data: { action: 'delete', _id: id },
            success: (r) => {
              if (r.result.ok) {
                wx.showToast({ title: '已删除', icon: 'success' });
                this.loadMemos();
              } else {
                wx.showToast({ title: r.result.message || '删除失败', icon: 'none' });
              }
            },
            fail: () => wx.showToast({ title: '网络错误', icon: 'none' }),
          });
        }
      },
    });
  },

  // 输入事件
  onTitleInput(e) {
    this.setData({ editTitle: e.detail.value });
    this.triggerAutoSave();
  },

  onContentInput(e) {
    this.setData({ editContent: e.detail.value });
    this.triggerAutoSave();
  },

  // 自动保存（500ms 防抖，防止并发重复创建）
  triggerAutoSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this.setData({ saveStatus: '' });
    if (this._isSaving) {
      this._pendingSave = true;
      return;
    }
    this._saveTimer = setTimeout(() => {
      this.doSave();
    }, 500);
  },

  // 检查是否有待处理的保存请求
  _checkPendingSave() {
    if (this._pendingSave) {
      this._pendingSave = false;
      this.doSave();
    }
  },

  // 执行保存（带并发保护）
  doSave(callback) {
    const { editId, editTitle, editContent } = this.data;
    // 标题和内容都为空则不保存
    if (!editTitle.trim() && !editContent.trim()) {
      if (callback) callback();
      return;
    }

    this._isSaving = true;
    this._pendingSave = false;
    this.setData({ saveStatus: 'saving' });

    const action = editId ? 'update' : 'add';
    const data = { action, title: editTitle, content: editContent };
    if (editId) data._id = editId;

    wx.cloud.callFunction({
      name: 'memos',
      data,
      success: (res) => {
        if (res.result.ok) {
          // 新建时保存返回的 _id
          if (!editId && res.result._id) {
            this.setData({ editId: res.result._id });
          }
          this.setData({ saveStatus: 'saved' });
          if (callback) callback();
        } else {
          this.setData({ saveStatus: '' });
          wx.showToast({ title: res.result.message || '保存失败', icon: 'none' });
        }
        this._isSaving = false;
        this._checkPendingSave();
      },
      fail: () => {
        this.setData({ saveStatus: '' });
        wx.showToast({ title: '网络错误', icon: 'none' });
        this._isSaving = false;
        this._checkPendingSave();
      },
    });
  },

  // 保存并返回列表
  saveAndBack() {
    this.doSave(() => {
      this.setData({ editing: false });
      this.loadMemos();
    });
  },

  // 取消编辑（确认弹窗）
  cancelEdit() {
    const { editTitle, editContent } = this.data;
    if (editTitle.trim() || editContent.trim()) {
      wx.showModal({
        title: '提示',
        content: '是否保存当前编辑？',
        cancelText: '不保存',
        confirmText: '保存',
        success: (res) => {
          if (res.confirm) {
            this.saveAndBack();
          } else {
            this.setData({ editing: false });
            this.loadMemos();
          }
        },
      });
    } else {
      this.setData({ editing: false });
      this.loadMemos();
    }
  },

  // 滑动删除 - touch 事件
  onTouchStart(e) {
    this.setData({ touchStartX: e.touches[0].clientX });
  },

  onTouchEnd(e) {
    const { id } = e.currentTarget.dataset;
    const endX = e.changedTouches[0].clientX;
    const diff = this.data.touchStartX - endX;
    // 左滑超过 80px 显示删除按钮
    if (diff > 80) {
      this.setData({ swipedId: id });
    } else if (diff < -30) {
      this.setData({ swipedId: '' });
    }
  },

  closeSwipe() {
    this.setData({ swipedId: '' });
  },
});
