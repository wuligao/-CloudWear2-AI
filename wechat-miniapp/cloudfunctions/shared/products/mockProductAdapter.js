const MOCK_PRODUCTS = [
  ["tb_shirt_001", "taobao", "浅蓝色宽松衬衫", 129, 23000, 4.8, 4.9, "旗舰店", "上衣", ["浅蓝衬衫", "通勤", "休闲简约"], 0.08],
  ["jd_pants_001", "jd", "高腰垂感阔腿裤", 189, 18000, 4.9, 4.8, "自营", "下装", ["高腰阔腿裤", "显高", "通勤"], 0.04],
  ["tb_shoes_001", "taobao", "轻量小白鞋女款", 159, 42000, 4.7, 4.8, "旗舰店", "鞋履", ["小白鞋", "日常出行", "旅行"], 0.06],
  ["vip_bag_001", "vip", "奶白云朵腋下包", 139, 8600, 4.8, 4.7, "高评分店铺", "配饰", ["包包", "法式", "轻熟"], 0.07],
  ["jd_knit_001", "jd", "薄款针织开衫", 169, 12000, 4.8, 4.8, "自营", "外套", ["春季", "温柔", "韩系"], 0.05],
  ["tb_skirt_001", "taobao", "A字高腰半身裙", 149, 26000, 4.9, 4.9, "旗舰店", "下装", ["显瘦", "约会聚餐", "法式"], 0.05],
  ["jd_sport_001", "jd", "速干运动卫衣", 199, 15000, 4.6, 4.7, "自营", "上衣", ["运动休闲", "秋季", "街头"], 0.04],
  ["vip_coat_001", "vip", "轻熟短款西装外套", 299, 9800, 4.7, 4.8, "高评分店铺", "外套", ["通勤", "轻熟", "显瘦"], 0.06],
  ["tb_bad_001", "taobao", "异常低价无图商品", 19, 100000, 4.9, 4.9, "普通店铺", "上衣", ["衬衫"], 0.8, ""],
];

async function searchProducts({ keywords = [] } = {}) {
  return MOCK_PRODUCTS.map(([id, platform, title, price, sales, rating, shopScore, shopType, category, tags, commissionRate, imageOverride]) => ({
    id,
    platform,
    title,
    price,
    sales,
    rating,
    shopScore,
    shopType,
    category,
    tags,
    commissionRate,
    imageUrl: imageOverride === "" ? "" : `https://dummyimage.com/640x800/f7f8fc/343b49&text=${encodeURIComponent(title)}`,
    purchaseUrl: `https://example.com/${platform}/${id}`,
    affiliateParams: {
      mock: true,
      sourcePlatform: platform,
      trackingId: `mock_${id}`,
    },
    relevanceScore: estimateKeywordHit(title, tags, keywords),
    reason: "",
  }));
}

function estimateKeywordHit(title, tags, keywords) {
  if (!keywords.length) return 0.78;
  const text = `${title} ${tags.join(" ")}`;
  const hits = keywords.filter((keyword) =>
    text.includes(keyword) || keyword.includes(tags[0]) || tags.some((tag) => keyword.includes(tag)),
  );
  return Math.min(0.98, 0.72 + hits.length * 0.08);
}

module.exports = { searchProducts };
