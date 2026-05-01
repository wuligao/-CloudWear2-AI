async function getHistoryHandler({ cloud, wxContext }) {
  const db = cloud.database();
  const result = await db
    .collection("outfit_records")
    .where({ openid: wxContext.OPENID })
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();
  return { records: result.data };
}

async function getOutfitDetailHandler({ cloud, event, wxContext }) {
  const db = cloud.database();
  const result = await db
    .collection("outfit_records")
    .doc(event.recordId)
    .get();
  if (!result.data || result.data.openid !== wxContext.OPENID) {
    throw new Error("记录不存在或无权访问。");
  }
  return { record: result.data };
}

async function deleteHistoryHandler({ cloud, event, wxContext }) {
  const db = cloud.database();
  const detail = await db.collection("outfit_records").doc(event.recordId).get();
  if (!detail.data || detail.data.openid !== wxContext.OPENID) {
    throw new Error("记录不存在或无权删除。");
  }
  await db.collection("outfit_records").doc(event.recordId).remove();
  return { ok: true };
}

async function favoriteOutfitHandler({ cloud, event, wxContext }) {
  const db = cloud.database();
  const now = new Date();
  const targetType = event.targetType || "outfit";
  const targetId = event.targetId || event.recordId || event.productId;
  if (!targetId) throw new Error("缺少收藏目标。");

  const existed = await db.collection("favorites").where({
    openid: wxContext.OPENID,
    targetType,
    targetId,
  }).limit(1).get();

  if (existed.data.length) {
    return { favoriteId: existed.data[0]._id, duplicated: true };
  }

  const added = await db.collection("favorites").add({
    data: {
      openid: wxContext.OPENID,
      targetType,
      targetId,
      createdAt: now,
    },
  });
  return { favoriteId: added._id, duplicated: false };
}

async function trackProductClickHandler({ cloud, event, wxContext }) {
  const db = cloud.database();
  const added = await db.collection("product_clicks").add({
    data: {
      openid: wxContext.OPENID,
      recordId: event.recordId,
      productId: event.productId,
      platform: event.platform,
      trackingId: event.trackingId || "",
      affiliateParams: event.affiliateParams || {},
      createdAt: new Date(),
    },
  });
  return { clickId: added._id, ok: true };
}

module.exports = {
  deleteHistoryHandler,
  favoriteOutfitHandler,
  getHistoryHandler,
  getOutfitDetailHandler,
  trackProductClickHandler,
};
