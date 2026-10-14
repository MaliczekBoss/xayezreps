"use client";

import { tNow } from "./i18n";
import { notify } from "./notify";

export async function copyWithNotice(value: string, success: { title: string; text?: string; image?: string }) {
  try {
    await navigator.clipboard.writeText(value);
    notify({ tone: "success", icon: "copy", ...success });
    return true;
  } catch {
    notify({ tone: "warning", icon: "alert", title: tNow("n.copyFailed"), text: tNow("n.copyFailedText") });
    return false;
  }
}
