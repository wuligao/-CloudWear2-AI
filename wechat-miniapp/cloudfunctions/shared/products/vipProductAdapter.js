async function searchProducts() {
  if (!process.env.VIP_APP_KEY) {
    return [];
  }
  throw new Error("vipProductAdapter real API is not configured in this MVP.");
}

module.exports = { searchProducts };
