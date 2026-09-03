"use client";

import { use } from "react";
import RequireRole from "@/app/components/RequireRole";
import { PMShell } from "../../../_shared";
import ReleaseForm from "../../ReleaseForm";

export default function ReleaseFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="Completar Release" subtitle="Datos de derechos de máster para Legales." backHref="/pm/fonograma">
        <ReleaseForm pmReleaseId={Number(id)} />
      </PMShell>
    </RequireRole>
  );
}
