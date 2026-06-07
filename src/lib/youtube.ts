// ============================================================
// YouTube Helpers - استخراج معرف الفيديو وبناء الروابط
// ============================================================

/**
 * يستخرج YouTube video ID من أي صيغة رابط شائعة:
 * - https://www.youtube.com/watch?v=XXXX
 * - https://youtu.be/XXXX
 * - https://www.youtube.com/embed/XXXX
 * - https://www.youtube.com/shorts/XXXX
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  // إذا كان المُدخل ID فقط (11 حرف، حروف/أرقام/شرطات)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();

  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * يبني رابط embed لـ YouTube
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * يبني رابط بحث YouTube لاسم تمرين معين
 */
export function getYouTubeSearchUrl(exerciseName: string, append = 'تمرين شرح'): string {
  const query = encodeURIComponent(`${exerciseName} ${append}`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

/**
 * thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' = 'mq'): string {
  const q = { default: 'default', hq: 'hqdefault', mq: 'mqdefault', sd: 'sddefault' }[quality];
  return `https://img.youtube.com/vi/${videoId}/${q}.jpg`;
}
