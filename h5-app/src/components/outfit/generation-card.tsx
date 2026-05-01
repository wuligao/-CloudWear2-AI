"use client";

import Image from "next/image";
import { useState } from "react";
import { CalendarDays, MapPin, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/outfit/delete-confirm-dialog";
import { resolveBackendAssetUrl } from "@/lib/api-endpoints";
import type { OutfitGeneration } from "@/types/outfit";

interface GenerationCardProps {
  generation: OutfitGeneration;
  onDelete?: (id: string) => void;
}

export function GenerationCard({ generation, onDelete }: GenerationCardProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function confirmDelete() {
    onDelete?.(generation.id);
    setDeleteConfirmOpen(false);
  }

  return (
    <article className="group grid overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[180px_1fr]">
      <div className="aspect-[2/3] bg-[var(--mist)] sm:aspect-[2/3]">
        <Image
          src={resolveBackendAssetUrl(generation.imageUrl)}
          alt={generation.outfitTitle}
          width={720}
          height={1080}
          unoptimized
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-lg font-semibold tracking-normal">
              {generation.outfitTitle}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
              {generation.summary}
            </p>
          </div>
          {onDelete ? (
            <button
              className="icon-button shrink-0"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setDeleteConfirmOpen(true);
              }}
              aria-label="删除记录"
              title="删除记录"
            >
              <Trash2 size={17} />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {generation.styleTags.slice(0, 4).map((tag) => (
            <span className="chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <dl className="mt-auto grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span className="truncate">{generation.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} />
          <span>{new Date(generation.createdAt).toLocaleDateString()}</span>
        </div>
      </dl>
      <DeleteConfirmDialog
        description={`即将删除「${generation.outfitTitle}」，删除后列表中将不再展示这条生成记录。`}
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  </article>
  );
}
