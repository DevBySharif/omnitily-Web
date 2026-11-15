export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolContent {
  id: string;
  howToTitle: string;
  howToIntro: string;
  howToSteps: string[];
  faqs: ToolFaq[];
  features: string[];
}

export const TOOL_CONTENT_VIDEO_IMAGE: Record<string, ToolContent> = {
  'video-splitter': {
    id: 'video-splitter',
    howToTitle: 'How to split a video',
    howToIntro:
      'The Video Splitter trims MP4 and WebM files right in your browser, so you can cut out the exact range you need without installing editing software or uploading your footage to a server. Define one or more segments with start and end times, export the trimmed clip, and download it as a WebM file ready to share or reuse in another project.',
    howToSteps: [
      'Drag and drop your MP4 or WebM video into the upload area.',
      'Set the start and end times for each segment you want to keep in the Cutting Options panel.',
      'Click "Trim & Extract Video", then download the trimmed WebM file.',
    ],
    faqs: [
      {
        question: 'Which video formats can I split?',
        answer:
          'The splitter works with MP4 and WebM video files, and the trimmed clip is exported as a WebM file.',
      },
      {
        question: 'Is there a watermark on the trimmed video?',
        answer:
          'No. The tool is free to use and the exported clip carries no watermark.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. Splitting happens in your browser, so your video file never leaves your device.',
      },
      {
        question: 'Can I extract more than one segment?',
        answer:
          'Yes. You can define multiple segments in the Cutting Options panel before exporting.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Trim and extract ranges from MP4 and WebM files',
      'Processing happens in your browser, so files stay on your device',
      'Export trimmed clips as WebM',
      'No watermark on exported videos',
    ],
  },
  'social-downloader': {
    id: 'social-downloader',
    howToTitle: 'How to download a social media video',
    howToIntro:
      'The Social Video Downloader saves videos from YouTube, TikTok, Instagram, and Facebook from one place, so you do not need a separate downloader for each platform. Paste the link to a public video, fetch the available download options, and save the file to your device. The download is fetched through Omnitily\u2019s own resolver service.',
    howToSteps: [
      'Paste the link to a public video from YouTube, TikTok, Instagram, or Facebook into the URL field.',
      'Click the "Download" button to fetch the available video options.',
      'Choose a video option and click "Download" again to save the file to your device.',
    ],
    faqs: [
      {
        question: 'Which platforms does the Social Video Downloader support?',
        answer:
          'It supports public videos from YouTube, TikTok, Instagram, and Facebook.',
      },
      {
        question: 'Do I need an account to download a video?',
        answer:
          'No. The tool is free to use and does not ask you to sign up or log in.',
      },
      {
        question: 'Can I download private videos?',
        answer:
          'No. The downloader only works with public videos that the resolver service can reach.',
      },
      {
        question: 'Is it legal to download videos with this tool?',
        answer:
          'Only download videos you have the right to save, such as your own content or videos shared under a licence that allows downloading. Respect the creator\u2019s rights and the platform\u2019s terms.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'One downloader for YouTube, TikTok, Instagram, and Facebook',
      'Downloads are fetched through Omnitily\u2019s own resolver service',
      'Save HD videos and extracts from public posts',
      'No watermark added to downloaded videos',
    ],
  },
  'youtube-downloader': {
    id: 'youtube-downloader',
    howToTitle: 'How to download a YouTube video',
    howToIntro:
      'The YouTube Downloader saves public YouTube videos, Shorts, and music so you can watch or listen offline. Paste a video link, fetch the available download options, and save the file to your device. The download is fetched through Omnitily\u2019s self-hosted Cobalt resolver service, and the tool is free with no signup required.',
    howToSteps: [
      'Paste a YouTube video or Shorts link into the URL field.',
      'Click the download button to fetch the available video options.',
      'Pick a video option and click "Download" to save the file to your device.',
    ],
    faqs: [
      {
        question: 'Can I download YouTube Shorts with this tool?',
        answer:
          'Yes. The downloader works with regular YouTube videos, Shorts, and music links.',
      },
      {
        question: 'Why does the YouTube downloader sometimes show a rate-limit error?',
        answer:
          'YouTube rate-limits the resolver service that fetches the video, so requests can be temporarily blocked when too many are made in a short period. Wait a while and try again later; the block is temporary and not a problem with your link.',
      },
      {
        question: 'Do I need a YouTube account to use it?',
        answer:
          'No. The tool is free, needs no signup, and does not ask for your YouTube login.',
      },
      {
        question: 'Can I download private or age-restricted YouTube videos?',
        answer:
          'No. Only public videos that the resolver service can reach can be downloaded.',
      },
      {
        question: 'Is downloading YouTube videos legal?',
        answer:
          'Only download videos you have the right to save, such as your own uploads or content shared under a licence that allows downloading. Respect the creator\u2019s rights and YouTube\u2019s terms of service.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Download public YouTube videos, Shorts, and music',
      'Fetched through Omnitily\u2019s self-hosted Cobalt resolver service',
      'No watermark added to downloaded videos',
      'Works from a pasted link, with no app to install',
    ],
  },
  'instagram-downloader': {
    id: 'instagram-downloader',
    howToTitle: 'How to download an Instagram reel',
    howToIntro:
      'The Instagram Downloader saves public Instagram reels, posts, and stories so you can keep a copy on your device. Paste the link to the reel or post, fetch the available download options, and save the video file. The download is fetched through Omnitily\u2019s self-hosted Cobalt resolver service, and the tool is free with no signup required.',
    howToSteps: [
      'Paste the Instagram reel, post, or story link into the URL field.',
      'Click the download button to fetch the available video options.',
      'Pick a video option and click "Download" to save the file to your device.',
    ],
    faqs: [
      {
        question: 'Can I download Instagram stories with this tool?',
        answer:
          'Yes. The downloader works with public reels, posts, and stories.',
      },
      {
        question: 'Do I need to log in to Instagram to download a reel?',
        answer:
          'No. The tool needs no signup and does not ask for your Instagram login.',
      },
      {
        question: 'Can I download videos from private Instagram accounts?',
        answer:
          'No. Only public content that the resolver service can reach can be downloaded.',
      },
      {
        question: 'What format is the downloaded video?',
        answer:
          'The downloaded file is an MP4 video, which plays on phones, computers, and most media players.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Download public Instagram reels, posts, and stories',
      'Fetched through Omnitily\u2019s self-hosted Cobalt resolver service',
      'No watermark added to downloaded videos',
      'Works from a pasted link, with no app to install',
    ],
  },
  'tiktok-downloader': {
    id: 'tiktok-downloader',
    howToTitle: 'How to download a TikTok video',
    howToIntro:
      'The TikTok Downloader saves public TikTok videos to your device so you can watch them offline or reuse them in your own edits. Paste the link to a TikTok video, fetch the available download options, and save the file. The download is fetched through Omnitily\u2019s self-hosted Cobalt resolver service, and the tool is free with no signup required.',
    howToSteps: [
      'Paste the TikTok video link into the URL field.',
      'Click the download button to fetch the available video options.',
      'Pick a video option and click "Download" to save the file to your device.',
    ],
    faqs: [
      {
        question: 'Does the downloaded TikTok video have a watermark?',
        answer:
          'The downloader fetches the video through Omnitily\u2019s resolver service, which returns the video file itself rather than a screen recording, so no extra watermark is added by the tool.',
      },
      {
        question: 'Do I need a TikTok account to use it?',
        answer:
          'No. The tool is free, needs no signup, and does not ask for your TikTok login.',
      },
      {
        question: 'Can I download videos from private TikTok accounts?',
        answer:
          'No. Only public videos that the resolver service can reach can be downloaded.',
      },
      {
        question: 'What format is the downloaded video?',
        answer:
          'The downloaded file is an MP4 video, which plays on phones, computers, and most media players.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Download public TikTok videos from a pasted link',
      'Fetched through Omnitily\u2019s self-hosted Cobalt resolver service',
      'No watermark added to downloaded videos',
      'Works with no app to install',
    ],
  },
  'facebook-downloader': {
    id: 'facebook-downloader',
    howToTitle: 'How to download a Facebook video',
    howToIntro:
      'The Facebook Downloader saves public Facebook videos and reels to your device so you can watch them offline. Paste the link to the video or reel, fetch the available download options, and save the file. The download is fetched through Omnitily\u2019s self-hosted Cobalt resolver service, and the tool is free with no signup required.',
    howToSteps: [
      'Paste the Facebook video or reel link into the URL field.',
      'Click the download button to fetch the available video options.',
      'Pick a video option and click "Download" to save the file to your device.',
    ],
    faqs: [
      {
        question: 'Can I download Facebook reels with this tool?',
        answer:
          'Yes. The downloader works with public Facebook videos and reels.',
      },
      {
        question: 'Do I need to log in to Facebook to download a video?',
        answer:
          'No. The tool needs no signup and does not ask for your Facebook login.',
      },
      {
        question: 'Can I download videos from private Facebook groups?',
        answer:
          'No. Only public videos that the resolver service can reach can be downloaded.',
      },
      {
        question: 'Is it legal to download Facebook videos?',
        answer:
          'Only download videos you have the right to save, such as your own uploads or content shared under a licence that allows downloading. Respect the creator\u2019s rights and Facebook\u2019s terms.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Download public Facebook videos and reels',
      'Fetched through Omnitily\u2019s self-hosted Cobalt resolver service',
      'No watermark added to downloaded videos',
      'Works from a pasted link, with no app to install',
    ],
  },
  'gif-maker': {
    id: 'gif-maker',
    howToTitle: 'How to make a GIF from a video',
    howToIntro:
      'The GIF Maker turns an MP4 video or a set of still images into a lightweight animated GIF you can share anywhere, from chats to social posts. Upload your video or images, convert them in your browser, and download the finished GIF. The whole conversion runs on your device, so your files are never uploaded to a server.',
    howToSteps: [
      'Drag and drop your MP4 video or still images into the upload area.',
      'Click "Convert File" to turn the video or images into an animated GIF.',
      'Click "Download Result" to save the finished GIF to your device.',
    ],
    faqs: [
      {
        question: 'What can I turn into a GIF?',
        answer:
          'You can convert an MP4 video or a set of multiple static images into one animated GIF.',
      },
      {
        question: 'Does the GIF maker upload my video anywhere?',
        answer:
          'No. The conversion runs in your browser, so your video and images stay on your device.',
      },
      {
        question: 'Is there a watermark on the GIF?',
        answer:
          'No. The finished GIF carries no watermark and is free to share.',
      },
      {
        question: 'What size is the finished GIF?',
        answer:
          'The output size depends on the length and dimensions of your source video or images. Short clips produce small, lightweight GIFs that are easy to share.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Convert MP4 videos or multiple images into animated GIFs',
      'Processing happens in your browser, so files stay on your device',
      'Lightweight GIF output, easy to share',
      'No watermark on the finished GIF',
    ],
  },
  'video-to-audio': {
    id: 'video-to-audio',
    howToTitle: 'How to extract audio from a video',
    howToIntro:
      'The Video to Audio Extractor pulls the sound track out of an MP4 or WebM video and saves it as a WAV file, which is handy when you only need the audio from a clip, a lecture, or a song. Upload your video, extract the audio in your browser, and download the WAV file. Your video never leaves your device.',
    howToSteps: [
      'Drag and drop your MP4 or WebM video into the upload area.',
      'Click "Convert File" to extract the audio track from the video.',
      'Click "Download Result" to save the extracted audio as a WAV file.',
    ],
    faqs: [
      {
        question: 'What audio format does the extractor produce?',
        answer:
          'The extracted audio is saved as a WAV file, which plays in most media players and audio editors.',
      },
      {
        question: 'Which video formats are supported?',
        answer:
          'The tool works with MP4 and WebM video files.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. The audio is extracted in your browser, so your video file never leaves your device.',
      },
      {
        question: 'Can I use this to convert a video to MP3?',
        answer:
          'No. The tool exports audio as a WAV file only. You can convert the WAV to MP3 afterwards in any audio converter or editor.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Extract the audio track from MP4 and WebM videos',
      'Exports audio as a WAV file',
      'Processing happens in your browser, so files stay on your device',
      'No watermark or extra branding',
    ],
  },
  'frame-extractor': {
    id: 'frame-extractor',
    howToTitle: 'How to extract a frame from a video',
    howToIntro:
      'The Video Frame Grabber lets you pull a single still image out of a video at the exact moment you choose, which is useful for thumbnails, cover images, or saving a favourite scene. Upload your video, scrub to the timestamp you want, extract the frame, and download it as a JPEG image. Everything runs in your browser.',
    howToSteps: [
      'Drag and drop your video into the upload area.',
      'Scrub the video to the timestamp of the frame you want to save.',
      'Click "Extract Frame", then download the frame as a JPEG image.',
    ],
    faqs: [
      {
        question: 'What format is the extracted frame?',
        answer:
          'The frame is saved as a JPEG image at the video\u2019s own resolution.',
      },
      {
        question: 'Can I extract more than one frame?',
        answer:
          'Yes. Move to a different timestamp and extract again for each frame you want.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. Frame extraction happens in your browser, so your video file never leaves your device.',
      },
      {
        question: 'Can I use an extracted frame as a thumbnail?',
        answer:
          'Yes. Extracted frames work well as video thumbnails or cover images, as long as you have the right to use the video.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Extract pixel-perfect JPEG frames from video files',
      'Scrub to any timestamp to pick the exact frame',
      'Processing happens in your browser, so files stay on your device',
      'Frames saved at the video\u2019s own resolution',
    ],
  },
  'video-speed': {
    id: 'video-speed',
    howToTitle: 'How to change video speed',
    howToIntro:
      'The Video Speed Controller speeds up or slows down a video and exports the adjusted clip, which is useful for quick timelapse-style playback, slow-motion highlights, or fitting a clip to a time limit. Choose a speed from 0.25x to 4x, convert the video in your browser, and download the result as a WebM file.',
    howToSteps: [
      'Drag and drop your video into the upload area.',
      'Choose the playback speed you want, from 0.25x up to 4x.',
      'Click "Convert File", then download the speed-adjusted WebM video.',
    ],
    faqs: [
      {
        question: 'What speeds can I choose?',
        answer:
          'You can speed up or slow down playback anywhere from 0.25x to 4x.',
      },
      {
        question: 'Does changing the speed change the audio pitch?',
        answer:
          'The exported clip keeps the video and its audio in sync at the new speed; the audio plays faster or slower along with the picture.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. The speed change is processed in your browser, so your video file never leaves your device.',
      },
      {
        question: 'What format is the exported video?',
        answer:
          'The adjusted clip is exported as a WebM file.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Speed up or slow down video from 0.25x to 4x',
      'Export the adjusted clip as WebM',
      'Processing happens in your browser, so files stay on your device',
      'No watermark on exported videos',
    ],
  },
  'video-muter': {
    id: 'video-muter',
    howToTitle: 'How to remove audio from a video',
    howToIntro:
      'The Video Audio Remover strips the sound track from a video clip in one click, which is useful when you want to share a silent clip, add your own music later, or remove background noise. Upload your video, mute it in your browser, and download the silent version as a WebM file. Your video never leaves your device.',
    howToSteps: [
      'Drag and drop your video into the upload area.',
      'Click "Convert File" to strip the audio track from the video.',
      'Click "Download Result" to save the muted WebM video.',
    ],
    faqs: [
      {
        question: 'Does the muted video keep its picture quality?',
        answer:
          'Yes. Only the audio track is removed; the video picture is re-encoded in your browser and exported as WebM.',
      },
      {
        question: 'Can I mute only part of a video?',
        answer:
          'No. The tool removes the audio from the whole clip. To mute part of a video, split the clip first and mute the part you need.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. Muting happens in your browser, so your video file never leaves your device.',
      },
      {
        question: 'What format is the muted video?',
        answer:
          'The muted clip is exported as a WebM file with no audio stream.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Strip the audio track from a video with one click',
      'Export the silent clip as WebM',
      'Processing happens in your browser, so files stay on your device',
      'No watermark on exported videos',
    ],
  },
  'video-compressor': {
    id: 'video-compressor',
    howToTitle: 'How to compress a video',
    howToIntro:
      'The Video Compressor shrinks MP4 and WebM files by re-encoding them at a lower bitrate, which makes large clips easier to send, upload, or store. Pick a compression level, compress the video in your browser, and download the result. The tool shows the real size change afterwards, so you can see exactly how much smaller the file became.',
    howToSteps: [
      'Drag and drop your MP4 or WebM video into the upload area.',
      'Choose a compression level, then click "Compress Video".',
      'Check the reported size change, then download the compressed WebM video.',
    ],
    faqs: [
      {
        question: 'How much smaller will my video get?',
        answer:
          'It depends on the source file. The result panel reports the real size change for your video, so you can see the exact saving before you download.',
      },
      {
        question: 'Will compression reduce my video quality?',
        answer:
          'Yes, some quality is traded for a smaller file, because compression works by lowering the bitrate. A lighter compression level keeps more quality.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. Compression happens in your browser, so your video file never leaves your device.',
      },
      {
        question: 'What format is the compressed video?',
        answer:
          'The compressed clip is exported as a WebM file.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Reduce MP4 and WebM file sizes with bitrate compression',
      'Result panel reports the real size change',
      'Processing happens in your browser, so files stay on your device',
      'No watermark on exported videos',
    ],
  },
  'video-looper': {
    id: 'video-looper',
    howToTitle: 'How to loop a video',
    howToIntro:
      'The Video Looper repeats a short video clip back to back to create a longer looping segment, which works well for decorative background clips, animated banners, or seamless social posts. Upload your clip, choose how many times it should repeat, and download the looped result as a WebM file. Everything runs in your browser.',
    howToSteps: [
      'Drag and drop your video clip into the upload area.',
      'Choose how many times the clip should repeat.',
      'Click "Loop Video", then download the looped WebM video.',
    ],
    faqs: [
      {
        question: 'How many times can a clip repeat?',
        answer:
          'You choose the loop count in the tool. Each repeat adds the full length of your clip, so a short clip works best for looping.',
      },
      {
        question: 'Does looping change the video quality?',
        answer:
          'The clip is re-encoded in your browser and exported as WebM, so the picture stays the same clip repeated back to back.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. Looping happens in your browser, so your video file never leaves your device.',
      },
      {
        question: 'What is a looped video good for?',
        answer:
          'Looped clips work well as decorative background video, animated banners, or short social posts that play on repeat.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Repeat a clip back to back to build a loop',
      'Export the looped clip as WebM',
      'Processing happens in your browser, so files stay on your device',
      'No watermark on exported videos',
    ],
  },
  'video-rotator': {
    id: 'video-rotator',
    howToTitle: 'How to rotate a video',
    howToIntro:
      'The Video Rotator fixes sideways or upside-down video by turning it 90, 180, or 270 degrees, which is handy for clips recorded with the phone held the wrong way. Upload your video, pick the rotation angle, and download the corrected clip as a WebM file. The rotation is done in your browser, so your video never leaves your device.',
    howToSteps: [
      'Drag and drop your video into the upload area.',
      'Choose the rotation angle: 90, 180, or 270 degrees.',
      'Click "Convert File", then download the rotated WebM video.',
    ],
    faqs: [
      {
        question: 'Which rotation angles are supported?',
        answer:
          'You can rotate a video 90, 180, or 270 degrees.',
      },
      {
        question: 'Does rotating change the video dimensions?',
        answer:
          'Yes. A 90 or 270 degree rotation swaps the width and height, so a landscape clip becomes portrait and the other way round.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. Rotation happens in your browser, so your video file never leaves your device.',
      },
      {
        question: 'What format is the rotated video?',
        answer:
          'The rotated clip is exported as a WebM file.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Rotate video 90, 180, or 270 degrees',
      'Fix sideways or upside-down clips',
      'Processing happens in your browser, so files stay on your device',
      'No watermark on exported videos',
    ],
  },
  'video-resizer': {
    id: 'video-resizer',
    howToTitle: 'How to resize a video',
    howToIntro:
      'The Video Resizer changes a video\u2019s dimensions so it fits the shape you need, whether that is portrait for a phone feed, landscape for a widescreen player, or square for a social post. Enter the width and height you want, keep the aspect ratio locked if you want to avoid stretching, and download the resized clip as a WebM file.',
    howToSteps: [
      'Drag and drop your video into the upload area.',
      'Enter the target width and height, keeping the aspect-ratio lock on if you do not want the picture stretched.',
      'Click "Convert File", then download the resized WebM video.',
    ],
    faqs: [
      {
        question: 'Can I resize a video for a portrait phone feed?',
        answer:
          'Yes. Enter portrait dimensions, such as a taller height than width, and the tool resizes the clip to fit.',
      },
      {
        question: 'What happens if I turn off the aspect-ratio lock?',
        answer:
          'The video is stretched to exactly the width and height you entered, which can distort the picture if the new shape differs from the original.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. Resizing happens in your browser, so your video file never leaves your device.',
      },
      {
        question: 'What format is the resized video?',
        answer:
          'The resized clip is exported as a WebM file.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Resize video dimensions for portrait, landscape, or square feeds',
      'Aspect-ratio lock to avoid stretching the picture',
      'Processing happens in your browser, so files stay on your device',
      'No watermark on exported videos',
    ],
  },
  'video-watermark': {
    id: 'video-watermark',
    howToTitle: 'How to add a watermark to a video',
    howToIntro:
      'The Video Watermark Adder places your own text over a video clip so your work stays credited when it is shared, which is useful for creators, brands, and anyone posting original footage. Type your watermark text, choose where it sits on the frame, apply it in your browser, and download the watermarked clip as a WebM file.',
    howToSteps: [
      'Drag and drop your video into the upload area.',
      'Type your watermark text and choose where it should sit on the frame.',
      'Click "Apply Watermark", then download the watermarked WebM video.',
    ],
    faqs: [
      {
        question: 'Can I change the watermark text?',
        answer:
          'Yes. You can type any text you like, such as your name, channel, or brand, and the tool starts with "My Watermark" as the default.',
      },
      {
        question: 'Where can the watermark sit on the video?',
        answer:
          'You can choose the position on the frame; the default is the bottom-right corner.',
      },
      {
        question: 'Does my video get uploaded to a server?',
        answer:
          'No. The watermark is applied in your browser, so your video file never leaves your device.',
      },
      {
        question: 'What format is the watermarked video?',
        answer:
          'The watermarked clip is exported as a WebM file.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Overlay custom text on your video clips',
      'Choose the watermark position on the frame',
      'Processing happens in your browser, so files stay on your device',
      'Export the watermarked clip as WebM',
    ],
  },
  'subtitles-editor': {
    id: 'subtitles-editor',
    howToTitle: 'How to create subtitles',
    howToIntro:
      'The SRT Subtitle Creator helps you draft, check, and export subtitle files for your videos, so viewers can follow along with captions or translations. You can paste existing SRT or VTT text to validate it, or type one subtitle per line and have the tool build timed cues for you. The finished file downloads as an SRT or VTT file.',
    howToSteps: [
      'Choose a mode: paste SRT or VTT text to validate it, or type one subtitle per line to build timed cues.',
      'Set the export format and timing options, such as seconds per subtitle and start offset.',
      'Click "Validate & Export" or "Build Subtitles", then download the finished subtitle file.',
    ],
    faqs: [
      {
        question: 'What is the difference between SRT and VTT?',
        answer:
          'Both are plain-text subtitle formats with timed cues. SRT is the most widely supported format across players and editors, while VTT is the format used for web video. The tool can export either one.',
      },
      {
        question: 'Can I check an existing subtitle file for errors?',
        answer:
          'Yes. Paste your SRT or VTT text, or drop the file in, and the tool validates the cues and reports problems before you export.',
      },
      {
        question: 'Can I build subtitles from plain lines of text?',
        answer:
          'Yes. In build mode, each line you type becomes one timed cue, spaced out using the seconds-per-subtitle and start-offset settings.',
      },
      {
        question: 'Do my subtitles get uploaded anywhere?',
        answer:
          'No. The subtitle text is processed in your browser, so nothing you type or paste leaves your device.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Draft, validate, and export SRT and VTT subtitle files',
      'Build timed cues from plain lines of text',
      'Timing controls for seconds per subtitle and start offset',
      'Processing happens in your browser, so nothing leaves your device',
    ],
  },
  'image-converter': {
    id: 'image-converter',
    howToTitle: 'How to convert an image format',
    howToIntro:
      'The Image Format Converter changes JPEG, PNG, and WebP images from one format to another, which is useful when a site or app only accepts a certain file type, or when you want a smaller file for the web. Upload one image or a whole batch, pick the target format and quality, and download the converted files. Everything runs in your browser.',
    howToSteps: [
      'Drag and drop your JPEG, PNG, or WebP images into the upload area.',
      'Choose the target format and adjust the quality in the Conversion Settings panel.',
      'Click "Convert All Uploaded", then click "Download All Converted" to save the finished files.',
    ],
    faqs: [
      {
        question: 'Which image formats can I convert between?',
        answer:
          'The converter works with JPEG, PNG, and WebP files, and can convert between those three formats.',
      },
      {
        question: 'Can I convert several images at once?',
        answer:
          'Yes. You can upload a batch of images, convert them all in one go, and download them together.',
      },
      {
        question: 'Does converting reduce image quality?',
        answer:
          'Converting to JPEG or WebP uses lossy compression, so a lower quality setting means a smaller file with some detail lost. PNG conversion keeps the image lossless. Pick the quality setting that suits your needs.',
      },
      {
        question: 'Do my images get uploaded to a server?',
        answer:
          'No. Conversion happens in your browser, so your images never leave your device.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Convert JPEG, PNG, and WebP images',
      'Batch conversion with one-click download of all files',
      'Quality control for the converted output',
      'Processing happens in your browser, so files stay on your device',
    ],
  },
  'color-extractor': {
    id: 'color-extractor',
    howToTitle: 'How to extract colors from an image',
    howToIntro:
      'The Color Palette Extractor reads the pixels of any uploaded image and pulls out its most distinct colours as HEX codes, which is a fast way to build a colour scheme from a photo, a logo, or a design you like. Upload an image, look through the extracted palette swatches, and copy the HEX codes you want to use in your own design.',
    howToSteps: [
      'Drag and drop your image into the upload area.',
      'Wait for the tool to analyse the pixels and show the extracted palette swatches.',
      'Pick the colours you like from the palette and note down their HEX codes.',
    ],
    faqs: [
      {
        question: 'What kind of image can I analyse?',
        answer:
          'You can upload any image, such as a photo, a logo, or a screenshot, and the tool reads the colours from its pixels.',
      },
      {
        question: 'What format are the extracted colours in?',
        answer:
          'The palette shows each colour as a HEX code, which you can use directly in CSS, design tools, and image editors.',
      },
      {
        question: 'Does my image get uploaded to a server?',
        answer:
          'No. The colour analysis runs in your browser, so your image never leaves your device.',
      },
      {
        question: 'How many colours does it extract?',
        answer:
          'The tool groups similar pixels into distinct colour clusters and shows the most common ones as a palette, so the exact count depends on the image.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Harvest distinct HEX colour clusters from any image',
      'Build a colour scheme from a photo, logo, or design',
      'Processing happens in your browser, so files stay on your device',
      'HEX codes ready to use in CSS and design tools',
    ],
  },
  'image-compressor': {
    id: 'image-compressor',
    howToTitle: 'How to compress an image',
    howToIntro:
      'The Smart Image Compressor shrinks PNG and JPEG files so they load faster on a website, attach more easily to emails, and take up less storage. Upload your image, compress it in your browser, and download the smaller file. The tool reports the real size saving, so you can see exactly how much smaller the image became.',
    howToSteps: [
      'Drag and drop your PNG or JPEG image into the upload area.',
      'Click "Convert File" to compress the image.',
      'Check the reported size saving, then click "Download Result" to save the compressed image.',
    ],
    faqs: [
      {
        question: 'How much smaller will my image get?',
        answer:
          'It depends on the image. The tool reports the real size change for your file, so you can see the exact saving before you download.',
      },
      {
        question: 'Will compression make my image look worse?',
        answer:
          'Compression trades a little quality for a smaller file. For typical photos the difference is hard to notice, but very detailed images may show some softening at strong compression.',
      },
      {
        question: 'Which formats can I compress?',
        answer:
          'The compressor works with PNG and JPEG images.',
      },
      {
        question: 'Does my image get uploaded to a server?',
        answer:
          'No. Compression happens in your browser, so your image never leaves your device.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Reduce PNG and JPEG file sizes',
      'Result panel reports the real size saving',
      'Processing happens in your browser, so files stay on your device',
      'No watermark on compressed images',
    ],
  },
  'image-cropper': {
    id: 'image-cropper',
    howToTitle: 'How to crop an image',
    howToIntro:
      'The Client-Side Image Cropper cuts a photo down to the part you want, and can also flip, rotate, and scale it, which is useful for profile pictures, thumbnails, and social posts. Drag the crop handles over the area to keep, fine-tune the size and output settings, and download the cropped image. Everything runs in your browser.',
    howToSteps: [
      'Drag and drop your image into the upload area.',
      'Drag the crop handles to frame the area you want to keep, and adjust the width, height, and output settings if needed.',
      'Click "Download Cropped Image" to save the cropped photo.',
    ],
    faqs: [
      {
        question: 'Can I crop to an exact size?',
        answer:
          'Yes. The Crop Settings panel lets you set the exact width and height for the cropped image.',
      },
      {
        question: 'Can I flip or rotate the image while cropping?',
        answer:
          'Yes. The cropper can flip, rotate, and scale photos as well as cropping them.',
      },
      {
        question: 'Does my image get uploaded to a server?',
        answer:
          'No. Cropping happens in your browser, so your image never leaves your device.',
      },
      {
        question: 'What format is the cropped image?',
        answer:
          'You can choose the output format and quality in the Crop Settings panel before you download.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Crop photos with responsive visual drag handles',
      'Flip, rotate, and scale as well as crop',
      'Exact width and height controls with quick presets',
      'Processing happens in your browser, so files stay on your device',
    ],
  },
  'pixel-art': {
    id: 'pixel-art',
    howToTitle: 'How to turn an image into pixel art',
    howToIntro:
      'The Pixel Art Maker turns an ordinary image into retro 8-bit style pixel art by grouping its pixels into chunky blocks, which is a fun way to make game-style graphics, avatars, or nostalgic artwork. Upload an image, pick a pixel size, and download the pixelated result as a PNG. The conversion runs in your browser.',
    howToSteps: [
      'Upload an image using the upload area.',
      'Adjust the Pixel Size slider to make the blocks bigger or smaller.',
      'Click "Download Pixel Art (PNG)" to save the pixelated image.',
    ],
    faqs: [
      {
        question: 'What does the pixel size setting do?',
        answer:
          'It sets the size of each pixel block. A bigger pixel size makes chunkier, more retro-looking art, while a smaller size keeps more detail from the original image.',
      },
      {
        question: 'What format is the finished pixel art?',
        answer:
          'The pixelated image downloads as a PNG file.',
      },
      {
        question: 'Does my image get uploaded to a server?',
        answer:
          'No. Pixelation happens in your browser, so your image never leaves your device.',
      },
      {
        question: 'Can I make pixel art from a photo?',
        answer:
          'Yes. Any uploaded image can be pixelated, and photos with bold colours and clear shapes usually give the best retro result.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Turn any image into retro 8-bit style pixel art',
      'Adjustable pixel size for chunkier or finer results',
      'Download the finished art as a PNG',
      'Processing happens in your browser, so files stay on your device',
    ],
  },
  'exif-viewer': {
    id: 'exif-viewer',
    howToTitle: 'How to view image metadata',
    howToIntro:
      'The EXIF Metadata Inspector reads the hidden information stored inside a photo, such as the camera model, shutter speed, ISO, focal length, and the date and location where it was taken. Upload a JPEG or PNG, and the tool reads the metadata straight from the file on your device. If a photo has no metadata, it says so honestly instead of guessing.',
    howToSteps: [
      'Drag and drop a JPEG or PNG photo into the upload area.',
      'Click "Extract Metadata" to read the information stored inside the file.',
      'Read the camera, exposure, date, and location details shown on the page.',
    ],
    faqs: [
      {
        question: 'What metadata can the EXIF viewer show?',
        answer:
          'It can show the camera make and model, shutter speed, ISO, focal length, the date the photo was taken, and GPS location, when that information is stored in the file.',
      },
      {
        question: 'What if my photo has no EXIF data?',
        answer:
          'The tool tells you honestly that no EXIF metadata was found. Many screenshots, edited images, and photos shared through messaging apps have their metadata stripped.',
      },
      {
        question: 'Does my photo get uploaded to a server?',
        answer:
          'No. The metadata is read from the file bytes on your device, so nothing is uploaded.',
      },
      {
        question: 'Can the viewer show where a photo was taken?',
        answer:
          'Yes, if the photo contains GPS coordinates. The tool shows the stored latitude and longitude when they are present.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Read camera, exposure, date, and GPS data from photos',
      'Works with JPEG and PNG files',
      'Metadata is read from the file on your device, nothing is uploaded',
      'Honest result when a photo has no EXIF data',
    ],
  },
  'favicon-generator': {
    id: 'favicon-generator',
    howToTitle: 'How to generate a favicon',
    howToIntro:
      'The Favicon Generator turns any image into a genuine 32 by 32 .ico favicon file, the small icon browsers show in tabs and bookmarks for your website. Upload your logo or image, generate the favicon in your browser, and download the finished favicon.ico file, ready to add to your site. The tool is free and needs no signup.',
    howToSteps: [
      'Drag and drop your image into the upload area.',
      'Click "Convert File" to generate the favicon from your image.',
      'Click "Download Result" to save the genuine favicon.ico file.',
    ],
    faqs: [
      {
        question: 'What is a favicon?',
        answer:
          'A favicon is the small icon a browser shows next to a website\u2019s name in tabs, bookmarks, and history. It is usually a tiny version of the site\u2019s logo.',
      },
      {
        question: 'What size is the generated favicon?',
        answer:
          'The tool generates a genuine 32 by 32 .ico file, which is the standard favicon size.',
      },
      {
        question: 'What kind of image should I upload?',
        answer:
          'A simple, bold logo or icon works best, because the favicon is shown very small. Detailed photos can look unclear at 32 by 32 pixels.',
      },
      {
        question: 'Does my image get uploaded to a server?',
        answer:
          'No. The favicon is generated in your browser, so your image never leaves your device.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Generate a genuine 32 by 32 .ico favicon from any image',
      'Ready to use in browser tabs and bookmarks',
      'Processing happens in your browser, so files stay on your device',
      'No watermark or extra branding',
    ],
  },
  'svg-optimizer': {
    id: 'svg-optimizer',
    howToTitle: 'How to optimize an SVG file',
    howToIntro:
      'The SVG Optimizer cleans up vector files by removing comments, extra whitespace, and unneeded declarations, and by tidying coordinates, so the file gets smaller without changing how the graphic looks. Upload an .svg file, check how much smaller the optimized version is, and download it. The result stays valid XML with your shapes intact.',
    howToSteps: [
      'Drag and drop your .svg file into the upload area.',
      'Review the optimized preview and the amount of space saved.',
      'Click "Download Optimized SVG" to save the smaller file.',
    ],
    faqs: [
      {
        question: 'What does the optimizer remove from my SVG?',
        answer:
          'It removes XML comments, whitespace between tags, and the XML declaration and DOCTYPE, and it optimizes coordinates, while keeping your shapes and paths intact.',
      },
      {
        question: 'Will my SVG still look the same after optimizing?',
        answer:
          'Yes. Optimization only removes unneeded data and tidies numbers; the visible graphic is unchanged.',
      },
      {
        question: 'How much smaller does the file get?',
        answer:
          'It depends on the file. The tool shows the exact size saved for your SVG, so you can see the result before you download.',
      },
      {
        question: 'Does my file get uploaded to a server?',
        answer:
          'No. Optimization happens in your browser, so your SVG never leaves your device.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Minify SVG files by removing comments and extra whitespace',
      'Shows the exact size saved for your file',
      'Optimized output stays valid XML with shapes preserved',
      'Processing happens in your browser, so files stay on your device',
    ],
  },
  'image-resizer': {
    id: 'image-resizer',
    howToTitle: 'How to resize an image',
    howToIntro:
      'The Image Dimension Scaler changes the width and height of a photo or graphic so it fits exactly where you need it, from a small profile picture to a large banner. Enter the dimensions you want, keep the aspect-ratio lock on to avoid stretching, and download the resized image. The resizing runs in your browser, so your image never leaves your device.',
    howToSteps: [
      'Drag and drop your image into the upload area.',
      'Enter the target width and height, keeping the aspect-ratio lock on if you do not want the picture stretched.',
      'Click "Convert File", then download the resized image.',
    ],
    faqs: [
      {
        question: 'Can I resize an image to an exact size in pixels?',
        answer:
          'Yes. Enter the exact width and height you want, and the tool scales the image to those dimensions.',
      },
      {
        question: 'What does the aspect-ratio lock do?',
        answer:
          'It keeps the image\u2019s original proportions, so changing the width updates the height to match and the picture is not stretched or squashed.',
      },
      {
        question: 'Will resizing make my image blurry?',
        answer:
          'Scaling an image down is usually clean. Scaling a small image up a lot can look soft or blurry, because no new detail is added.',
      },
      {
        question: 'Does my image get uploaded to a server?',
        answer:
          'No. Resizing happens in your browser, so your image never leaves your device.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Scale width and height to exact pixel dimensions',
      'Aspect-ratio lock to avoid stretching the picture',
      'Processing happens in your browser, so files stay on your device',
      'No watermark on resized images',
    ],
  },
  'gradient-generator': {
    id: 'gradient-generator',
    howToTitle: 'How to create a CSS gradient',
    howToIntro:
      'The CSS Gradient Designer builds smooth multi-stop gradients you can use as website backgrounds, buttons, or banners, without writing the CSS by hand. Pick linear or radial, set your colours and angle, preview the result live, and copy the ready-made CSS or export the gradient as a PNG image. The tool is free and needs no signup.',
    howToSteps: [
      'Choose linear or radial in the Gradient Settings panel and pick your colours and angle.',
      'Check the live preview and adjust the colour stops until the gradient looks right.',
      'Copy the generated CSS code, or export the gradient as a PNG image.',
    ],
    faqs: [
      {
        question: 'What is the difference between a linear and a radial gradient?',
        answer:
          'A linear gradient blends colours along a straight line at the angle you choose, while a radial gradient blends colours outwards from a centre point in a circle or ellipse.',
      },
      {
        question: 'Can I use more than two colours?',
        answer:
          'Yes. The designer supports multi-stop gradients, so you can add several colours and set where each one blends.',
      },
      {
        question: 'How do I use the gradient on my website?',
        answer:
          'Copy the generated CSS code from the CSS Code panel and paste it into your stylesheet as a background. The CSS is ready to use as shown.',
      },
      {
        question: 'Can I download the gradient as an image?',
        answer:
          'Yes. You can export the gradient as a PNG image in the size you choose, for use in designs or presentations.',
      },
    ],
    features: [
      'Free to use, no signup required',
      'Create multi-stop linear and radial gradients',
      'Live preview with angle and centre controls',
      'Copy ready-made CSS variables and code',
      'Export the gradient as a PNG image',
    ],
  },
};
