import { MarketError } from './types';
export function imageMime(bytes: Uint8Array) { if (bytes.length < 12)
    throw new MarketError('Choose a valid JPEG, PNG or WebP image.'); if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'image/jpeg'; if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return 'image/png'; if (new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP')
    return 'image/webp'; throw new MarketError('Only JPEG, PNG and WebP photos are supported.'); }
