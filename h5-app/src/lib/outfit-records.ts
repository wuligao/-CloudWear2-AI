import { outfitApiEndpoints } from "@/lib/api-endpoints";
import { getH5AuthHeader } from "@/lib/auth";
import { fetchWithTimeout } from "@/lib/request-timeout";
import type {
  ApiErrorResponse,
  OutfitGeneration,
  OutfitRecordListResponse,
  OutfitRecordStatusFilter,
} from "@/types/outfit";

interface SaveOutfitRecordPayload {
  generation: OutfitGeneration;
}

export async function listOutfitRecords({
  keyword,
  status = "all",
}: {
  keyword?: string;
  status?: OutfitRecordStatusFilter;
} = {}) {
  const response = await fetchWithTimeout(
    outfitApiEndpoints.outfitRecords({ keyword, status }),
    {
      cache: "no-store",
      headers: getH5AuthHeader(),
    },
  );
  const payload = await parseResponse<OutfitGeneration[] | OutfitRecordListResponse>(
    response,
    "穿搭记录读取失败。",
  );

  if (Array.isArray(payload)) {
    return {
      items: payload,
      summary: {
        all: payload.length,
        running: 0,
        succeeded: payload.length,
        failed: 0,
      },
    };
  }

  return payload;
}

export async function getOutfitRecord(recordId: string) {
  assertReadableRecordId(recordId);
  const response = await fetchWithTimeout(
    outfitApiEndpoints.outfitRecord(recordId),
    {
      cache: "no-store",
      headers: getH5AuthHeader(),
    },
  );
  return parseResponse<OutfitGeneration>(response, "穿搭记录详情读取失败。");
}

export async function saveOutfitRecord({ generation }: SaveOutfitRecordPayload) {
  const response = await fetch(outfitApiEndpoints.outfitRecords(), {
    method: "POST",
    headers: {
      ...getH5AuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: generation.userPhotoUsed ? "photo" : "keyword",
      generation,
    }),
  });

  return parseResponse<OutfitGeneration>(response, "穿搭记录保存失败。");
}

export async function deleteOutfitRecord(recordId: string) {
  const response = await fetch(
    outfitApiEndpoints.outfitRecord(recordId),
    {
      method: "DELETE",
      headers: getH5AuthHeader(),
    },
  );
  await parseResponse<{ success: boolean }>(response, "穿搭记录删除失败。");
}

async function parseResponse<T>(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as T | ApiErrorResponse | null;

  if (!response.ok) {
    throw new Error(
      isApiErrorResponse(payload) && payload.error ? payload.error : fallbackMessage,
    );
  }

  if (!payload) throw new Error(fallbackMessage);

  return payload as T;
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return Boolean(payload && typeof payload === "object" && "error" in payload);
}

function assertReadableRecordId(recordId: string) {
  const parsedRecordId = Number(recordId);
  if (!Number.isSafeInteger(parsedRecordId) || parsedRecordId <= 0) {
    throw new Error("穿搭记录ID格式不正确。");
  }
}
