const assert = require("node:assert/strict");
const test = require("node:test");

const {
  filterAndRankProducts,
  isProductWithinBudget,
} = require("../shared/scoring/productScoring");
const { getCandidateProducts } = require("../shared/products/productService");
const { selectOutfitFromProducts } = require("../shared/ai/aiService");

test("filters low quality products and ranks quality above commission", () => {
  const products = [
    {
      id: "bad_no_image",
      title: "无图高佣商品",
      imageUrl: "",
      price: 199,
      sales: 99999,
      rating: 4.9,
      shopScore: 4.9,
      commissionRate: 0.5,
      relevanceScore: 1,
    },
    {
      id: "bad_rating",
      title: "低评分外套",
      imageUrl: "https://example.com/bad.jpg",
      price: 188,
      sales: 10000,
      rating: 3.6,
      shopScore: 4.8,
      commissionRate: 0.5,
      relevanceScore: 1,
    },
    {
      id: "high_commission",
      title: "普通店高佣衬衫",
      imageUrl: "https://example.com/commission.jpg",
      price: 169,
      sales: 9000,
      rating: 4.5,
      shopScore: 4.5,
      shopType: "高评分店铺",
      commissionRate: 0.9,
      relevanceScore: 0.82,
    },
    {
      id: "flagship",
      title: "旗舰店高口碑衬衫",
      imageUrl: "https://example.com/flagship.jpg",
      price: 189,
      sales: 23000,
      rating: 4.9,
      shopScore: 4.9,
      shopType: "旗舰店",
      commissionRate: 0.05,
      relevanceScore: 0.95,
    },
  ];

  const ranked = filterAndRankProducts(products, {
    budget: "300-500元",
    keywords: ["衬衫"],
  });

  assert.deepEqual(
    ranked.map((product) => product.id),
    ["flagship", "high_commission"],
  );
  assert.ok(ranked[0].qualityScore > ranked[1].qualityScore);
});

test("budget matching accepts products inside per-item MVP range", () => {
  assert.equal(isProductWithinBudget(129, "300-500元"), true);
  assert.equal(isProductWithinBudget(899, "300-500元"), false);
  assert.equal(isProductWithinBudget(599, "500-1000元"), true);
});

test("mock product service returns ranked candidates for generated keywords", async () => {
  const products = await getCandidateProducts({
    keywords: ["浅蓝衬衫", "高腰阔腿裤", "小白鞋"],
    budget: "500-1000元",
    scene: "日常出行",
    style: "休闲简约",
  });

  assert.ok(products.length >= 3);
  assert.ok(products.every((product) => product.imageUrl));
  assert.ok(products[0].qualityScore >= products.at(-1).qualityScore);
});

test("mock AI selection only references candidate product ids", async () => {
  const products = await getCandidateProducts({
    keywords: ["浅蓝衬衫", "高腰阔腿裤", "小白鞋"],
    budget: "500-1000元",
    scene: "日常出行",
    style: "休闲简约",
  });

  const outfit = await selectOutfitFromProducts(
    { scene: "日常出行", style: "休闲简约", season: "春季" },
    products,
  );
  const candidateIds = new Set(products.map((product) => product.id));

  assert.ok(outfit.items.length >= 3);
  assert.ok(outfit.items.every((item) => candidateIds.has(item.id)));
});
