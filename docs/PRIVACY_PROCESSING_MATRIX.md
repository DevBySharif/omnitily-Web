# Privacy and processing matrix

The registry renders these labels consistently:

| Type | User-facing meaning | Tools |
|---|---|---|
| Browser | Processed locally in your browser. | All enabled tools except QR Generator |
| External | Data or URLs are sent to a third-party provider. | `qr-generator` (QR contents to the QR rendering provider) |
| None | No processing is available. | All `coming-soon` and `disabled` entries, including `audio-transcriber` |

Audio Transcriber is disabled in the free deployment and sends no audio to PanUtility, Gemini, Redis, or any other provider. Social Downloader sends the pasted link to the configured Cobalt instance (or, for YouTube/TikTok, to the config-free providers); without a configured instance, Instagram/Facebook downloads are refused honestly and send nothing. These labels are disclosures, not claims about retention, security, or provider guarantees.
