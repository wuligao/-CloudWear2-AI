const cloud = require("wx-server-sdk");
const { getOutfitDetailHandler } = require("../shared/handlers/records");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  return getOutfitDetailHandler({
    cloud,
    event,
    wxContext: cloud.getWXContext(),
  });
};
