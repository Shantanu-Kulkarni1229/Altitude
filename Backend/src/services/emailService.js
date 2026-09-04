const nodemailer = require('nodemailer');
const Booking = require('../models/Booking');
const { logGuardrailDecision } = require('../utils/guardrails');
const { LLMService } = require('../../Ai/services/llmService');
const receiptNotePrompt = require('../../Ai/prompts/receiptNotePrompt');

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

class EmailService {
  constructor() {
    this.transporter = null;
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
    }
  }

  // Fire-and-forget from the caller's point of view: a booking is confirmed
  // the moment payment verifies, and that can never be held hostage by an
  // email provider being slow or down. Every outcome — sent or failed — is
  // still written to the audit trail, so "did the receipt go out" stays
  // answerable without depending on the send to have succeeded.
  async sendBookingReceipt(bookingId, correlationId) {
    if (!this.transporter) {
      console.warn(`Email not configured (GMAIL_USER/GMAIL_APP_PASSWORD missing) — skipping receipt for booking ${bookingId}`);
      await logGuardrailDecision('system', 'receipt_email', 'processed', 'Receipt email skipped — GMAIL_USER/GMAIL_APP_PASSWORD not configured on this deployment.', null, 'failure', bookingId, correlationId).catch(() => {});
      return;
    }

    let booking;
    try {
      booking = await Booking.findById(bookingId).populate({ path: 'batchId', populate: { path: 'trekId' } }).lean();
      const trek = booking?.batchId?.trekId;
      const batch = booking?.batchId;
      if (!booking?.customerEmail || !trek || !batch) return; // nothing to send / nowhere to send it

      const note = await this._generateNote(booking, trek);
      const html = this._buildHtml({ booking, trek, batch, note });

      await this.transporter.sendMail({
        from: `"Altitude" <${process.env.GMAIL_USER}>`,
        to: booking.customerEmail,
        subject: `Your Altitude booking is confirmed — ${trek.name}`,
        html
      });

      await logGuardrailDecision('system', 'receipt_email', 'processed', `Sent booking receipt to ${booking.customerEmail} for "${trek.name}".`, null, 'success', booking._id, correlationId);
    } catch (error) {
      console.error('Failed to send booking receipt:', error.message);
      await logGuardrailDecision('system', 'receipt_email', 'processed', `Receipt email failed to send: ${error.message}`, null, 'failure', bookingId, correlationId).catch(() => {});
    }
  }

  // Only the personal note is LLM-written; every fact around it (price,
  // dates, booking ID) is filled in deterministically below, never by the
  // model — a receipt is not a place a hallucinated number can slip in.
  async _generateNote(booking, trek) {
    try {
      const prompt = receiptNotePrompt({ customerName: booking.customerName, trekName: trek.name, source: booking.source });
      const note = await LLMService.generateResponse(prompt, 10000);
      return note.trim();
    } catch {
      return `Congratulations on booking ${trek.name} — we can't wait to see you on the trail. Get ready for an unforgettable adventure.`;
    }
  }

  _buildHtml({ booking, trek, batch, note }) {
    const sourceLine = booking.source === 'agent' ? 'Booked via Altia, our AI concierge' : 'Booked via the Altitude website';
    return `
<div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1b1f19;">
  <div style="background: #131613; padding: 28px 32px; border-radius: 12px 12px 0 0;">
    <p style="color:#f2f4ee; font-size:20px; font-weight:700; margin:0;">Altitude</p>
    <p style="color:#8a9182; font-size:13px; margin:4px 0 0;">Booking receipt</p>
  </div>
  <div style="border: 1px solid #d9ddd0; border-top: none; padding: 28px 32px; border-radius: 0 0 12px 12px;">
    <p style="font-size:15px; line-height:1.6;">${note}</p>
    <div style="margin: 24px 0; padding: 20px; background:#f2f4ee; border-radius:10px;">
      <p style="margin:0 0 8px; font-size:17px; font-weight:700;">${trek.name}</p>
      <p style="margin:0 0 4px; font-size:14px; color:#525a4b;">${fmtDate(batch.startDate)} &ndash; ${fmtDate(batch.endDate)}</p>
      <p style="margin:0; font-size:14px; color:#525a4b;">${booking.travelers} traveler${booking.travelers > 1 ? 's' : ''}</p>
    </div>
    <table style="width:100%; font-size:14px; border-collapse:collapse;">
      <tr><td style="padding:6px 0; color:#6b7365;">Booking ID</td><td style="padding:6px 0; text-align:right; font-family:monospace;">${booking.bookingId}</td></tr>
      <tr><td style="padding:6px 0; color:#6b7365;">Amount paid</td><td style="padding:6px 0; text-align:right; font-weight:700;">&#8377;${booking.totalAmount.toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:6px 0; color:#6b7365;">Source</td><td style="padding:6px 0; text-align:right;">${sourceLine}</td></tr>
    </table>
    <p style="margin-top:24px; font-size:12px; color:#8f9784; line-height:1.5;">This booking passed every fitness, budget, and availability check before payment was processed. Manage or cancel it anytime from My Bookings.</p>
  </div>
</div>`;
  }
}

module.exports = new EmailService();
