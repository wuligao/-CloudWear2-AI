const { callFunction } = require("../../utils/cloud");

const steps = [
  "分析条件",
  "生成商品关键词",
  "召回真实商品",
  "筛选高销量高口碑商品",
  "AI组合穿搭方案",
  "生成搭配效果图",
];

Page({
  data: {
    steps,
    activeStep: 0,
    currentText: steps[0],
    error: "",
  },

  onLoad() {
    this.start();
  },

  async start() {
    const input = wx.getStorageSync("cloudwear.pendingInput");
    if (!input) {
      this.setData({ error: "没有找到待生成条件，请返回首页重新填写。" });
      return;
    }

    this.setData({ error: "", activeStep: 0, currentText: steps[0] });
    const timer = this.playSteps();

    try {
      const result = await callFunction("generateOutfit", input);
      clearInterval(timer);
      getApp().globalData.latestOutfit = result;
      wx.setStorageSync("cloudwear.latestOutfit", result);
      wx.redirectTo({
        url: `/pages/result/result?recordId=${result.recordId}`,
      });
    } catch (error) {
      clearInterval(timer);
      this.setData({
        error: error && error.message ? error.message : "云函数调用失败，请稍后重试。",
      });
    }
  },

  playSteps() {
    let index = 0;
    return setInterval(() => {
      index = Math.min(index + 1, steps.length - 1);
      this.setData({
        activeStep: index,
        currentText: steps[index],
      });
    }, 850);
  },

  goBackHome() {
    wx.navigateBack();
  },
});
