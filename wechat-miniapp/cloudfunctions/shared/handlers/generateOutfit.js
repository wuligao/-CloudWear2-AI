const { parseUserNeed, generateProductKeywords, selectOutfitFromProducts, generateOutfitImage } = require("../ai/aiService");
const { getCandidateProducts } = require("../products/productService");
const { uploadOutfitImage } = require("../storage/imageStorage");

async function generateOutfitHandler({ cloud, event, wxContext }) {
  const db = cloud.database();
  const openid = wxContext.OPENID;
  const now = new Date();
  const input = normalizeInput(event);

  const parsedTags = await parseUserNeed(input);
  const keywords = await generateProductKeywords(input, parsedTags);
  const candidates = await getCandidateProducts({ ...input, keywords });
  const outfit = await selectOutfitFromProducts(input, candidates);
  const imageResult = await generateOutfitImage(input, outfit);
  const storedImage = await uploadOutfitImage(cloud, openid, imageResult);

  const record = {
    openid,
    inputConditions: input,
    parsedTags,
    suggestion: outfit.suggestion,
    recommendationReason: outfit.recommendationReason,
    imageFileId: storedImage.fileID,
    imageUrl: storedImage.imageUrl,
    keywords,
    selectedProducts: outfit.items,
    status: "success",
    createdAt: now,
    updatedAt: now,
  };

  const added = await db.collection("outfit_records").add({ data: record });
  return {
    recordId: added._id,
    suggestion: record.suggestion,
    recommendationReason: record.recommendationReason,
    imageFileId: record.imageFileId,
    imageUrl: record.imageUrl,
    keywords,
    items: outfit.items,
  };
}

function normalizeInput(event = {}) {
  return {
    season: event.season || "春季",
    temperature: event.temperature || "20-25℃",
    location: event.location || "城市街区",
    scene: event.scene || "日常出行",
    style: event.style || "休闲简约",
    gender: event.gender || "女",
    budget: event.budget || "500-1000元",
    bodyTags: Array.isArray(event.bodyTags) ? event.bodyTags : [],
  };
}

module.exports = { generateOutfitHandler, normalizeInput };
