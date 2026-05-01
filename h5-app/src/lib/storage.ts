import type { OutfitGeneration } from "@/types/outfit";

const generationStorageKey = "cloudwear.generations.v1";
const profileStorageKey = "cloudwear.profile.v1";
const generationStoreEvent = "cloudwear-generations-change";
const profileStoreEvent = "cloudwear-profile-change";
const emptyGenerationsSnapshot = "[]";

export interface StyleProfile {
  favoriteStyles: string;
  favoriteColors: string;
  avoidColors: string;
  commonOccasions: string;
  notes: string;
}

export const emptyProfile: StyleProfile = {
  favoriteStyles: "",
  favoriteColors: "",
  avoidColors: "",
  commonOccasions: "",
  notes: "",
};

export function readGenerations(): OutfitGeneration[] {
  return parseGenerationsSnapshot(getGenerationsSnapshot());
}

export function parseGenerationsSnapshot(snapshot: string): OutfitGeneration[] {
  try {
    const parsedValue = JSON.parse(snapshot);
    if (!Array.isArray(parsedValue)) return [];
    return parsedValue as OutfitGeneration[];
  } catch {
    return [];
  }
}

export function getGenerationsSnapshot() {
  if (typeof window === "undefined") return emptyGenerationsSnapshot;

  return (
    window.localStorage.getItem(generationStorageKey) ?? emptyGenerationsSnapshot
  );
}

export function getServerGenerationsSnapshot() {
  return emptyGenerationsSnapshot;
}

export function subscribeGenerations(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(generationStoreEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(generationStoreEvent, onStoreChange);
  };
}

export function writeGenerations(generations: OutfitGeneration[]) {
  window.localStorage.setItem(
    generationStorageKey,
    JSON.stringify(generations.slice(0, 20)),
  );
  window.dispatchEvent(new Event(generationStoreEvent));
}

export function saveGeneration(generation: OutfitGeneration) {
  const generations = readGenerations();
  const nextGenerations = [
    generation,
    ...generations.filter((item) => item.id !== generation.id),
  ];
  writeGenerations(nextGenerations);
}

export function deleteGeneration(id: string) {
  const generations = readGenerations().filter((generation) => generation.id !== id);
  writeGenerations(generations);
}

export function readProfile(): StyleProfile {
  return parseProfileSnapshot(getProfileSnapshot());
}

export function parseProfileSnapshot(snapshot: string): StyleProfile {
  try {
    return { ...emptyProfile, ...JSON.parse(snapshot) } as StyleProfile;
  } catch {
    return emptyProfile;
  }
}

export function getProfileSnapshot() {
  if (typeof window === "undefined") return JSON.stringify(emptyProfile);

  return (
    window.localStorage.getItem(profileStorageKey) ?? JSON.stringify(emptyProfile)
  );
}

export function getServerProfileSnapshot() {
  return JSON.stringify(emptyProfile);
}

export function subscribeProfile(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(profileStoreEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(profileStoreEvent, onStoreChange);
  };
}

export function writeProfile(profile: StyleProfile) {
  window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
  window.dispatchEvent(new Event(profileStoreEvent));
}
