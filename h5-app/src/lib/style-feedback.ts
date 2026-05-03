import { outfitApiEndpoints } from "@/lib/api-endpoints";
import { getH5AuthHeader } from "@/lib/auth";
import { fetchWithTimeout } from "@/lib/request-timeout";
import type { ApiErrorResponse, OutfitGeneration } from "@/types/outfit";

export async function submitOutfitFeedback({
  feedback,
  generation,
}: {
  feedback: string;
  generation: OutfitGeneration;
}) {
  const response = await fetchWithTimeout(outfitApiEndpoints.h5ProfileFeedback(), {
    method: "POST",
    headers: {
      ...getH5AuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      feedback,
      generation: {
        outfitTitle: generation.outfitTitle,
        summary: generation.summary,
        style: generation.style,
        colorPreference: generation.colorPreference,
        occasion: generation.occasion,
        styleTags: generation.styleTags,
        items: generation.items.map((item) => ({
          category: item.category,
          name: item.name,
        })),
        photoMode: generation.photoMode,
        recommendationContext: generation.recommendationContext
          ? {
              title: generation.recommendationContext.title,
              sourceLabel: generation.recommendationContext.sourceLabel,
            }
          : undefined,
      },
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { data?: unknown }
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(
      isApiErrorResponse(payload) && payload.error
        ? payload.error
        : "穿搭反馈保存失败。",
    );
  }

  return payload;
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return Boolean(payload && typeof payload === "object" && "error" in payload);
}
