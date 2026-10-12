"use client";

import { useFormat } from "@/lib/use-format";
import { PageHeader } from "../page";
import { ToolGrid, type ToolPreviews } from "../tools";

export function ToolsIndex({ previews }: { previews: ToolPreviews }) {
  const { t } = useFormat();
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.tools") }]} title={[t("tools.title1"), t("tools.title2")]} lead={t("tools.lead")} />
      <ToolGrid previews={previews} />
    </>
  );
}
