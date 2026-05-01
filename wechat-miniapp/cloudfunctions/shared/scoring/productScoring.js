const MIN_SALES = 500;
const MIN_RATING = 4.2;
const MIN_SHOP_SCORE = 4.2;

function parseBudgetRange(budget = "") {
  const numbers = String(budget).match(/\d+/g)?.map(Number) || [];
  if (numbers.length >= 2) return { min: numbers[0], max: numbers[1] };
  if (numbers.length === 1) return { min: 0, max: numbers[0] };
  return { min: 0, max: 99999 };
}

function isProductWithinBudget(price, budget) {
  const { min, max } = parseBudgetRange(budget);
  const perItemMin = Math.max(0, min * 0.18);
  const perItemMax = max * 1.2;
  return Number(price) >= perItemMin && Number(price) <= perItemMax;
}

function normalize(value, max) {
  return Math.max(0, Math.min(1, Number(value || 0) / max));
}

function getShopTypeScore(shopType = "") {
  if (/旗舰/.test(shopType)) return 1;
  if (/自营/.test(shopType)) return 0.96;
  if (/高评分/.test(shopType)) return 0.88;
  return 0.72;
}

function getPriceScore(price, budget) {
  const { min, max } = parseBudgetRange(budget);
  const target = (min + max) / 2 / 3;
  if (!target) return 0.8;
  const distance = Math.abs(Number(price) - target) / target;
  return Math.max(0, 1 - distance);
}

function scoreProduct(product, context = {}) {
  const relevance = product.relevanceScore ?? estimateRelevance(product, context.keywords);
  const hotScore = normalize(Math.log10(Number(product.sales || 0) + 1), 5);
  const shopScore = (normalize(product.shopScore, 5) + getShopTypeScore(product.shopType)) / 2;
  const priceScore = getPriceScore(product.price, context.budget);
  const reviewScore = normalize(product.rating, 5);
  const commissionScore = normalize(product.commissionRate, 1);

  return Number(
    (
      relevance * 35 +
      hotScore * 20 +
      shopScore * 20 +
      priceScore * 10 +
      reviewScore * 10 +
      commissionScore * 5
    ).toFixed(2),
  );
}

function estimateRelevance(product, keywords = []) {
  if (!keywords.length) return product.relevanceScore || 0.76;
  const source = `${product.title || ""} ${(product.tags || []).join(" ")}`;
  const hits = keywords.filter((keyword) => source.includes(keyword.replace(/[浅深高低]/g, "")));
  return Math.min(1, 0.62 + hits.length * 0.1);
}

function isQualityProduct(product, context = {}) {
  if (!product.imageUrl) return false;
  if (Number(product.sales || 0) < MIN_SALES) return false;
  if (Number(product.rating || 0) < MIN_RATING) return false;
  if (Number(product.shopScore || 0) < MIN_SHOP_SCORE) return false;
  if (!isProductWithinBudget(product.price, context.budget)) return false;
  return true;
}

function filterAndRankProducts(products, context = {}) {
  return products
    .filter((product) => isQualityProduct(product, context))
    .map((product) => ({
      ...product,
      qualityScore: scoreProduct(product, context),
    }))
    .sort((left, right) => {
      if (right.qualityScore !== left.qualityScore) {
        return right.qualityScore - left.qualityScore;
      }
      return Number(right.sales || 0) - Number(left.sales || 0);
    });
}

module.exports = {
  filterAndRankProducts,
  isProductWithinBudget,
  parseBudgetRange,
  scoreProduct,
};
