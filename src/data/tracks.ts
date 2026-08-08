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
}

const catalogCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function musicAudioUrl(audio: string): string {
  const fileName = audio.split("/").pop();
  if (!fileName) throw new Error(`Invalid track audio path: ${audio}`);
  return `${MUSIC_ASSET_BASE}/audio/${fileName}`;
}

export const tracks: Track[] = (trackRecords as Track[]).map((track) => ({
  ...track,
  audio: musicAudioUrl(track.audio),
})).sort(
  (left, right) =>
    catalogCollator.compare(left.artist, right.artist) ||
    catalogCollator.compare(left.album, right.album) ||
    left.trackNumber - right.trackNumber ||
    catalogCollator.compare(left.title, right.title),
);
