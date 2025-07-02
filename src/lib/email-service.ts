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

// Insurance notification interfaces and functions
interface InsuranceNotificationData {
  recipient_email: string
  recipient_name: string
  carrier_name: string
  carrier_dot: string
  notification_type: 'insurance_updated' | 'insurance_expired' | 'insurance_disputed'
  insurance_carrier?: string
  expiry_date?: string
  updated_by?: string
  notes?: string
  document_url?: string
}

export async function sendInsuranceNotificationEmail(data: InsuranceNotificationData) {
  if (!process.env.RESEND_API_KEY || !resend) {
    console.log('No Resend API key configured - skipping insurance notification');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: 'CarrierTracker <insurance@carriertracker.com>',
      to: [data.recipient_email],
      subject: getInsuranceEmailSubject(data),
      html: generateInsuranceNotificationHTML(data),
    });

    if (error) {
      console.error('Insurance notification email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Insurance notification service error:', error);
    return { success: false, error: 'Email service error' };
  }
}

function getInsuranceEmailSubject(data: InsuranceNotificationData): string {
  switch (data.notification_type) {
    case 'insurance_updated':
      return `Insurance Update: ${data.carrier_name} (DOT ${data.carrier_dot})`
    case 'insurance_expired':
      return `🚨 Insurance Expired: ${data.carrier_name} (DOT ${data.carrier_dot})`
    case 'insurance_disputed':
      return `⚠️ Insurance Disputed: ${data.carrier_name} (DOT ${data.carrier_dot})`
    default:
      return `Carrier Update: ${data.carrier_name}`
  }
}

function generateInsuranceNotificationHTML(data: InsuranceNotificationData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://carriertracker.com'
  const carrierUrl = `${baseUrl}/carrier/${data.carrier_dot}`

  const getNotificationContent = () => {
    switch (data.notification_type) {
      case 'insurance_updated':
        return {
          headerColor: '#2563eb',
          icon: '🔄',
          title: 'Insurance Updated',
          message: `The insurance information for ${data.carrier_name} has been updated by the community.`,
          details: [
            data.insurance_carrier ? `Insurance Carrier: ${data.insurance_carrier}` : null,
            data.expiry_date ? `Expiry Date: ${new Date(data.expiry_date).toLocaleDateString()}` : null,
            data.updated_by ? `Updated by: ${data.updated_by}` : null,
            data.document_url ? `📄 Document provided` : null,
            data.notes ? `Notes: ${data.notes}` : null
          ].filter(Boolean)
        }
      
      case 'insurance_expired':
        return {
          headerColor: '#dc2626',
          icon: '🚨',
          title: 'Insurance Expired',
          message: `The insurance for ${data.carrier_name} has expired and may no longer be valid.`,
          details: [
            data.expiry_date ? `Expired on: ${new Date(data.expiry_date).toLocaleDateString()}` : null,
            '⚠️ Please verify current insurance status before conducting business'
          ].filter(Boolean)
        }
      
      case 'insurance_disputed':
        return {
          headerColor: '#f59e0b',
          icon: '⚠️',
          title: 'Insurance Information Disputed',
          message: `The insurance information for ${data.carrier_name} has been disputed by another user.`,
          details: [
            'The accuracy of current insurance data is being questioned',
            '⚠️ Please verify insurance status directly with the carrier'
          ]
        }
      
      default:
        return {
          headerColor: '#6b7280',
          icon: '📋',
          title: 'Carrier Update',
          message: `There has been an update to ${data.carrier_name}.`,
          details: ['View carrier details for more information']
        }
    }
  }

  const content = getNotificationContent()
  const detailsHTML = content.details.map(detail => 
    `<li style="margin: 4px 0; color: #374151;">${detail}</li>`
  ).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Insurance Notification</title>
    </head>
    <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        
        <!-- Header -->
        <div style="background-color: ${content.headerColor}; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${content.icon} ${content.title}</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">CarrierTracker Insurance Alert</p>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <p>Hello ${data.recipient_name},</p>
          
          <p>${content.message}</p>

          <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid ${content.headerColor}; border-radius: 4px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">Details:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${detailsHTML}
            </ul>
          </div>

          <div style="margin: 24px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #92400e;">⚠️ Important Reminder:</p>
            <p style="margin: 4px 0 0 0; color: #92400e; font-size: 14px;">
              This insurance information is user-contributed and provided for convenience only. 
              Always verify insurance coverage directly with the carrier or their insurance provider before making business decisions.
            </p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${carrierUrl}" 
               style="display: inline-block; background-color: ${content.headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Carrier Details
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            You received this notification because you have monitoring enabled for this carrier.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
            <a href="${baseUrl}/dashboard" style="color: #2563eb;">Manage notifications</a> | 
            <a href="${baseUrl}/profile" style="color: #6b7280;">Update preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}