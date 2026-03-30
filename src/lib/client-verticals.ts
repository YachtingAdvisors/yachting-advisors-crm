import type { ClientType } from './types';

interface VerticalConfig {
  label: string;
  dealLabel: string;
  valueLabel: string;
  defaultStages: Array<{ name: string; color: string; is_won?: boolean; is_lost?: boolean }>;
  contactFields: string[];
}

export const CLIENT_VERTICALS: Record<ClientType, VerticalConfig> = {
  yacht_broker: {
    label: 'Yacht Broker',
    dealLabel: 'Deal',
    valueLabel: 'Value',
    defaultStages: [
      { name: 'Discovery', color: '#6366F1' },
      { name: 'Sea Trial', color: '#8B5CF6' },
      { name: 'Survey', color: '#A855F7' },
      { name: 'Negotiation', color: '#D4AF37' },
      { name: 'Under Contract', color: '#F59E0B' },
      { name: 'Closed Won', color: '#10B981', is_won: true },
      { name: 'Closed Lost', color: '#EF4444', is_lost: true },
    ],
    contactFields: ['Vessel Interest', 'Budget Range', 'Current Vessel'],
  },
  realtor: {
    label: 'Realtor',
    dealLabel: 'Listing',
    valueLabel: 'Asking Price',
    defaultStages: [
      { name: 'New Inquiry', color: '#6366F1' },
      { name: 'Showing Scheduled', color: '#8B5CF6' },
      { name: 'Offer Made', color: '#D4AF37' },
      { name: 'Under Contract', color: '#F59E0B' },
      { name: 'Inspection', color: '#F97316' },
      { name: 'Closing', color: '#10B981' },
      { name: 'Closed Won', color: '#059669', is_won: true },
      { name: 'Closed Lost', color: '#EF4444', is_lost: true },
    ],
    contactFields: ['Property Preference', 'Budget Range', 'Pre-Approved'],
  },
  property_manager: {
    label: 'Property Manager',
    dealLabel: 'Transaction',
    valueLabel: 'Value',
    defaultStages: [
      { name: 'Inquiry', color: '#6366F1' },
      { name: 'Viewing', color: '#8B5CF6' },
      { name: 'Application', color: '#D4AF37' },
      { name: 'Approved', color: '#10B981' },
      { name: 'Lease Signed', color: '#059669', is_won: true },
      { name: 'Declined', color: '#EF4444', is_lost: true },
    ],
    contactFields: ['Property Type', 'Budget Range', 'Move-in Date'],
  },
  luxury_auto: {
    label: 'Luxury Auto',
    dealLabel: 'Deal',
    valueLabel: 'Value',
    defaultStages: [
      { name: 'Inquiry', color: '#6366F1' },
      { name: 'Test Drive', color: '#8B5CF6' },
      { name: 'Negotiation', color: '#D4AF37' },
      { name: 'Financing', color: '#F59E0B' },
      { name: 'Closed Won', color: '#10B981', is_won: true },
      { name: 'Closed Lost', color: '#EF4444', is_lost: true },
    ],
    contactFields: ['Vehicle Interest', 'Budget Range', 'Trade-in'],
  },
  other: {
    label: 'Other',
    dealLabel: 'Deal',
    valueLabel: 'Value',
    defaultStages: [
      { name: 'New', color: '#6366F1' },
      { name: 'Qualified', color: '#8B5CF6' },
      { name: 'Proposal', color: '#D4AF37' },
      { name: 'Negotiation', color: '#F59E0B' },
      { name: 'Closed Won', color: '#10B981', is_won: true },
      { name: 'Closed Lost', color: '#EF4444', is_lost: true },
    ],
    contactFields: [],
  },
};
