async function uploadOutfitImage(cloud, openid, imageResult) {
  if (!imageResult.buffer) {
    return {
      fileID: "",
      imageUrl: imageResult.imageUrl,
    };
  }

  const cloudPath = `outfits/${openid}/${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
  const uploaded = await cloud.uploadFile({
    cloudPath,
    fileContent: imageResult.buffer,
  });
  return {
    fileID: uploaded.fileID,
    imageUrl: "",
  };
}

module.exports = { uploadOutfitImage };
