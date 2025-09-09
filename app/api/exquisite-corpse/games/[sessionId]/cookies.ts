import { ONE_DAY_S } from "@/app/utils/time";
import { cookies } from "next/headers";

export async function setPlayerCookies(sessionId: string, playerName: string, playerToken: string) {
  const cookieStore = await cookies();

  /**
    * some funky stuff:
    * - I want to be able to access playerName persistentely on the client
    * - I need it to be accessable on the server
    * - I want the cookies to be scoped to the actual routes where they're used
    * - the /api/ prefix for api routes prevents one cookie being accessible from both
    * - trying to set two cookies with the same name winds up setting only one cookie
    *   with the latest config b/c/o a quirk in the nextjs cookies api, so I guess I
    *   just need to set two differently-named cookies
    */
  cookieStore.set({
    name: 'clientPlayerName',
    value: playerName,
    maxAge: ONE_DAY_S,
    path: `/exquisite-corpse/${sessionId}`
  });

  cookieStore.set({
    name: 'playerName',
    value: playerName,
    maxAge: ONE_DAY_S,
    path: `/api/exquisite-corpse/games/${sessionId}`
  });

  cookieStore.set({
    name: 'playerToken',
    value: playerToken,
    maxAge: ONE_DAY_S,
    path: `/api/exquisite-corpse/games/${sessionId}`
  });
}
