const { formatPlatform } = require("../../utils/format");

Component({
  properties: {
    product: {
      type: Object,
      value: {},
    },
  },

  observers: {
    product(product) {
      this.setData({
        platformText: formatPlatform(product.platform),
      });
    },
  },

  data: {
    platformText: "",
  },

  methods: {
    onBuy() {
      this.triggerEvent("buy", { product: this.data.product });
    },
  },
});
