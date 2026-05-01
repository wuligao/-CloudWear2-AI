const cloud = require("wx-server-sdk");
const { trackProductClickHandler } = require("../shared/handlers/records");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  return trackProductClickHandler({
    cloud,
    event,
    wxContext: cloud.getWXContext(),
  });
};
