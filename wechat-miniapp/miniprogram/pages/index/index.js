const defaultForm = {
  season: "春季",
  temperature: "20-25℃",
  location: "上海 静安寺",
  scene: "日常出行",
  style: "休闲简约",
  gender: "不限",
  budget: "500-1000元",
  bodyTags: ["显瘦"],
};

const bodyTags = ["梨形身材", "苹果型", "显高", "显瘦", "腿长", "遮肉"];

Page({
  data: {
    seasons: ["春季", "夏季", "秋季", "冬季"],
    scenes: ["日常出行", "通勤上班", "约会聚餐", "旅行度假", "运动休闲"],
    styles: ["休闲简约", "韩系", "法式", "甜酷", "通勤", "轻熟", "街头"],
    genders: ["女", "男", "不限"],
    budgets: ["300-500元", "500-1000元", "1000-2000元"],
    bodyTags,
    bodyTagOptions: buildBodyTagOptions(defaultForm.bodyTags),
    form: defaultForm,
  },

  onShow() {
    const preference = wx.getStorageSync("cloudwear.preference");
    if (preference) {
      const form = {
        ...this.data.form,
        style: preference.defaultStyle || this.data.form.style,
        budget: preference.defaultBudget || this.data.form.budget,
        bodyTags: preference.bodyTags || this.data.form.bodyTags,
      };
      this.setData({
        form,
        bodyTagOptions: buildBodyTagOptions(form.bodyTags),
      });
    }
  },

  selectOption(event) {
    const { key, value } = event.currentTarget.dataset;
    this.setData({ [`form.${key}`]: value });
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  toggleBodyTag(event) {
    const value = event.currentTarget.dataset.value;
    const current = this.data.form.bodyTags;
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    this.setData({ "form.bodyTags": next });
    this.setData({ bodyTagOptions: buildBodyTagOptions(next) });
  },

  submit() {
    wx.setStorageSync("cloudwear.pendingInput", this.data.form);
    wx.navigateTo({ url: "/pages/generating/generating" });
  },
});

function buildBodyTagOptions(selected) {
  return bodyTags.map((label) => ({
    label,
    active: selected.includes(label),
  }));
}
