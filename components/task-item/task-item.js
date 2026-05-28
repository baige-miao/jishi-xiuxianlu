/**
 * 任务条目组件
 * 属性：task - 任务对象 { _id, name, status, rewardsStr }
 *       showActions - 是否显示完成/删除按钮
 *       showBadge - 是否显示"已达成"标记
 *       extraClass - 额外样式类名
 * 事件：dotask - 点击完成按钮
 *       delete - 点击删除按钮
 */
Component({
  properties: {
    // 任务数据
    task: {
      type: Object,
      value: {},
    },
    // 是否显示操作按钮（完成/删除）
    showActions: {
      type: Boolean,
      value: true,
    },
    // 是否显示已达成标记
    showBadge: {
      type: Boolean,
      value: false,
    },
    // 额外样式类名
    extraClass: {
      type: String,
      value: '',
    },
  },

  methods: {
    // 触发完成事件
    onDoTask() {
      const task = this.properties.task;
      if (task.status === '已完成') return;
      this.triggerEvent('dotask', { id: task._id, name: task.name });
    },

    // 触发删除事件
    onDeleteTask() {
      const task = this.properties.task;
      this.triggerEvent('delete', { id: task._id, name: task.name });
    },

    // 触发详情事件
    onShowDetail() {
      const task = this.properties.task;
      this.triggerEvent('detail', { id: task._id, name: task.name, description: task.description || '' });
    },
  },
});
