export function toggleSelectable(value: string, values: string[]) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function toggleKeywordText(text: string, keyword: string) {
  const parts = text
    .split(/[，,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return hasKeyword(text, keyword)
    ? parts.filter((part) => !matchesKeyword(part, keyword)).join("，")
    : [...parts, keyword].join("，");
}

export function hasKeyword(text: string, keyword: string) {
  return text
    .split(/[，,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => matchesKeyword(part, keyword));
}

export function buildColorPreference(selectedColor: string, customColor: string) {
  return selectedColor === "自定义" ? `自定义色 ${customColor.toUpperCase()}` : selectedColor;
}

export function addCustomSelectable(value: string, values: string[]) {
  const normalized = value.trim();
  if (!normalized) return values;
  if (values.some((item) => matchesKeyword(item, normalized))) {
    return values;
  }

  return [...values, normalized];
}

function matchesKeyword(part: string, keyword: string) {
  return part === keyword || part.includes(keyword) || keyword.includes(part);
}
