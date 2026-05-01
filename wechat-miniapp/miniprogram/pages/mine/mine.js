const { callFunction } = require("../../utils/cloud");

Page({
  data: {
    profile: {
      defaultStyle: "",
      defaultBudget: "",
      bodyTags: [],
    },
    bodyTagsText: "",
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const { profile } = await callFunction("getUserProfile");
      this.setData({
        profile,
        bodyTagsText: (profile.bodyTags || []).join(","),
      });
      wx.setStorageSync("cloudwear.preference", profile);
    } catch (error) {
      const profile = wx.getStorageSync("cloudwear.preference") || this.data.profile;
      this.setData({
        profile,
        bodyTagsText: (profile.bodyTags || []).join(","),
      });
      wx.showToast({ title: "云端偏好加载失败，已显示本地缓存", icon: "none" });
    }
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`profile.${key}`]: event.detail.value });
  },

  onBodyTagsInput(event) {
    const value = event.detail.value;
    this.setData({
      bodyTagsText: value,
      "profile.bodyTags": value.split(/[,，]/).map((item) => item.trim()).filter(Boolean),
    });
  },

  async save() {
    const profile = this.data.profile;
    await callFunction("updateUserPreference", profile);
    wx.setStorageSync("cloudwear.preference", profile);
    wx.showToast({ title: "已保存", icon: "success" });
  },
});
