import type { OutfitPhotoModeContext } from "../types/outfit";

export interface PhotoMode extends OutfitPhotoModeContext {
  description: string;
}

export const photoModes: PhotoMode[] = [
  {
    id: "slimmer",
    label: "更显瘦",
    description: "优化比例和线条",
    prompt: "照片换搭模式：更显瘦，优化身材比例和纵向线条，避免臃肿。",
  },
  {
    id: "daily",
    label: "更日常",
    description: "真实出门不费力",
    prompt: "照片换搭模式：更日常，适合真实出门，舒适自然但不随便。",
  },
  {
    id: "premium",
    label: "更高级",
    description: "质感更干净利落",
    prompt: "照片换搭模式：更高级，提升面料质感、色彩克制和整体精致度。",
  },
  {
    id: "photo-ready",
    label: "更适合拍照",
    description: "强化出片和层次",
    prompt: "照片换搭模式：更适合拍照，强化轮廓层次、色彩表现和镜头出片效果。",
  },
];

export const defaultPhotoModeId = "daily";

export function getPhotoModeById(id: string | null | undefined) {
  return photoModes.find((mode) => mode.id === id);
}

export function buildPhotoModeStyle(
  keywordText: string,
  mode: OutfitPhotoModeContext | null | undefined,
) {
  return [keywordText, mode?.prompt]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join("，")
    .slice(0, 80);
}

export function getPhotoModeLabel(
  mode: OutfitPhotoModeContext | null | undefined,
) {
  return mode?.label ? `照片换搭 · ${mode.label}` : "";
}
