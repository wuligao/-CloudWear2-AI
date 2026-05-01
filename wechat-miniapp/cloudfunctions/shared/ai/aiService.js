function isMockMode() {
  return (process.env.AI_MODE || "mock") !== "real";
}

async function parseUserNeed(input) {
  if (isMockMode()) {
    return {
      season: input.season,
      temperature: input.temperature,
      location: input.location,
      scene: input.scene,
      style: input.style,
      gender: input.gender,
      budget: input.budget,
      bodyTags: input.bodyTags || [],
      categories: ["上衣", "下装", "鞋履", "配饰"],
    };
  }

  throw new Error("Real AI parsing is not configured. Set AI_MODE=mock or implement provider credentials in cloud function env.");
}

async function generateProductKeywords(input, parsedTags) {
  if (isMockMode()) {
    const seasonPrefix = /夏/.test(input.season) ? "轻薄" : /冬/.test(input.season) ? "保暖" : "浅蓝";
    const bodyText = (input.bodyTags || []).join(" ");
    return [
      `${seasonPrefix}衬衫`,
      bodyText.includes("显高") ? "高腰阔腿裤" : "垂感阔腿裤",
      "小白鞋",
      input.style?.includes("法式") ? "云朵包" : "简约包包",
    ];
  }

  throw new Error("Real AI keyword generation is not configured.");
}

async function selectOutfitFromProducts(input, products) {
  if (!products.length) {
    throw new Error("没有可用的候选商品，无法生成真实可购买穿搭。");
  }

  if (!isMockMode()) {
    throw new Error("Real AI outfit selection is not configured.");
  }

  const selected = pickByCategory(products);
  const items = selected.map((product) => ({
    ...product,
    reason: buildProductReason(product, input),
  }));

  return {
    suggestion: `整体以${input.style || "休闲简约"}为主，优先选择高销量、高评分且适合${input.scene || "日常"}的真实商品，色彩保持清爽耐看。`,
    recommendationReason: `这套搭配覆盖上衣、下装、鞋履和配饰，价格控制在${input.budget || "默认预算"}内，并兼顾${(input.bodyTags || []).join("、") || "舒适显精神"}。`,
    keywords: items.map((item) => item.title.slice(0, 8)),
    items,
  };
}

async function generateOutfitImage(input, outfit) {
  if (!isMockMode()) {
    throw new Error("Real AI image generation is not configured.");
  }

  const title = encodeURIComponent(`${input.style || "AI穿搭"}搭配海报`);
  return {
    buffer: null,
    imageUrl: `https://dummyimage.com/900x1200/f5f0ff/5a46e8&text=${title}`,
    contentType: "image/png",
    prompt: `基于真实商品生成穿搭示意海报：${outfit.items.map((item) => item.title).join("，")}`,
  };
}

function pickByCategory(products) {
  const preferred = ["上衣", "外套", "下装", "鞋履", "配饰"];
  const picked = [];
  for (const category of preferred) {
    const product = products.find((item) => item.category === category && !picked.some((selected) => selected.id === item.id));
    if (product) picked.push(product);
  }
  for (const product of products) {
    if (picked.length >= 4) break;
    if (!picked.some((selected) => selected.id === product.id)) picked.push(product);
  }
  return picked.slice(0, 4);
}

function buildProductReason(product, input) {
  const platformText = { taobao: "淘宝", jd: "京东", vip: "唯品会" }[product.platform] || product.platform;
  return `${platformText}${product.shopType || "高评分店铺"}，销量${product.sales}，评分${product.rating}，适合${input.season || ""}${input.scene || ""}。`;
}

module.exports = {
  generateOutfitImage,
  generateProductKeywords,
  parseUserNeed,
  selectOutfitFromProducts,
};
