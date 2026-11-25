/**
 * Adresses des fichiers de fiches (/chargements/<nom du fichier>).
 *
 * Le nom du fichier peut contenir « # », « % », « & », « ? »… (fiches déposées avant
 * le nettoyage des noms côté serveur). Utilisé tel quel, le navigateur coupe
 * l'adresse au premier « # » et la fiche devient illisible : on encode donc
 * chaque segment du chemin avant de l'utiliser.
 */
export function urlFichier(url: string | null | undefined): string {
  if (!url) {
    return '';
  }
  const m = /^(https?:\/\/[^/]+)(.*)$/i.exec(url);
  const origine = m ? m[1] : '';
  const chemin = m ? m[2] : url;
  return (
    origine +
    chemin
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/')
  );
}

/** Adresse absolue du fichier, pour un service externe (visionneuse Office). */
export function urlFichierAbsolue(url: string | null | undefined): string {
  const encodee = urlFichier(url);
  return /^https?:\/\//i.test(encodee) ? encodee : `${window.location.origin}${encodee}`;
}

/** Adresse de la visionneuse Office (Excel, PowerPoint, Word) pour un fichier de fiche. */
export function urlVisionneuseOffice(url: string | null | undefined): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlFichierAbsolue(url))}`;
}
