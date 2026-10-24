"use client";

import { useSyncExternalStore } from "react";
import { abonnerJokersBase, jokersActifs } from "@/lib/jokers";

/** La base sait-elle poser des jokers ? `false` au rendu serveur, puis ce
 *  que l'appareil a noté à la dernière lecture de l'aura. */
export function useJokersActifs(): boolean {
  return useSyncExternalStore(abonnerJokersBase, jokersActifs, () => false);
}
