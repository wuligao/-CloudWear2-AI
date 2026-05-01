export interface ImageModelOption {
  id: string;
  label: string;
  group: string;
  supportsPhotoInput: boolean;
}

export const defaultImageModel = "gpt-4o-image";
export const defaultPhotoImageModel = "gpt-4o-image";

export const imageModelOptions = [
  {
    id: "gpt-4o-image",
    label: "GPT-4o Image",
    group: "BLTCY",
    supportsPhotoInput: false,
  },
  {
    id: "gpt-image-1.5",
    label: "GPT Image 1.5",
    group: "OpenAI",
    supportsPhotoInput: true,
  },
  {
    id: "gpt-image-1",
    label: "GPT Image 1",
    group: "OpenAI",
    supportsPhotoInput: true,
  },
  {
    id: "gpt-image-1-mini",
    label: "GPT Image 1 Mini",
    group: "OpenAI",
    supportsPhotoInput: true,
  },
] satisfies ImageModelOption[];

const imageModelIdSet = new Set(imageModelOptions.map((option) => option.id));

export function getImageModelOption(modelId: string) {
  return imageModelOptions.find((option) => option.id === modelId);
}

export function isSupportedImageModel(modelId: string) {
  return imageModelIdSet.has(modelId);
}
