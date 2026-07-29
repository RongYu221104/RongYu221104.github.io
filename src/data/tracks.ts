export interface Track {
  title: string;
  artist: string;
  album: string;
  audio: string;
  cover: string;
}

export const tracks: Track[] = [
  {
    title: "My Foolish Heart",
    artist: "Bill Evans",
    album: "Waltz For Debby",
    audio: "/audio/my-foolish-heart.mp3",
    cover: "/images/music/my-foolish-heart.jpg",
  },
  {
    title: "Milestones",
    artist: "Bill Evans",
    album: "Waltz For Debby",
    audio: "/audio/milestones.mp3",
    cover: "/images/music/milestones.jpg",
  },
  {
    title: "Waltz for Debby",
    artist: "Bill Evans",
    album: "Waltz For Debby",
    audio: "/audio/waltz-for-debby.mp3",
    cover: "/images/music/waltz-for-debby.jpg",
  },
  {
    title: "Theme From M*A*S*H",
    artist: "Bill Evans",
    album: "You Must Believe In Spring",
    audio: "/audio/theme-from-mash.mp3",
    cover: "/images/music/theme-from-mash.jpg",
  },
  {
    title: "My Funny Valentine",
    artist: "Bill Evans",
    album: "Undercurrent",
    audio: "/audio/my-funny-valentine.mp3",
    cover: "/images/music/my-funny-valentine.jpg",
  },
  {
    title: "You Must Believe In Spring",
    artist: "Bill Evans",
    album: "You Must Believe In Spring",
    audio: "/audio/you-must-believe-in-spring.mp3",
    cover: "/images/music/you-must-believe-in-spring.jpg",
  },
];
