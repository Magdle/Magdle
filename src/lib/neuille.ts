import basePlayers from "../data/champions.json";
import { getRedis } from "./redis";

export type NeuillePlayer = {
  id: number;
  imageId: string;
  name: string;
  neuillitude?: string;
  elo?: number;
  [key: string]: unknown;
};

export type NeuilleVoteInput = {
  idClicked: number;
  idOther: number;
  draw: boolean;
};

export type NeuilleVoteResult = {
  clicked: {
    id: number;
    oldElo: number;
    newElo: number;
  };
  other: {
    id: number;
    oldElo: number;
    newElo: number;
  };
  draw: boolean;
};

export type NeuillePair = [NeuillePlayer, NeuillePlayer];

const DEFAULT_ELO = 1000;
const K_FACTOR = 32;
const ELO_HASH_KEY = "neuille:elo:v1";

const seedPlayers = (basePlayers as NeuillePlayer[]).map((player) => ({
  ...player,
  id: Number(player.id),
}));

function normalizeElo(raw: unknown): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function getSeedElo(player: NeuillePlayer): number {
  const seedElo = normalizeElo(player.elo);
  return seedElo ?? DEFAULT_ELO;
}

function expectedScore(aElo: number, bElo: number): number {
  return 1 / (1 + Math.pow(10, (bElo - aElo) / 400));
}

export async function getNeuillePlayers(): Promise<NeuillePlayer[]> {
  const redis = await getRedis();
  const persistedElo = await redis.hGetAll(ELO_HASH_KEY);

  return seedPlayers.map((player) => {
    const fromRedis = normalizeElo(persistedElo[String(player.id)]);
    return {
      ...player,
      elo: fromRedis ?? getSeedElo(player),
    };
  });
}

export async function voteNeuille(input: NeuilleVoteInput): Promise<NeuilleVoteResult | null> {
  const players = await getNeuillePlayers();
  const clickedPlayer = players.find((player) => player.id === input.idClicked);
  const otherPlayer = players.find((player) => player.id === input.idOther);

  if (!clickedPlayer || !otherPlayer) {
    return null;
  }

  const clickedOldElo = normalizeElo(clickedPlayer.elo) ?? DEFAULT_ELO;
  const otherOldElo = normalizeElo(otherPlayer.elo) ?? DEFAULT_ELO;

  const clickedExpected = expectedScore(clickedOldElo, otherOldElo);
  const otherExpected = expectedScore(otherOldElo, clickedOldElo);

  const clickedScore = input.draw ? 0.5 : 1;
  const otherScore = input.draw ? 0.5 : 0;

  const clickedNewElo = Math.round(clickedOldElo + K_FACTOR * (clickedScore - clickedExpected));
  const otherNewElo = Math.round(otherOldElo + K_FACTOR * (otherScore - otherExpected));

  const redis = await getRedis();
  await redis.hSet(ELO_HASH_KEY, {
    [String(clickedPlayer.id)]: String(clickedNewElo),
    [String(otherPlayer.id)]: String(otherNewElo),
  });

  return {
    clicked: {
      id: clickedPlayer.id,
      oldElo: clickedOldElo,
      newElo: clickedNewElo,
    },
    other: {
      id: otherPlayer.id,
      oldElo: otherOldElo,
      newElo: otherNewElo,
    },
    draw: input.draw,
  };
}

export function pickNeuillePair(
  players: NeuillePlayer[],
  previous?: { id1?: number | null; id2?: number | null }
): NeuillePair | null {
  if (players.length < 2) return null;

  const previousId1 = previous?.id1 ?? null;
  const previousId2 = previous?.id2 ?? null;
  let attempt = 0;
  let player1 = players[0];
  let player2 = players[1];

  do {
    const idx1 = Math.floor(Math.random() * players.length);
    let idx2 = Math.floor(Math.random() * players.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * players.length);
    }

    player1 = players[idx1];
    player2 = players[idx2];
    attempt += 1;
  } while (
    attempt < 10 &&
    previousId1 !== null &&
    previousId2 !== null &&
    ((player1.id === previousId1 && player2.id === previousId2) ||
      (player1.id === previousId2 && player2.id === previousId1))
  );

  return [player1, player2];
}
