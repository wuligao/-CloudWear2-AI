const cloud = require("wx-server-sdk");
const { deleteHistoryHandler } = require("../shared/handlers/records");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  return deleteHistoryHandler({
    cloud,
    event,
    wxContext: cloud.getWXContext(),
  });
};
