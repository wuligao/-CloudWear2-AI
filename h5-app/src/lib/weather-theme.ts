export type DailyWeatherVisualTheme =
  | "cloudy"
  | "mild"
  | "night"
  | "overcast"
  | "rainy"
  | "snowy"
  | "sunny"
  | "windy";

export type CloudWearWeatherTheme =
  | "cold-editorial"
  | "editorial"
  | "showcase"
  | "soft"
  | "utility";

export interface DailyWeatherThemeInput {
  periodLabel?: string;
  temperature: number;
  weather: string;
}

export function getDailyWeatherVisualTheme(
  weather: DailyWeatherThemeInput,
): DailyWeatherVisualTheme {
  const currentHour = new Date().getHours();
  if (/夜|晚/u.test(weather.weather)) return "night";
  if (
    weather.periodLabel === "今日" &&
    (currentHour >= 18 || currentHour < 6) &&
    /晴|云/u.test(weather.weather)
  ) return "night";
  if (/雪|冷|降温|寒/u.test(weather.weather) || weather.temperature <= 6) return "snowy";
  if (/雨|阵雨|雷/u.test(weather.weather)) return "rainy";
  if (/阴|雾|霾/u.test(weather.weather)) return "overcast";
  if (/风/u.test(weather.weather)) return "windy";
  if (/晴|热/u.test(weather.weather) || weather.temperature >= 30) return "sunny";
  if (/云|雾|阴/u.test(weather.weather)) return "cloudy";
  if (/冷|降温|寒/u.test(weather.weather) || weather.temperature <= 12) return "snowy";
  return "mild";
}

export function getCloudWearWeatherTheme(
  weatherTheme: DailyWeatherVisualTheme,
): CloudWearWeatherTheme {
  if (weatherTheme === "night") return "showcase";
  if (weatherTheme === "snowy") return "cold-editorial";
  if (weatherTheme === "mild") return "soft";
  if (
    weatherTheme === "cloudy" ||
    weatherTheme === "overcast" ||
    weatherTheme === "rainy" ||
    weatherTheme === "windy"
  ) return "utility";
  return "editorial";
}
