const { callFunction } = require("../../utils/cloud");
const { compactRecord } = require("../../utils/format");

Page({
  data: {
    records: [],
  },

  onShow() {
    this.loadHistory();
  },

  async loadHistory() {
    try {
      const { records } = await callFunction("getHistory");
      this.setData({ records: records.map(compactRecord) });
    } catch (error) {
      wx.showToast({ title: "历史加载失败", icon: "none" });
    }
  },

  openRecord(event) {
    wx.navigateTo({
      url: `/pages/result/result?recordId=${event.detail.record._id}`,
    });
  },

  async deleteRecord(event) {
    const record = event.detail.record;
    await callFunction("deleteHistory", { recordId: record._id });
    this.setData({
      records: this.data.records.filter((item) => item._id !== record._id),
    });
  },
});
