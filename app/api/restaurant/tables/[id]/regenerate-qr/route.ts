import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { Table, Restaurant } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/base-url';
import { successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

async function ensureRestaurantSlug(restaurantId: string) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return null;
  if (restaurant.slug && restaurant.slug.trim()) return restaurant;

  const base = slugify(restaurant.name || 'restaurant');
  if (!base || base.length < 3) return restaurant;

  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await Restaurant.findOne({ slug: candidate, _id: { $ne: restaurant._id } }).select('_id');
    if (!taken) break;
    candidate = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }

  await Restaurant.updateOne(
    { _id: restaurant._id, $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] },
    { $set: { slug: candidate } }
  );

  restaurant.slug = candidate;
  return restaurant;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (authUser.role !== 'restaurant_admin') {
      return forbiddenResponse();
    }

    await connectDB();

    const { id } = params;
    
    const newQrCode = crypto.randomBytes(16).toString('hex');

    const table = await Table.findOneAndUpdate(
      { _id: id, restaurantId: authUser.restaurantId },
      { qrCode: newQrCode },
      { new: true }
    );

    if (!table) {
      return notFoundResponse('Table not found');
    }

    const baseUrl = getBaseUrl(request);

    const restaurant = authUser.restaurantId ? await ensureRestaurantSlug(String(authUser.restaurantId)) : null;

    // Best-effort backfill for legacy tables missing `code`
    if (!table.code) {
      const candidate = `table-${table.number}`.toLowerCase();
      await Table.updateOne(
        { _id: table._id, restaurantId: authUser.restaurantId, $or: [{ code: { $exists: false } }, { code: null }, { code: '' }] },
        { $set: { code: candidate } }
      );
      table.code = candidate as any;
    }

    const aliasQrUrl = restaurant?.slug && table.code ? `${baseUrl}/r/${restaurant.slug}/${table.code}` : null;

    return successResponse({
      id: table._id,
      name: table.name,
      number: table.number,
      code: table.code,
      qrCode: table.qrCode,
      qrUrl: `${baseUrl}/qr/${table.qrCode}`,
      aliasQrUrl,
      capacity: table.capacity,
      isActive: table.isActive,
    });
  } catch (error) {
    console.error('Regenerate QR error:', error);
    return serverErrorResponse();
  }
}
