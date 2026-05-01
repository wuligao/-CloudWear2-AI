const { filterAndRankProducts } = require("../scoring/productScoring");
const mockProductAdapter = require("./mockProductAdapter");
const taobaoProductAdapter = require("./taobaoProductAdapter");
const jdProductAdapter = require("./jdProductAdapter");
const vipProductAdapter = require("./vipProductAdapter");

const adapters = {
  mock: mockProductAdapter,
  taobao: taobaoProductAdapter,
  jd: jdProductAdapter,
  vip: vipProductAdapter,
};

function getEnabledAdapters() {
  const source = process.env.PRODUCT_SOURCE || "mock";
  if (source === "real") return [taobaoProductAdapter, jdProductAdapter, vipProductAdapter, mockProductAdapter];
  return (source.split(",").map((name) => adapters[name.trim()]).filter(Boolean));
}

async function getCandidateProducts(context) {
  const batches = await Promise.all(
    getEnabledAdapters().map(async (adapter) => {
      try {
        return await adapter.searchProducts(context);
      } catch (error) {
        if (process.env.PRODUCT_SOURCE === "real") throw error;
        return [];
      }
    }),
  );

  const merged = dedupeById(batches.flat());
  return filterAndRankProducts(merged, context).slice(0, 24);
}

function dedupeById(products) {
  const map = new Map();
  for (const product of products) {
    if (!map.has(product.id)) map.set(product.id, product);
  }
  return Array.from(map.values());
}

module.exports = { getCandidateProducts };
