const cloud = require("wx-server-sdk");
const { getHistoryHandler } = require("../shared/handlers/records");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  return getHistoryHandler({
    cloud,
    event,
    wxContext: cloud.getWXContext(),
  });
};
