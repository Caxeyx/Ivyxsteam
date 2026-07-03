export interface VideoContent {
  id: number;
  title: string;
  category: string;
  videoId: string;
  description: string;
  thumbnailUrl: string;
}

export const defaultContent: VideoContent[] = [
  {
    id: 0,
    title: "Featured Video",
    category: "Featured",
    videoId: "-uPzo618YUA",
    description: "Featured stream content.",
    thumbnailUrl: "https://img.youtube.com/vi/-uPzo618YUA/maxresdefault.jpg"
  },
  {
    id: 1,
    title: "Cinematic Landscape 4K",
    category: "Nature",
    videoId: "LXb3EKWsInQ",
    description: "Experience the beauty of nature in 4K resolution.",
    thumbnailUrl: "https://img.youtube.com/vi/LXb3EKWsInQ/maxresdefault.jpg"
  },
  {
    id: 2,
    title: "Lofi Hip Hop Radio",
    category: "Music",
    videoId: "jfKfPfyJRdk",
    description: "Beats to relax/study to.",
    thumbnailUrl: "https://img.youtube.com/vi/jfKfPfyJRdk/maxresdefault.jpg"
  },
  {
    id: 3,
    title: "Deep Space Visuals",
    category: "Science",
    videoId: "Un5SEJ8MyPc",
    description: "Journey through the cosmos with ambient space visuals.",
    thumbnailUrl: "https://img.youtube.com/vi/Un5SEJ8MyPc/maxresdefault.jpg"
  },
  {
    id: 4,
    title: "Cyberpunk City Drive",
    category: "Vibe",
    videoId: "qC0vDKVPCrw",
    description: "Night drive through a futuristic neon city.",
    thumbnailUrl: "https://img.youtube.com/vi/qC0vDKVPCrw/maxresdefault.jpg"
  },
  {
    id: 5,
    title: "Jazz Bar Ambience",
    category: "Music",
    videoId: "c0_ejQQcrwI",
    description: "Relaxing jazz bar atmosphere.",
    thumbnailUrl: "https://img.youtube.com/vi/c0_ejQQcrwI/maxresdefault.jpg"
  },
  {
    id: 6,
    title: "Cozy Cabin Rain",
    category: "Nature",
    videoId: "Ftm2uv7-Yvw",
    description: "Rain sounds for sleep and focus.",
    thumbnailUrl: "https://img.youtube.com/vi/Ftm2uv7-Yvw/maxresdefault.jpg"
  }
];
