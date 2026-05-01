const cloud = require("wx-server-sdk");
const { getUserProfileHandler } = require("../shared/handlers/user");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  return getUserProfileHandler({
    cloud,
    event,
    wxContext: cloud.getWXContext(),
  });
};
