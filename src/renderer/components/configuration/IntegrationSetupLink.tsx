import { Link } from "react-router-dom";
import { integrationsStrings } from "@/lib/uiCopy";
import { INTEGRATIONS_ROUTE } from "@/lib/integrationsRoute";
import type { UiLocale } from "@/types";

export function IntegrationSetupLink({ locale }: { locale: UiLocale }) {
  const t = integrationsStrings(locale);
  return (
    <Link to={INTEGRATIONS_ROUTE} className="text-sm font-medium underline underline-offset-2">
      {t.configureCta}
    </Link>
  );
}
