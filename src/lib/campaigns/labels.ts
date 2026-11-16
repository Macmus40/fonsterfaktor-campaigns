import type { ContentAngle, GenerationSource } from "@/lib/types";

export function generationSourceLabel(source: GenerationSource): string {
  switch (source) {
    case "user_description":
      return "Från användarens beskrivning";
    case "material_analysis":
      return "Från materialanalys (konfigurerad modell)";
    case "local_model":
      return "Förfinad av lokal modell";
    case "template":
    default:
      return "Lokala svenska mallar";
  }
}

export function angleLabel(angle: ContentAngle): string {
  switch (angle) {
    case "price_custom":
      return "Pris / eget mått";
    case "season_problem":
      return "Säsong / kundproblem";
    default:
      return "Anpassad";
  }
}
