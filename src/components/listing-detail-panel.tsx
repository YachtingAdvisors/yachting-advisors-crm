'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Listing } from '@/lib/types';

interface Props {
  listing: Listing;
  onClose: () => void;
}

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

export default function ListingDetailPanel({ listing, onClose }: Props) {
  const router = useRouter();
  const [mainImage, setMainImage] = useState(0);

  const vesselTitle = `${listing.year} ${listing.make} ${listing.model}`;

  function handleCreateDeal() {
    const desc = encodeURIComponent(`${vesselTitle} - ${listing.name}`);
    router.push(`/deals?new=1&contact_name=&description=${desc}`);
  }

  const specs: { label: string; value: string | null }[] = [
    { label: 'LOA', value: listing.loa_feet ? `${listing.loa_feet} ft` : null },
    { label: 'Beam', value: listing.beam_feet ? `${listing.beam_feet} ft` : null },
    { label: 'Cabins', value: listing.cabins ? String(listing.cabins) : null },
    { label: 'Hull Material', value: listing.hull_material },
    { label: 'Engine Make', value: listing.engine_make },
    { label: 'Engine Hours', value: listing.engine_hours ? String(listing.engine_hours) : null },
    { label: 'Condition', value: listing.condition },
    { label: 'Category', value: listing.category },
  ];

  const locationParts = [listing.location_city, listing.location_state, listing.location_country].filter(Boolean);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white border-l border-gray-200 z-50 overflow-y-auto animate-slide-in">
        <div className="p-6">
          {/* Close button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1" />
            <button onClick={onClose} className="text-gray-400 hover:text-[#33475b] p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image gallery */}
          {listing.images && listing.images.length > 0 ? (
            <div className="mb-6">
              <img
                src={listing.images[mainImage]}
                alt={vesselTitle}
                className="w-full aspect-[4/3] object-cover rounded-xl"
              />
              {listing.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {listing.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setMainImage(i)}
                      className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === mainImage ? 'border-[#0091ae]' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={img} alt={`${vesselTitle} ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.75 13.5h16.5m-16.5 0c0 2.485 2.015 4.5 4.5 4.5h7.5c2.485 0 4.5-2.015 4.5-4.5m-16.5 0L2.25 12l2.25-3h15l2.25 3-1.5 1.5M8.25 6.75V3.75a1.5 1.5 0 011.5-1.5h4.5a1.5 1.5 0 011.5 1.5v3" />
              </svg>
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#1a1a2e]">{listing.name || vesselTitle}</h2>
            <p className="text-sm text-gray-500 mt-1">{vesselTitle}</p>
            <p className="text-2xl font-semibold text-[#0091ae] mt-2">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded border ${SOURCE_BADGES[listing.source] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              {SOURCE_LABELS[listing.source] ?? listing.source}
            </span>
          </div>

          {/* Specs grid */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Specifications</p>
            <div className="grid grid-cols-2 gap-3">
              {specs.map((spec) => (
                <div key={spec.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{spec.label}</p>
                  <p className="text-sm text-[#33475b] mt-1 font-medium">{spec.value || '---'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          {locationParts.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Location</p>
              <p className="text-sm text-[#33475b]">{locationParts.join(', ')}</p>
            </div>
          )}

          {/* Broker */}
          {listing.broker_name && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Broker</p>
              <p className="text-sm text-[#33475b]">{listing.broker_name}</p>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Description</p>
              <div className="max-h-48 overflow-y-auto">
                <p className="text-sm text-[#33475b] whitespace-pre-wrap">{listing.description}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={handleCreateDeal}
              className="w-full px-4 py-2.5 text-sm bg-[#ff7a59] border border-[#ff7a59] rounded-lg text-white hover:bg-[#e8664a] transition-colors"
            >
              Create Deal from Listing
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
