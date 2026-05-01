async function searchProducts() {
  if (!process.env.TAOBAO_APP_KEY) {
    return [];
  }
  throw new Error("taobaoProductAdapter real API is not configured in this MVP.");
}

module.exports = { searchProducts };
