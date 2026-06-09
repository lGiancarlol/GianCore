"use client";

import Modal from "./Modal";

interface ConfirmDialogProps {
  open:        boolean;
  onClose:     () => void;
  onConfirm:   () => void;
  title:       string;
  description: string;
  confirmText?: string;
  loading?:    boolean;
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmText = "Confirmar", loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? "..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}
