import { LatexTectonicDemo } from "@/components/tools/LatexTectonicDemo";
import type { ThemeMode } from "@/types";

type LatexTectonicPageProps = {
  theme: ThemeMode;
};

export function LatexTectonicPage({ theme }: LatexTectonicPageProps) {
  return <LatexTectonicDemo theme={theme} />;
}
