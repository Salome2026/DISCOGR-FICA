"use client";

import RequireRole from "@/app/components/RequireRole";
import { PMShell } from "../../../_shared";
import ReleaseForm from "../../ReleaseForm";

export default function NewReleaseFormPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="Nuevo Release" subtitle="Cargá los datos de derechos de máster antes de tener el fonograma cargado." backHref="/pm/fonograma">
        <ReleaseForm pmReleaseId={null} />
      </PMShell>
    </RequireRole>
  );
}
