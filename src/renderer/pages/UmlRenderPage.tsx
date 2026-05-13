import { UmlRenderTool } from "@/components/tools/UmlRenderTool";
import type { ThemeMode } from "@/types";

type UmlRenderPageProps = {
  theme: ThemeMode;
};

export function UmlRenderPage({ theme }: UmlRenderPageProps) {
  return <UmlRenderTool theme={theme} />;
}
