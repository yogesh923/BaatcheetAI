"use client";

// Tiny app-wide toast bus — no dependency, theme-aware rendering lives in
// <Toaster/> (mounted once in the app layout). Any client code can fire:
//   toast.success("Saved"); toast.error("Failed"); toast.info("Note");

export type ToastKind = "success" | "error" | "info";

export interface ToastEvent {
  id: number;
  kind: ToastKind;
  message: string;
}

let seq = 0;

function fire(kind: ToastKind, message: string): void {
  if (typeof window === "undefined") return;
  seq += 1;
  window.dispatchEvent(
    new CustomEvent<ToastEvent>("baatcheet:toast", { detail: { id: seq, kind, message } })
  );
}

export const toast = {
  success: (message: string) => fire("success", message),
  error: (message: string) => fire("error", message),
  info: (message: string) => fire("info", message),
};
