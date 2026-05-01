function buildNeedPrompt(input) {
  return [
    "你是电商穿搭买手，请把用户条件解析成季节、体感、场景、风格、预算、身材诉求和商品类目。",
    "只能输出 JSON，不要编造商城商品。",
    JSON.stringify(input),
  ].join("\n");
}

function buildSelectionPrompt(input, products) {
  return [
    "从候选商品中选择一套可购买穿搭。只能返回候选商品 id。",
    JSON.stringify({ input, products: products.map(({ id, title, category, price, sales, rating, shopScore }) => ({ id, title, category, price, sales, rating, shopScore })) }),
  ].join("\n");
}

module.exports = { buildNeedPrompt, buildSelectionPrompt };
