const cloud = require("wx-server-sdk");
const { generateOutfitHandler } = require("../shared/handlers/generateOutfit");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  return generateOutfitHandler({
    cloud,
    event,
    wxContext: cloud.getWXContext(),
  });
};
