import trackRecords from "./tracks.json";
import { MUSIC_ASSET_BASE } from "../config/assets";

export interface Track {
  title: string;
  artist: string;
  album: string;
  trackNumber: number;
  audio: string;
  cover: string;
  publishedAt?: string | null;
  context: {
    artistId: string;
    albumId: string;
    trackId: string;
  };
}

type TrackRecord = Omit<Track, "context">;

const catalogCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function musicAudioUrl(audio: string): string {
  const fileName = audio.split("/").pop();
  if (!fileName) throw new Error(`Invalid track audio path: ${audio}`);
  return `${MUSIC_ASSET_BASE}/audio/${fileName}`;
}

const artistContextIds: Record<string, string> = {
  "Bill Evans": "bill-evans",
  "Miles Davis": "miles-davis",
  "The Dave Brubeck Quartet": "dave-brubeck",
};

const albumContextIds: Record<string, string> = {
  "From Left To Right": "from-left-to-right",
  "Kind of Blue": "kind-of-blue",
  "Time Out": "time-out",
  "Undercurrent": "undercurrent",
  "Waltz For Debby": "waltz-for-debby",
  "You Must Believe In Spring": "you-must-believe-in-spring",
};

function contextIds(track: TrackRecord): Track["context"] {
  const trackId = track.audio.split("/").pop()?.replace(/\.mp3$/i, "");
  const artistId = artistContextIds[track.artist];
  const albumId = albumContextIds[track.album];
  if (!trackId || !artistId || !albumId) {
    throw new Error(`Missing music context mapping: ${track.artist} / ${track.album} / ${track.title}`);
  }
  return { artistId, albumId, trackId };
}

export const tracks: Track[] = (trackRecords as TrackRecord[]).map((track) => ({
  ...track,
  audio: musicAudioUrl(track.audio),
  context: contextIds(track),
})).sort(
  (left, right) =>
    catalogCollator.compare(left.artist, right.artist) ||
    catalogCollator.compare(left.album, right.album) ||
    left.trackNumber - right.trackNumber ||
    catalogCollator.compare(left.title, right.title),
);
