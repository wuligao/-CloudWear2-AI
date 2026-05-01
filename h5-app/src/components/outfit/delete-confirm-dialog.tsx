"use client";

import { Loader2, Trash2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  description?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title?: string;
}

export function DeleteConfirmDialog({
  description = "删除后该记录会从列表中移除，请确认是否继续。",
  loading = false,
  onCancel,
  onConfirm,
  open,
  title = "确认删除这条记录？",
}: DeleteConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      aria-labelledby="record-delete-confirm-title"
      aria-modal="true"
      className="record-delete-confirm-overlay"
      role="dialog"
    >
      <section className="record-delete-confirm-card">
        <div className="record-delete-confirm-icon" aria-hidden="true">
          <Trash2 size={22} />
        </div>
        <div className="record-delete-confirm-copy">
          <h2 id="record-delete-confirm-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="record-delete-confirm-actions">
          <button disabled={loading} type="button" onClick={onCancel}>
            取消
          </button>
          <button disabled={loading} type="button" onClick={onConfirm}>
            {loading ? <Loader2 size={17} /> : <Trash2 size={17} />}
            <span>{loading ? "正在删除" : "确认删除"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
