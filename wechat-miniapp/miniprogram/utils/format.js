function formatPlatform(platform) {
  return {
    taobao: "淘宝",
    jd: "京东",
    vip: "唯品会",
  }[platform] || platform || "平台";
}

function formatDate(value) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function compactRecord(record) {
  return {
    ...record,
    scene: record.inputConditions?.scene || "",
    season: record.inputConditions?.season || "",
    temperature: record.inputConditions?.temperature || "",
    style: record.inputConditions?.style || "",
    cover: record.imageFileId || record.imageUrl || "",
    createdText: formatDate(record.createdAt),
  };
}

module.exports = {
  compactRecord,
  formatDate,
  formatPlatform,
};
