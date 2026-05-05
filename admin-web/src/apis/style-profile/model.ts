export interface H5StylePreferenceItem {
  id: string
  label: string
  percent: number
  imageUrl?: string
}

export interface H5ColorPreferenceItem {
  id: string
  label: string
  value: string
}

export interface H5BodyMetricItem {
  id: string
  label: string
  value: string
}

export interface H5FitTypeItem {
  id: string
  label: string
  description: string
}

export interface H5InspirationItem {
  id: string
  title: string
  imageUrl: string
}

export interface H5StyleArchive {
  profile: {
    displayName: string
    statusLabel: string
    avatar?: string
    genderPreference?: string
    height?: string
    weight?: string
    clothingSize?: string
    shoeSize?: string
  }
  summary: {
    recordCount: number
    photoRecordCount: number
    updatedAt?: string
  }
  stylePreferences: H5StylePreferenceItem[]
  colorPreferences: H5ColorPreferenceItem[]
  avoidColors: string[]
  commonOccasions: string[]
  elementPreferences: string[]
  bodyMetrics: H5BodyMetricItem[]
  fitTypes: H5FitTypeItem[]
  inspiration: H5InspirationItem[]
  valueProps: Array<{
    id: string
    label: string
    icon: string
    description?: string
  }>
}

export interface H5StyleProfileUserCard {
  id: string
  userId?: number
  displayName: string
  avatar?: string
  statusLabel: string
  recordCount: number
  photoRecordCount: number
  styleCount: number
  colorCount: number
  elementCount: number
  inspirationCount: number
  topStyles: string[]
  updatedAt?: string
}

export interface StyleProfileQueryParams {
  userId?: string
  keyword?: string
}
