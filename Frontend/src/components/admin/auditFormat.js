import { Bot, User, AlertTriangle, Check, Sparkles, X } from 'lucide-react';

export const ACTION_LABELS = {
  signal_extraction: 'Understood request',
  trek_recommendation: 'Recommended a trek',
  sales_pivot: 'Pivoted to alternative',
  trek_info_request: 'Answered a question',
  campaign_nudge: 'Proactive nudge',
  booking_attempt: 'Booking attempt',
  payment_verification: 'Payment verification',
  webhook_verification: 'Webhook payment confirmation',
  booking_cancellation: 'Booking cancelled',
  booking_expiry: 'Reservation expired',
  payment_creation: 'Payment order creation',
  ai_chat_attempt: 'AI chat (fallback)',
  rate_limit: 'Rate limit triggered'
};
export const actionLabel = (action) => ACTION_LABELS[action] || (action || '').replace(/_/g, ' ');

export const ACTOR_META = {
  agent: { label: 'API Agent', icon: Bot, cls: 'text-seal-600 bg-seal-100' },
  system: { label: 'System Core', icon: AlertTriangle, cls: 'text-ink-600 bg-paper-200' },
  human: { label: 'Human (Web)', icon: User, cls: 'text-ink-600 bg-paper-200' }
};

export const DECISION_META = {
  approved: { label: 'Approved', icon: Check, cls: 'text-pine-600' },
  processed: { label: 'AI Reasoning', icon: Sparkles, cls: 'text-seal-600' },
  fallback: { label: 'Fallback', icon: AlertTriangle, cls: 'text-brass-600' },
  rejected: { label: 'Blocked', icon: X, cls: 'text-rust-600' }
};

export const GUARDRAIL_LEGEND = [
  { label: 'Fitness', desc: "Blocks a booking if the traveler's stated fitness is below the trek's minimum." },
  { label: 'Add-on cap', desc: 'Blocks add-on spend above 25% of the trek base price, per person.' },
  { label: 'Budget', desc: "Blocks a booking that exceeds the customer's stated per-person budget." },
  { label: 'Slot availability', desc: 'Atomic check — a race for the last seat can never over-book.' },
  { label: 'Rate limit', desc: 'Caps chat requests per IP; logged, not just silently dropped.' }
];

export const REJECTION_CATEGORIES = [
  { key: 'fitness', label: 'Fitness' },
  { key: 'slots', label: 'Slot availability' },
  { key: 'budget', label: 'Budget' },
  { key: 'addonCap', label: 'Add-on cap' },
  { key: 'other', label: 'Other' }
];
