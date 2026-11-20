import * as XLSX from 'xlsx';

/** Une feuille du classeur exporté : lignes d'en-tête (filtres) puis le tableau. */
export interface FeuilleExport {
  nom: string;
  entete: string[];
  lignes: Record<string, unknown>[];
}

/**
 * Écrit un classeur Excel dont chaque feuille commence par les filtres appliqués
 * (« Période : … », « Recherche : … »), une ligne vide, puis les données.
 */
export function ecrireClasseur(nomFichier: string, feuilles: FeuilleExport[]): void {
  const wb = XLSX.utils.book_new();
  for (const f of feuilles) {
    const ws = XLSX.utils.aoa_to_sheet(f.entete.map(l => [l]));
    XLSX.utils.sheet_add_json(ws, f.lignes, { origin: f.entete.length + 1 });
    XLSX.utils.book_append_sheet(wb, ws, f.nom.slice(0, 31));
  }
  XLSX.writeFile(wb, nomFichier);
}
