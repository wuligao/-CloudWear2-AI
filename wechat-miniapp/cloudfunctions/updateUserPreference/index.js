const cloud = require("wx-server-sdk");
const { updateUserPreferenceHandler } = require("../shared/handlers/user");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  return updateUserPreferenceHandler({
    cloud,
    event,
    wxContext: cloud.getWXContext(),
  });
};
