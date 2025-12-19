import axios from 'axios';

export interface Root {
  type: string;
  id: number;
  url: string;
  username: string;
  mediaUrls: string[];
  carouselItems: CarouselItem[];
  authorInfo: AuthorInfo;
}

export interface CarouselItem {
  url: string;
  type: string;
}

export interface AuthorInfo {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
}

export async function getInstagramDownloadUrl(url: string) {
  const { data } = await axios.post<Root>('https://thesocialcat.com/api/instagram-download', {
    url,
  });

  if (!data) throw new Error('Invalid Instagram response');

  const isVideo = data.type === 'video' || !data.carouselItems.length;

  if (isVideo) {
    return {
      play: data.mediaUrls.at(0),
      images: [],
    };
  }

  return {
    images: data.mediaUrls,
    play: undefined,
  };
}
