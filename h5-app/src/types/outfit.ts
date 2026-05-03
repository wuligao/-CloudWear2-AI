export interface OutfitRecommendationContext {
  kind: "weather";
  periodLabel: "今日" | "明日";
  sourceLabel?: string;
  forecastDateKey?: string;
  summary?: string;
  weather?: string;
  temperature?: number;
  highTemperature?: number;
  lowTemperature?: number;
  precipitationProbability?: number;
  location?: string;
  scenarioTaskId?: string;
  title?: string;
}

export interface OutfitPhotoModeContext {
  id: string;
  label: string;
  prompt: string;
}

export interface OutfitInput {
  season: string;
  temperature: number;
  weather: string;
  location: string;
  occasion: string;
  style: string;
  colorPreference?: string;
  genderPreference?: string;
  imageModel?: string;
  generationCount?: number;
  userPhotoDataUrl?: string;
  recommendationContext?: OutfitRecommendationContext;
  photoMode?: OutfitPhotoModeContext;
}

export interface OutfitItem {
  category: string;
  name: string;
  color: string;
  material: string;
  reason: string;
}

export interface OutfitPlan {
  outfitTitle: string;
  summary: string;
  styleTags: string[];
  temperatureAdvice: string;
  occasionReason: string;
  items: OutfitItem[];
  imagePrompt: string;
}

export interface OutfitGeneration extends OutfitInput, OutfitPlan {
  id: string;
  taskId?: string;
  source?: "keyword" | "photo";
  recordStatus?: "running" | "succeeded" | "failed";
  totalCount?: number;
  successCount?: number;
  failedCount?: number;
  generationDurationMs?: number;
  imageUrl: string;
  userPhotoUsed?: boolean;
  userPhotoUrl?: string;
  createdAt: string;
}

export type OutfitRecordStatusFilter =
  | "all"
  | "running"
  | "succeeded"
  | "failed";

export interface OutfitRecordListSummary {
  all: number;
  running: number;
  succeeded: number;
  failed: number;
}

export interface OutfitRecordListResponse {
  items: OutfitGeneration[];
  summary: OutfitRecordListSummary;
}

export type GenerateOutfitResponse = OutfitGeneration;

export type GenerationTaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export interface GenerateOutfitTaskSnapshot {
  taskId: string;
  status: GenerationTaskStatus;
  progress: number;
  message: string;
  result?: OutfitGeneration;
  results?: OutfitGeneration[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
