import { MarketError } from './types';
/** For the administrator's slider: a JPEG, PNG or WebP image, or an MP4 or WebM video, recognised by its first bytes. */
export function mediaMime(bytes: Uint8Array) {
    if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp')
        return 'video/mp4';
    if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
        return 'video/webm';
    try { return imageMime(bytes); }
    catch { throw new MarketError('Upload a JPEG, PNG or WebP image, or an MP4 or WebM video.'); }
}
export function imageMime(bytes: Uint8Array) { if (bytes.length < 12)
    throw new MarketError('Choose a valid JPEG, PNG or WebP image.'); if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'image/jpeg'; if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return 'image/png'; if (new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP')
    return 'image/webp'; throw new MarketError('Only JPEG, PNG and WebP photos are supported.'); }
