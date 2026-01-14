import axios from 'axios';

export type AuthorInfo = {
  avatar: string;
  id: number;
  nickname: string;
  username: string;
};

export type CarouselItem = {
  type: string;
  url: string;
};

export type Root = {
  authorInfo: AuthorInfo;
  carouselItems: CarouselItem[];
  id: number;
  mediaUrls: string[];
  type: string;
  url: string;
  username: string;
};

export async function getInstagramDownloadUrl(url: string) {
  const { data } = await axios.post<Root>('https://thesocialcat.com/api/instagram-download', {
    url,
  });

  if (!data) throw new Error('err-invalid-instagram-response');

  const isVideo = data.type === 'video' || !data.carouselItems.length;

  if (isVideo) {
    return {
      images: [],
      play: data.mediaUrls.at(0),
    };
  }

  return {
    images: data.mediaUrls,
    play: undefined,
  };
}
