const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    let q;
    try {
      q = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, body: 'Invalid JSON' };
    }

    const text = q.text;
    if (!text || typeof text !== 'string') {
      return { statusCode: 400, body: 'Missing text parameter' };
    }

    const voice = q.voice || 'bn-BD-PradeepNeural';
    const rateNum = Math.max(-80, Math.min(100, +q.rate || 0));
    const pitchNum = Math.max(-50, Math.min(50, +q.pitch || 0));
    const volNum = Math.max(-50, Math.min(50, +q.volume || 0));

    const rate = (rateNum >= 0 ? '+' : '') + rateNum + '%';
    const pitch = (pitchNum >= 0 ? '+' : '') + pitchNum + 'Hz';
    const volume = (volNum >= 0 ? '+' : '') + volNum + '%';

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate, pitch, volume });

    const chunks = [];
    await new Promise((resolve, reject) => {
      audioStream.on('data', d => chunks.push(d));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(buffer.length),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('Netlify TTS error:', err);
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: err.message || 'TTS generation failed' }),
    };
  }
};
