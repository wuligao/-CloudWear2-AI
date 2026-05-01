function callFunction(name, data = {}) {
  return wx.cloud.callFunction({ name, data }).then((res) => res.result);
}

function getDb() {
  return wx.cloud.database();
}

module.exports = {
  callFunction,
  getDb,
};
