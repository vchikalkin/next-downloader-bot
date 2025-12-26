import axios from 'axios';

export type Data = {
  ai_dynamic_cover: string;
  anchors_extras: string;
  collect_count: number;
  comment_count: number;
  commercial_video_info: string;
  cover: string;
  create_time: number;
  digg_count: number;
  download_count: number;
  duration: number;
  id: string;
  images: string[];
  is_ad: boolean;
  item_comment_settings: number;
  mentioned_users: string;
  music: string;
  origin_cover: string;
  play: string;
  play_count: number;
  region: string;
  share_count: number;
  size: number;
  title: string;
  wm_size: number;
  wmplay: string;
};

export type Root = {
  code: number;
  data: Data;
  msg: string;
  processed_time: number;
};

export async function getTiktokDownloadUrl(url: string) {
  const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
  const { data } = res.data as Root;

  if (!data) throw new Error('err-invalid-tiktok-response');

  return data;
}
