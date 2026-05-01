const { callFunction } = require("../../utils/cloud");

Page({
  data: {
    loading: true,
    record: null,
  },

  onLoad(options) {
    this.loadRecord(options.recordId);
  },

  onShareAppMessage() {
    return {
      title: "我的 AI 穿搭方案",
      path: "/pages/index/index",
    };
  },

  async loadRecord(recordId) {
    try {
      if (recordId) {
        const { record } = await callFunction("getOutfitDetail", { recordId });
        this.setData({ record: normalizeRecord(record), loading: false });
        return;
      }

      const latest = getApp().globalData.latestOutfit || wx.getStorageSync("cloudwear.latestOutfit");
      this.setData({ record: normalizeRecord(latest), loading: false });
    } catch (error) {
      wx.showToast({ title: "详情加载失败", icon: "none" });
      this.setData({ loading: false });
    }
  },

  saveHistory() {
    wx.showToast({ title: "已保存到历史", icon: "success" });
  },

  async favorite() {
    await callFunction("favoriteOutfit", {
      targetType: "outfit",
      targetId: this.data.record.recordId || this.data.record._id,
    });
    wx.showToast({ title: "已收藏", icon: "success" });
  },

  regenerate() {
    wx.navigateTo({ url: "/pages/generating/generating" });
  },

  copyKeywords() {
    wx.setClipboardData({
      data: (this.data.record.keywords || []).join(" "),
    });
  },

  async buyProduct(event) {
    const product = event.detail.product;
    await callFunction("trackProductClick", {
      recordId: this.data.record.recordId || this.data.record._id,
      productId: product.id,
      platform: product.platform,
      trackingId: product.affiliateParams?.trackingId || "",
      affiliateParams: product.affiliateParams || {},
    });

    wx.setClipboardData({
      data: product.purchaseUrl || product.title,
      success: () => {
        wx.showModal({
          title: "购买信息已复制",
          content: "MVP 阶段使用 mock 跳转，真实联盟转链接入后可替换为小程序跳转或中转页。",
          showCancel: false,
        });
      },
    });
  },
});

function normalizeRecord(record = {}) {
  if (record.selectedProducts) {
    return {
      ...record,
      recordId: record._id,
      items: record.selectedProducts,
    };
  }
  return record;
}
