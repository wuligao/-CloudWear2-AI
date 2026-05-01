async function searchProducts() {
  if (!process.env.JD_APP_KEY) {
    return [];
  }
  throw new Error("jdProductAdapter real API is not configured in this MVP.");
}

module.exports = { searchProducts };
