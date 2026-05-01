async function getUserProfileHandler({ cloud, wxContext }) {
  const db = cloud.database();
  const openid = wxContext.OPENID;
  const result = await db.collection("users").doc(openid).get().catch(() => ({ data: null }));
  if (result.data) return { profile: result.data };

  const now = new Date();
  const profile = {
    openid,
    nickname: "",
    avatar: "",
    gender: "",
    defaultStyle: "",
    defaultBudget: "",
    bodyTags: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.collection("users").doc(openid).set({ data: profile });
  return { profile: { _id: openid, ...profile } };
}

async function updateUserPreferenceHandler({ cloud, event, wxContext }) {
  const db = cloud.database();
  const data = {
    nickname: event.nickname || "",
    avatar: event.avatar || "",
    gender: event.gender || "",
    defaultStyle: event.defaultStyle || "",
    defaultBudget: event.defaultBudget || "",
    bodyTags: Array.isArray(event.bodyTags) ? event.bodyTags : [],
    updatedAt: new Date(),
  };

  await db.collection("users").doc(wxContext.OPENID).set({
    data: {
      openid: wxContext.OPENID,
      createdAt: event.createdAt || new Date(),
      ...data,
    },
  });
  return { ok: true, profile: { openid: wxContext.OPENID, ...data } };
}

module.exports = { getUserProfileHandler, updateUserPreferenceHandler };
