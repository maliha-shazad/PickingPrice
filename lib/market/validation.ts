import { z } from 'zod';
import { MarketError } from './types';
const line = (min = 1, max = 120) => z.string().trim().min(min).max(max);
export const money = z.number().finite().int().min(1).max(1000000000);
export const conditions = ['New', 'Like New', 'Good', 'Fair', 'Used'] as const;
// Ways a seller can hand an item over. The same names are the buyer-side filter options.
export const deliveryOptions = ['Same-Day Delivery', 'In-Store Pickup', 'Nationwide Delivery'] as const;
export const image = z.string().max(1200).refine(v => !v || /^\/api\/files\/[a-zA-Z0-9-]+$/.test(v) || /^\/images\/[a-zA-Z0-9-]+\.jpg$/.test(v) || (() => { try {
    return new URL(v).protocol === 'https:';
}
catch {
    return false;
} })(), 'Use an uploaded photo or an HTTPS image URL.');
export const listingSchema = z.object({ title: line(3), description: line(10, 3000), category: line(), subcategory: line(0, 80).default(''), brand: line(0, 80).default(''), price: money, quantity: z.number().int().min(1).max(10000), condition: z.enum(conditions), location: line(2, 80), phone: line(0, 20).default(''), whatsapp: line(0, 20).default(''), meetup_spot: line(0, 200).default(''), delivery: z.array(z.enum(deliveryOptions)).max(deliveryOptions.length).default([]), images: z.array(image.refine(v => v.length > 0, 'A photo is required.')).min(1).max(6) });
export const requestSchema = z.object({ title: line(3), description: line(10, 3000), category: line(), price: money, quantity: z.number().int().min(1).max(10000), condition: z.enum(conditions), location: line(2, 80), image: image.default(''), expiry: z.string().refine(v => Number.isFinite(Date.parse(v)) && Date.parse(v.length === 10 ? v + 'T23:59:59.000Z' : v) > Date.now() && Date.parse(v) < Date.now() + 366 * 86400000, 'Choose a valid future expiry within one year.').transform(v => new Date(v.length === 10 ? v + 'T23:59:59.000Z' : v).toISOString()) });
export const offerSchema = z.object({ price: money, description: line(10, 2000), image: image.default('') });
export const profileSchema = z.object({ name: line(2, 80), bio: line(0, 1500), location: line(0, 80), phone: line(0, 20).default(''), whatsapp: line(0, 20).default(''), meetup_spot: line(0, 200).default(''), avatar: image, role: z.enum(['buyer', 'seller', 'both']) });
export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), body: line(10, 2000) });
export const messageSchema = z.object({ body: line(1, 2000) });
export function validate<T>(schema: z.ZodType<T>, value: unknown): T { const r = schema.safeParse(value); if (!r.success)
    throw new MarketError(r.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')); return r.data; }
export function stringValue(v: unknown, min = 1, max = 2000) { return validate(line(min, max), v); }
