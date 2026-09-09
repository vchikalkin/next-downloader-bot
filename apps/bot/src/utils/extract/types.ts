export interface StreamRef {
  headers: Record<string, string>;
  url: string;
}

export interface ResolvedMedia {
  audio?: StreamRef;
  caption?: string;
  images?: string[];
  video?: StreamRef;
}
