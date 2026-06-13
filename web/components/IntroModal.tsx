"use client";

import { useEffect, useRef, useState } from "react";

type IntroModalProps = {
  open: boolean;
  onClose: () => void;
};

export function IntroModal({ open, onClose }: IntroModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    setIframeKey((k) => k + 1);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="intro-modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="AI Search Rank intro"
    >
      <button
        type="button"
        className="intro-modal-close"
        onClick={onClose}
        aria-label="Close intro"
      >
        ×
      </button>
      <iframe
        key={iframeKey}
        src="/intro/index.html"
        className="intro-modal-iframe"
        title="AI Search Rank — 60 second intro"
        allow="autoplay"
      />
    </div>
  );
}
