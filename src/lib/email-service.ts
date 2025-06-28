import { Resend } from 'resend';

// Initialize Resend only if API key is available (prevents build errors)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface CarrierChange {
  carrierName: string;
  dotNumber: string;
  field: string;
  oldValue: string;
  newValue: string;
  changeDate: string;
}

interface AlertEmailData {
  userEmail: string;
  userName: string;
  changes: CarrierChange[];
}

export async function sendCarrierAlertEmail(data: AlertEmailData) {
  if (!process.env.RESEND_API_KEY || !resend) {
    console.log('No Resend API key configured - skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: 'CarrierTracker <alerts@carriertracker.com>',
      to: [data.userEmail],
      subject: `Carrier Alert: ${data.changes.length} Update${data.changes.length > 1 ? 's' : ''} Detected`,
      html: generateAlertEmailHTML(data),
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: 'Email service error' };
  }
}

function generateAlertEmailHTML(data: AlertEmailData): string {
  const changesHTML = data.changes
    .map(
      (change) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600;">${change.carrierName}</td>
          <td style="padding: 12px; font-family: monospace;">${change.dotNumber}</td>
          <td style="padding: 12px;">${change.field}</td>
          <td style="padding: 12px; color: #dc2626;">${change.oldValue}</td>
          <td style="padding: 12px; color: #059669;">${change.newValue}</td>
          <td style="padding: 12px; color: #6b7280;">${change.changeDate}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Carrier Alert</title>
    </head>
    <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        
        <!-- Header -->
        <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">CarrierTracker Alert</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Carrier status changes detected</p>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <p>Hello ${data.userName},</p>
          
          <p>We've detected ${data.changes.length} change${data.changes.length > 1 ? 's' : ''} to carriers you're monitoring:</p>

          <div style="margin: 20px 0; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Carrier</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">DOT #</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Field</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Old Value</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">New Value</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Date</th>
                </tr>
              </thead>
              <tbody>
                ${changesHTML}
              </tbody>
            </table>
          </div>

          <div style="margin: 24px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #92400e;">💡 Tip:</p>
            <p style="margin: 4px 0 0 0; color: #92400e;">Log into your CarrierTracker dashboard to view detailed information and update your monitoring preferences.</p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://carriertracker.com'}/dashboard" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            This alert was sent because you have monitoring enabled for these carriers.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://carriertracker.com'}/dashboard" style="color: #2563eb;">Manage your alerts</a> | 
            <a href="#" style="color: #6b7280;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

interface CarrierSummary {
  name: string;
  dotNumber: string;
  safetyRating: string;
  insuranceStatus: string;
  changesThisWeek?: number;
}

export async function sendWeeklyDigestEmail(userEmail: string, userName: string, carrierSummary: CarrierSummary[]) {
  if (!process.env.RESEND_API_KEY || !resend) {
    console.log('No Resend API key configured - skipping weekly digest');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: 'CarrierTracker <digest@carriertracker.com>',
      to: [userEmail],
      subject: 'Weekly Carrier Status Digest',
      html: generateWeeklyDigestHTML(userName, carrierSummary),
    });

    if (error) {
      console.error('Weekly digest email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Weekly digest service error:', error);
    return { success: false, error: 'Email service error' };
  }
}

function generateWeeklyDigestHTML(userName: string, carrierSummary: CarrierSummary[]): string {
  const summaryHTML = carrierSummary
    .map(
      (carrier) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600;">${carrier.name}</td>
          <td style="padding: 12px; font-family: monospace;">${carrier.dotNumber}</td>
          <td style="padding: 12px;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; 
                         background-color: ${carrier.safetyRating === 'Satisfactory' ? '#d1fae5' : carrier.safetyRating === 'Conditional' ? '#fef3c7' : '#fee2e2'};
                         color: ${carrier.safetyRating === 'Satisfactory' ? '#065f46' : carrier.safetyRating === 'Conditional' ? '#92400e' : '#991b1b'};">
              ${carrier.safetyRating}
            </span>
          </td>
          <td style="padding: 12px;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; 
                         background-color: ${carrier.insuranceStatus === 'Active' ? '#d1fae5' : '#fee2e2'};
                         color: ${carrier.insuranceStatus === 'Active' ? '#065f46' : '#991b1b'};">
              ${carrier.insuranceStatus}
            </span>
          </td>
          <td style="padding: 12px; text-align: center;">${carrier.changesThisWeek || 0}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Weekly Carrier Digest</title>
    </head>
    <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        
        <!-- Header -->
        <div style="background-color: #059669; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">📊 Weekly Digest</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Your carrier monitoring summary</p>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <p>Hello ${userName},</p>
          
          <p>Here's your weekly summary of the ${carrierSummary.length} carrier${carrierSummary.length > 1 ? 's' : ''} you're monitoring:</p>

          <div style="margin: 20px 0; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Carrier</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">DOT #</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Safety</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Insurance</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Changes</th>
                </tr>
              </thead>
              <tbody>
                ${summaryHTML}
              </tbody>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://carriertracker.com'}/dashboard" 
               style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Full Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            Weekly digests are sent every Monday with your carrier status summary.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://carriertracker.com'}/dashboard" style="color: #2563eb;">Manage preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}