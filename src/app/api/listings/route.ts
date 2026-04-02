import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';
import type { Listing, ListingFeedSettings, ListingFeedType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Simple in-memory cache with 5-minute TTL
// ---------------------------------------------------------------------------
interface CacheEntry {
  listings: Listing[];
  total: number;
  ts: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function setCache(key: string, listings: Listing[], total: number) {
  cache.set(key, { listings, total, ts: Date.now() });
}

// ---------------------------------------------------------------------------
// Feed fetchers
// ---------------------------------------------------------------------------

function parseFeetString(val: string | number | null | undefined): number | null {
  if (val == null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

async function fetchBoatsCom(
  settings: ListingFeedSettings,
  limit: number,
  offset: number,
): Promise<{ listings: Listing[]; total: number }> {
  const url = new URL('https://api.boats.com/inventory/search');
  url.searchParams.set('key', settings.api_key || '');
  url.searchParams.set('SalesStatus', 'Active,On-Order');
  url.searchParams.set('start', String(offset));
  url.searchParams.set('rows', String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) return { listings: [], total: 0 };

  const json = await res.json();
  const results: any[] = json.results || [];
  const total: number = json.numResults || 0;

  const listings: Listing[] = results.map((r: any) => ({
    id: String(r.DocumentID ?? ''),
    source: 'boats_com' as ListingFeedType,
    name: r.BoatName || '',
    make: r.MakeString || '',
    model: r.Model || '',
    year: Number(r.ModelYear) || 0,
    price: r.Price != null ? Number(r.Price) : null,
    currency: 'USD',
    loa_feet: parseFeetString(r.NominalLength),
    beam_feet: parseFeetString(r.BeamMeasure),
    location_city: r.BoatLocation?.BoatCityName || null,
    location_state: r.BoatLocation?.BoatStateCode || null,
    location_country: r.BoatLocation?.BoatCountryID || null,
    condition: r.SaleClassCode || null,
    status: r.SalesStatus || '',
    category: r.BoatCategoryCode || null,
    hull_material: null,
    engine_count: null,
    engine_make: null,
    engine_hours: null,
    cabins: null,
    description: Array.isArray(r.GeneralBoatDescription)
      ? r.GeneralBoatDescription.join(' ')
      : r.GeneralBoatDescription || null,
    images: (r.Images || []).map((img: any) => img.Uri).filter(Boolean),
    broker_name: r.SalesRep?.Name || null,
    last_updated: new Date().toISOString(),
  }));

  return { listings, total };
}

async function fetchYachtBroker(
  settings: ListingFeedSettings,
  limit: number,
  offset: number,
): Promise<{ listings: Listing[]; total: number }> {
  const page = Math.floor(offset / limit) + 1;
  const url = new URL('https://api.yachtbroker.org/listings');
  url.searchParams.set('key', settings.api_token || '');
  url.searchParams.set('id', settings.company_id || '');
  url.searchParams.set('gallery', 'true');
  url.searchParams.set('engines', 'true');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('page', String(page));
  url.searchParams.set('status', 'On,Private');

  const res = await fetch(url.toString(), {
    headers: {
      'X-API-KEY': settings.api_token || '',
      'X-CLIENT-ID': settings.company_id || '',
    },
  });
  if (!res.ok) return { listings: [], total: 0 };

  const json = await res.json();
  const results: any[] = json['V-Data'] || [];
  const total: number = json.total || 0;

  const listings: Listing[] = results.map((r: any) => ({
    id: String(r.ID ?? ''),
    source: 'yacht_broker' as ListingFeedType,
    name: r.VesselName || '',
    make: r.Manufacturer || '',
    model: r.Model || '',
    year: Number(r.Year) || 0,
    price: r.PriceUSD != null ? Number(r.PriceUSD) : null,
    currency: 'USD',
    loa_feet: parseFeetString(r.LOAFeet),
    beam_feet: parseFeetString(r.BeamFeet),
    location_city: r.City || null,
    location_state: r.State || null,
    location_country: r.Country || null,
    condition: r.Condition || null,
    status: r.Status || '',
    category: r.Type || null,
    hull_material: r.HullMaterial || null,
    engine_count: null,
    engine_make: null,
    engine_hours: null,
    cabins: null,
    description: r.Description || null,
    images: (r.gallery || []).map((g: any) => g.HD).filter(Boolean),
    broker_name: r.ListingOwnerName || null,
    last_updated: new Date().toISOString(),
  }));

  return { listings, total };
}

async function fetchYatco(
  settings: ListingFeedSettings,
  limit: number,
  offset: number,
): Promise<{ listings: Listing[]; total: number }> {
  const res = await fetch(
    'http://api.yatcoboss.com/API/V1/ForSale/Vessel/Search',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${settings.api_token || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year: { Start: 1960, End: 2030 },
        loa: { Start: 5, End: 200 },
        Records: limit,
        Offset: offset,
      }),
    },
  );
  if (!res.ok) return { listings: [], total: 0 };

  const json = await res.json();
  const results: any[] = json.Results || [];
  const total: number = json.Count || 0;

  const listings: Listing[] = results.map((r: any) => ({
    id: String(r.VesselID ?? ''),
    source: 'yatco' as ListingFeedType,
    name: r.VesselName || '',
    make: r.BuilderName || '',
    model: r.Model || '',
    year: Number(r.Year) || 0,
    price: r.AskingPrice != null ? Number(r.AskingPrice) : null,
    currency: 'USD',
    loa_feet: parseFeetString(r.LOAFeet),
    beam_feet: parseFeetString(r.BeamFeet),
    location_city: r.LocationCity || null,
    location_state: r.LocationState || null,
    location_country: r.LocationCountry || null,
    condition: r.VesselConditionText || null,
    status: r.VesselStatusText || '',
    category: r.MainCategoryText || null,
    hull_material: r.HullMaterial || null,
    engine_count: null,
    engine_make: null,
    engine_hours: null,
    cabins: null,
    description: null,
    images: [],
    broker_name: r.CompanyName || null,
    last_updated: new Date().toISOString(),
  }));

  return { listings, total };
}

const FETCHERS: Record<
  ListingFeedType,
  (s: ListingFeedSettings, l: number, o: number) => Promise<{ listings: Listing[]; total: number }>
> = {
  boats_com: fetchBoatsCom,
  yacht_broker: fetchYachtBroker,
  yatco: fetchYatco,
};

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Determine allowed client IDs
  let allowedClientIds: string[] | null = null;
  if (!isAdmin(user.email)) {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id);
    allowedClientIds = (userClients || []).map((uc: any) => uc.client_id);
    if (allowedClientIds.length === 0) {
      return NextResponse.json({ listings: [], total: 0 });
    }
  }

  const params = req.nextUrl.searchParams;
  const search = params.get('search') || '';
  const limit = Math.min(Number(params.get('limit')) || 50, 200);
  const offset = Number(params.get('offset')) || 0;

  // Fetch feed settings for the user's client(s)
  let feedQuery = supabase
    .from('listing_feed_settings')
    .select('*')
    .eq('enabled', true);

  if (allowedClientIds) {
    feedQuery = feedQuery.in('client_id', allowedClientIds);
  }

  const { data: feedSettings, error: feedError } = await feedQuery;
  if (feedError) {
    return NextResponse.json({ error: feedError.message }, { status: 500 });
  }

  if (!feedSettings || feedSettings.length === 0) {
    return NextResponse.json({ listings: [], total: 0 });
  }

  // Aggregate listings from all enabled feeds
  let allListings: Listing[] = [];
  let totalCount = 0;

  const feedPromises = (feedSettings as ListingFeedSettings[]).map(async (fs) => {
    const cacheKey = `${fs.id}:${limit}:${offset}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const fetcher = FETCHERS[fs.feed_type];
    if (!fetcher) return { listings: [], total: 0 };

    try {
      const result = await fetcher(fs, limit, offset);
      setCache(cacheKey, result.listings, result.total);
      return result;
    } catch {
      return { listings: [], total: 0 };
    }
  });

  const results = await Promise.all(feedPromises);
  for (const r of results) {
    allListings = allListings.concat(r.listings);
    totalCount += r.total;
  }

  // Client-side search filtering
  if (search) {
    const q = search.toLowerCase();
    allListings = allListings.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.make.toLowerCase().includes(q) ||
        l.model.toLowerCase().includes(q),
    );
    totalCount = allListings.length;
  }

  return NextResponse.json({ listings: allListings, total: totalCount });
}
