export interface H5ProfileMenuItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  badge?: string;
  description?: string;
}

export interface H5ProfileMenuGroup {
  id: string;
  title: string;
  layout: "grid" | "list";
  items: H5ProfileMenuItem[];
}

export interface H5ProfileOrderStatus extends H5ProfileMenuItem {
  count: number;
}

export interface H5StylePreferenceItem {
  id: string;
  label: string;
  percent: number;
  imageUrl?: string;
}

export interface H5ColorPreferenceItem {
  id: string;
  label: string;
  value: string;
}

export interface H5BodyMetricItem {
  id: string;
  label: string;
  value: string;
}

export interface H5FitTypeItem {
  id: string;
  label: string;
  description: string;
}

export interface H5InspirationItem {
  id: string;
  title: string;
  imageUrl: string;
}

export interface H5StyleArchive {
  profile: {
    displayName: string;
    statusLabel: string;
    avatar?: string;
    genderPreference?: string;
    height?: string;
    weight?: string;
    clothingSize?: string;
    shoeSize?: string;
  };
  summary: {
    recordCount: number;
    photoRecordCount: number;
    updatedAt?: string;
  };
  stylePreferences: H5StylePreferenceItem[];
  colorPreferences: H5ColorPreferenceItem[];
  avoidColors: string[];
  commonOccasions: string[];
  elementPreferences: string[];
  bodyMetrics: H5BodyMetricItem[];
  fitTypes: H5FitTypeItem[];
  inspiration: H5InspirationItem[];
  valueProps: H5ProfileMenuItem[];
  notes?: string;
}

export interface H5StyleProfileArchive {
  profileId?: number;
  userId?: number;
  genderPreference: string;
  height: string;
  weight: string;
  clothingSize: string;
  shoeSize: string;
  favoriteStyles: string[];
  favoriteColors: string[];
  avoidColors: string[];
  commonOccasions: string[];
  elementPreferences: string[];
  fitPreferences: string[];
  bodyMetrics: Partial<Record<"shoulder" | "bust" | "waist" | "hip" | "thigh" | "calf", string>>;
  basePhotos?: Partial<Record<"fullBody" | "face" | "makeupFree", H5StyleProfilePhoto>>;
  analysisReport?: H5StyleAnalysisReport;
  recommendedColors?: H5ColorPreferenceItem[];
  recommendedStyles?: H5RecommendedStyleItem[];
  analysisUpdatedAt?: string;
  completionPercent?: number;
  notes: string;
  updatedAt?: string;
}

export interface H5StyleProfilePhoto {
  url: string;
  updatedAt?: string;
}

export interface H5StyleAnalysisReport {
  bodyFeature?: H5StyleAnalysisItem;
  skinFeature?: H5StyleAnalysisItem;
  facialFeature?: H5StyleAnalysisItem;
  hairFeature?: H5StyleAnalysisItem;
  colorSeason?: H5StyleAnalysisItem;
  stylePositioning?: H5StyleAnalysisItem;
}

export interface H5StyleAnalysisItem {
  title?: string;
  points: string[];
  advice?: string;
}

export interface H5RecommendedStyleItem {
  label: string;
  description?: string;
  imageUrl?: string;
}

export interface H5ProfileOverview {
  user: {
    displayName: string;
    memberLevel: string;
    avatar?: string;
  };
  stats: {
    pointsBalance: number;
    dailyGenerated: number;
    dailyLimit: number;
    remainingToday: number;
  };
  benefits: H5ProfileMenuItem[];
  orderStatuses: H5ProfileOrderStatus[];
  invite: {
    title: string;
    subtitle: string;
    rewardPoints: number;
  };
  menuGroups: H5ProfileMenuGroup[];
  archive: H5StyleArchive;
}

export interface H5ProfileOverviewResponse {
  code: number;
  message?: string;
  data?: H5ProfileOverview;
}

export interface H5StyleProfileArchiveResponse {
  code: number;
  message?: string;
  data?: H5StyleProfileArchive;
}
