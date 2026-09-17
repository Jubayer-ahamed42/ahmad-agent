import fs from 'fs';
import path from 'path';

/**
 * DidService
 * Complete D-ID Talking Avatar & Lip-Sync Integration
 */
export class DidService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.DID_API_KEY || '';
    this.baseUrl = 'https://api.d-id.com';
  }

  get authHeader() {
    const key = this.apiKey || process.env.DID_API_KEY || '';
    if (!key) return '';
    if (key.startsWith('Basic ')) return key;
    // D-ID key is usually base64 encoded or in "username:password" format
    if (key.includes(':')) {
      return `Basic ${Buffer.from(key).toString('base64')}`;
    }
    return `Basic ${key}`;
  }

  isConfigured() {
    return Boolean(this.authHeader);
  }

  /**
   * 1. Upload local image to D-ID temporary S3 storage
   */
  async uploadImage(imageFilePath) {
    if (!this.isConfigured()) {
      throw new Error('D-ID API Key (DID_API_KEY) is not configured.');
    }
    if (!fs.existsSync(imageFilePath)) {
      throw new Error(`Image file not found: ${imageFilePath}`);
    }

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(imageFilePath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append('image', blob, path.basename(imageFilePath));

    const res = await fetch(`${this.baseUrl}/images`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader
      },
      body: formData
    });

    const data = await res.json();
    if (data.error || !res.ok) {
      throw new Error(`Failed to upload image to D-ID: ${JSON.stringify(data.error || data)}`);
    }

    return data.url;
  }

  /**
   * 2. Upload local audio to D-ID temporary S3 storage
   */
  async uploadAudio(audioFilePath) {
    if (!this.isConfigured()) {
      throw new Error('D-ID API Key (DID_API_KEY) is not configured.');
    }
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(audioFilePath);
    const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
    formData.append('audio', blob, path.basename(audioFilePath));

    const res = await fetch(`${this.baseUrl}/audios`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader
      },
      body: formData
    });

    const data = await res.json();
    if (data.error || !res.ok) {
      throw new Error(`Failed to upload audio to D-ID: ${JSON.stringify(data.error || data)}`);
    }

    return data.url;
  }

  /**
   * 3. Create Talking Avatar generation job
   */
  async createTalk({ imageUrl, audioUrl }) {
    if (!this.isConfigured()) {
      throw new Error('D-ID API Key (DID_API_KEY) is not configured.');
    }

    const payload = {
      source_url: imageUrl,
      script: {
        type: 'audio',
        audio_url: audioUrl
      },
      config: {
        fluent: true,
        pad_audio: 0.0,
        stitch: true
      }
    };

    const res = await fetch(`${this.baseUrl}/talks`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.error || !res.ok) {
      throw new Error(`Failed to create talk job: ${JSON.stringify(data.error || data)}`);
    }

    return data.id;
  }

  /**
   * 4. Poll status until video is done
   */
  async pollTalkStatus(talkId, maxWaitSec = 180, intervalSec = 3) {
    const startTime = Date.now();

    while ((Date.now() - startTime) < (maxWaitSec * 1000)) {
      const res = await fetch(`${this.baseUrl}/talks/${talkId}`, {
        headers: { 'Authorization': this.authHeader }
      });
      const data = await res.json();

      if (data.status === 'done') {
        return data.result_url;
      } else if (data.status === 'error' || data.error) {
        throw new Error(`D-ID Video generation failed: ${JSON.stringify(data.error || data)}`);
      }

      console.log(`[DidService] Status for ${talkId}: ${data.status}... waiting ${intervalSec}s`);
      await new Promise(r => setTimeout(r, intervalSec * 1000));
    }

    throw new Error(`Timeout waiting for D-ID talk ${talkId} after ${maxWaitSec}s`);
  }

  /**
   * 5. Download final MP4 to local file
   */
  async downloadVideo(videoUrl, destinationPath) {
    const res = await fetch(videoUrl);
    if (!res.ok) {
      throw new Error(`Failed to download video from ${videoUrl}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destinationPath, buffer);
    return destinationPath;
  }

  /**
   * 6. Complete End-to-End Talking Avatar Pipeline
   */
  async produceTalkingAvatarVideo({ imagePath, audioPath, outputVideoPath }) {
    console.log('[DidService] Step 1: Uploading portrait image...');
    const imageUrl = await this.uploadImage(imagePath);
    console.log(`[DidService] Image uploaded: ${imageUrl}`);

    console.log('[DidService] Step 2: Uploading audio voiceover...');
    const audioUrl = await this.uploadAudio(audioPath);
    console.log(`[DidService] Audio uploaded: ${audioUrl}`);

    console.log('[DidService] Step 3: Triggering talking avatar synthesis...');
    const talkId = await this.createTalk({ imageUrl, audioUrl });
    console.log(`[DidService] Talk ID created: ${talkId}`);

    console.log('[DidService] Step 4: Waiting for video rendering...');
    const resultUrl = await this.pollTalkStatus(talkId);
    console.log(`[DidService] Video ready at: ${resultUrl}`);

    console.log('[DidService] Step 5: Downloading final video...');
    await this.downloadVideo(resultUrl, outputVideoPath);
    console.log(`[DidService] Downloaded to: ${outputVideoPath}`);

    return {
      success: true,
      videoPath: outputVideoPath,
      resultUrl,
      talkId
    };
  }
}
