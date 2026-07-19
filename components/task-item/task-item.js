/**
 * 任务条目组件
 * 属性：task - 任务对象 { _id, name, status, rewardsStr, subtasks }
 *       showActions - 是否显示完成/删除按钮
 *       showBadge - 是否显示"已达成"标记
 *       extraClass - 额外样式类名
 * 事件：dotask - 点击完成按钮
 *       delete - 点击删除按钮
 *       togglesubtask - 点击子任务 { index }
 */
Component({
  properties: {
    task: {
      type: Object,
      value: {},
      observer: function(newVal) {
        if (newVal && newVal.subtasks && newVal.subtasks.length > 0) {
          const done = newVal.subtasks.filter(s => s.done).length;
          this.setData({ subtaskPct: Math.round(done / newVal.subtasks.length * 100) });
        } else {
          this.setData({ subtaskPct: 0 });
        }
      },
    },
    showActions: {
      type: Boolean,
      value: true,
    },
    showBadge: {
      type: Boolean,
      value: false,
    },
    extraClass: {
      type: String,
      value: '',
    },
  },

  data: {
    subtaskPct: 0,
  },

  methods: {
    onDoTask() {
      const task = this.properties.task;
      if (task.status === '已完成') return;
      this.triggerEvent('dotask', { id: task._id, name: task.name });
    },

    onDeleteTask() {
      const task = this.properties.task;
      this.triggerEvent('delete', { id: task._id, name: task.name });
    },

    onShowDetail() {
      const task = this.properties.task;
      this.triggerEvent('detail', { id: task._id, name: task.name, description: task.description || '' });
    },

    onToggleSubtask(e) {
      const task = this.properties.task;
      const index = e.currentTarget.dataset.index;
      this.triggerEvent('togglesubtask', { id: task._id, index: index });
    },
  },
});
