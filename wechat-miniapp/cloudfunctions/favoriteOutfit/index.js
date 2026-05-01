const cloud = require("wx-server-sdk");
const { favoriteOutfitHandler } = require("../shared/handlers/records");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  return favoriteOutfitHandler({
    cloud,
    event,
    wxContext: cloud.getWXContext(),
  });
};
