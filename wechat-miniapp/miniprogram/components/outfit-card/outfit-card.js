Component({
  properties: {
    record: {
      type: Object,
      value: {},
    },
  },

  methods: {
    onOpen() {
      this.triggerEvent("open", { record: this.data.record });
    },

    onDelete() {
      this.triggerEvent("delete", { record: this.data.record });
    },
  },
});
