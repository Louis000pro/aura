/** Toucher une photo ouvre le compte : le mien sur `/profil`, celui d'un
 *  pote sur `/profil/<pseudo>`. Une seule règle pour toute la communauté. */
export function lienProfil(id: string, pseudo: string, moi: string | null | undefined): string {
  return id === moi ? "/profil" : `/profil/${encodeURIComponent(pseudo)}`;
}
