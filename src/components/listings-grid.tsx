'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Listing } from '@/lib/types';
import SearchBar from './search-bar';
import ListingDetailPanel from './listing-detail-panel';

const PAGE_SIZE = 24;

const SOURCE_BADGES: Record<string, string> = {
  boats_com: 'bg-blue-50 text-blue-700 border-blue-200',
  yacht_broker: 'bg-violet-50 text-violet-700 border-violet-200',
  yatco: 'bg-amber-50 text-amber-700 border-amber-200',
};

const SOURCE_LABELS: Record<string, string> = {
  boats_com: 'Boats.com',
  yacht_broker: 'YachtBroker',
  yatco: 'Yatco',
};

function formatPrice(val: number | null, currency: string) {
  if (val == null) return 'Price on request';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

function BoatPlaceholder() {
  return (
    <div className="aspect-[4/3] bg-gray-100 rounded-t-xl flex items-center justify-center">
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.75 13.5h16.5m-16.5 0c0 2.485 2.015 4.5 4.5 4.5h7.5c2.485 0 4.5-2.015 4.5-4.5m-16.5 0L2.25 12l2.25-3h15l2.25 3-1.5 1.5M8.25 6.75V3.75a1.5 1.5 0 011.5-1.5h4.5a1.5 1.5 0 011.5 1.5v3" />
      </svg>
    </div>
  );
}

export default function ListingsGrid() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(0);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Filters
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [minLength, setMinLength] = useState('');
  const [makeFilter, setMakeFilter] = useState('');

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, priceMin, priceMax, yearMin, yearMax, minLength, makeFilter]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));
    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    if (yearMin) params.set('year_min', yearMin);
    if (yearMax) params.set('year_max', yearMax);
    if (minLength) params.set('loa_min', minLength);
    if (makeFilter) params.set('make', makeFilter);

    try {
      const res = await fetch(`/api/listings?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotal(data.total ?? (data.listings?.length || 0));
    } catch {
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, priceMin, priceMax, yearMin, yearMax, minLength, makeFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Build unique makes from current results for dropdown
  const makes = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.make) set.add(l.make);
    });
    return Array.from(set).sort();
  }, [listings]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterInputClass =
    'px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-[#33475b] placeholder-gray-400 focus:outline-none focus:border-[#0091ae] focus:ring-1 focus:ring-[#0091ae]/20';

  function vesselTitle(l: Listing) {
    return `${l.year} ${l.make} ${l.model}`;
  }

  function locationText(l: Listing) {
    const parts = [l.location_city, l.location_state].filter(Boolean);
    return parts.join(', ') || null;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'grid' ? 'bg-[#ff7a59] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'list' ? 'bg-[#ff7a59] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              List
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price Min</label>
            <input
              type="number"
              placeholder="0"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className={`${filterInputClass} w-28`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price Max</label>
            <input
              type="number"
              placeholder="Any"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className={`${filterInputClass} w-28`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year Min</label>
            <input
              type="number"
              placeholder="Any"
              value={yearMin}
              onChange={(e) => setYearMin(e.target.value)}
              className={`${filterInputClass} w-24`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year Max</label>
            <input
              type="number"
              placeholder="Any"
              value={yearMax}
              onChange={(e) => setYearMax(e.target.value)}
              className={`${filterInputClass} w-24`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Length (ft)</label>
            <input
              type="number"
              placeholder="Any"
              value={minLength}
              onChange={(e) => setMinLength(e.target.value)}
              className={`${filterInputClass} w-24`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Make</label>
            <select
              value={makeFilter}
              onChange={(e) => setMakeFilter(e.target.value)}
              className={`${filterInputClass} w-40`}
            >
              <option value="">All Makes</option>
              {makes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading listings...</div>
      ) : listings.length === 0 ? (
        /* Empty state */
        <div className="bg-white flex flex-col items-center justify-center py-24 border border-dashed border-gray-300 rounded-xl">
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5h16.5m-16.5 0c0 2.485 2.015 4.5 4.5 4.5h7.5c2.485 0 4.5-2.015 4.5-4.5m-16.5 0L2.25 12l2.25-3h15l2.25 3-1.5 1.5M8.25 6.75V3.75a1.5 1.5 0 011.5-1.5h4.5a1.5 1.5 0 011.5 1.5v3" />
          </svg>
          <p className="text-gray-400 font-medium mb-1">No listings found</p>
          <p className="text-sm text-gray-400 mb-6">
            Configure your listing feeds in Settings to get started.
          </p>
          <a
            href="/admin"
            className="px-5 py-2.5 text-sm bg-[#ff7a59] border border-[#ff7a59] rounded-lg text-white hover:bg-[#e8664a] transition-colors"
          >
            Go to Settings
          </a>
        </div>
      ) : view === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              onClick={() => setSelectedListing(listing)}
              className="bg-white shadow-sm border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 hover:shadow transition-all"
            >
              {listing.images && listing.images.length > 0 ? (
                <img
                  src={listing.images[0]}
                  alt={vesselTitle(listing)}
                  className="aspect-[4/3] object-cover rounded-t-xl w-full"
                />
              ) : (
                <BoatPlaceholder />
              )}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-[#1a1a2e] truncate">
                  {vesselTitle(listing)}
                </h3>
                {listing.name !== `${listing.make} ${listing.model}` && listing.name && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{listing.name}</p>
                )}
                <p className="text-sm font-semibold text-[#0091ae] mt-2">
                  {formatPrice(listing.price, listing.currency)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {locationText(listing) && (
                    <span className="text-xs text-gray-500">{locationText(listing)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {listing.loa_feet && (
                    <span className="text-xs px-2 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200">
                      {listing.loa_feet} ft
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded border ${SOURCE_BADGES[listing.source] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {SOURCE_LABELS[listing.source] ?? listing.source}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium w-16">Image</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Vessel</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Make/Model</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Year</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Price</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">LOA</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Location</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr
                  key={listing.id}
                  onClick={() => setSelectedListing(listing)}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={vesselTitle(listing)}
                        className="w-12 h-9 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-9 bg-gray-100 rounded flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.75 13.5h16.5m-16.5 0c0 2.485 2.015 4.5 4.5 4.5h7.5c2.485 0 4.5-2.015 4.5-4.5m-16.5 0L2.25 12l2.25-3h15l2.25 3-1.5 1.5M8.25 6.75V3.75a1.5 1.5 0 011.5-1.5h4.5a1.5 1.5 0 011.5 1.5v3" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#1a1a2e] font-medium whitespace-nowrap truncate max-w-[180px]">
                    {listing.name || vesselTitle(listing)}
                  </td>
                  <td className="px-4 py-3 text-[#33475b] text-xs whitespace-nowrap">
                    {listing.make} {listing.model}
                  </td>
                  <td className="px-4 py-3 text-[#33475b] text-xs font-mono">{listing.year}</td>
                  <td className="px-4 py-3 text-[#0091ae] font-mono text-xs whitespace-nowrap">
                    {formatPrice(listing.price, listing.currency)}
                  </td>
                  <td className="px-4 py-3 text-[#33475b] text-xs font-mono">
                    {listing.loa_feet ? `${listing.loa_feet} ft` : '---'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {locationText(listing) || '---'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${SOURCE_BADGES[listing.source] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {SOURCE_LABELS[listing.source] ?? listing.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && listings.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {page * PAGE_SIZE + 1}--{Math.min((page + 1) * PAGE_SIZE, total)} of {total} listings
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedListing && (
        <ListingDetailPanel
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  );
}
