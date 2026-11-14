import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { EmailService } from '../modules/integrations/email.service';

const OUTPUT_DIR = path.resolve(__dirname, '../../../docs/email-previews');
const HTML_DIR = path.join(OUTPUT_DIR, 'html');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');

[OUTPUT_DIR, HTML_DIR, SCREENSHOTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const logoPath = path.resolve(__dirname, '../assets/logo.png');
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : '';

interface TemplateTestCase {
  filename: string;
  trigger: any;
  title: string;
  payload: Record<string, any>;
}

const testCases: TemplateTestCase[] = [
  {
    filename: '01_lead_created',
    trigger: 'lead.created',
    title: '1. Lead Capture - Welcome & Portal Credentials',
    payload: {
      name: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      studentEmail: 'rohan.sharma@example.com',
      targetCountry: 'Canada',
      targetCourse: 'MSc Computer Science',
      portalUsername: 'rohan.sharma@example.com',
      portalPassword: 'Student@482910',
    },
  },
  {
    filename: '02_counselling_scheduled',
    trigger: 'counselling.scheduled',
    title: '2. Counselling - Meeting Scheduled',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      counsellorName: 'Sarah Jenkins',
      scheduledDate: 'October 30, 2026',
      scheduledTime: '3:00 PM IST',
      googleMeetLink: 'https://meet.google.com/abc-defg-hij',
    },
  },
  {
    filename: '03_profile_verified',
    trigger: 'profile.verified',
    title: '3. Profile Evaluation - Verified',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      counsellorName: 'Sarah Jenkins',
      targetCountry: 'Canada',
    },
  },
  {
    filename: '04_shortlist_updated',
    trigger: 'shortlist.updated',
    title: '4. Shortlist - University Options Ready',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      shortlistCount: 4,
      targetCountry: 'Canada',
    },
  },
  {
    filename: '05_document_requested',
    trigger: 'document.requested',
    title: '5. Documents - Document Requested',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      documentTitle: 'Passport Front & Back Page',
      category: 'IDENTITY',
      isMandatory: true,
      deadline: 'November 5, 2026',
    },
  },
  {
    filename: '06_document_approved',
    trigger: 'document.reviewed',
    title: '6. Documents - Document Approved',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      documentTitle: 'Official University Transcripts',
      status: 'VERIFIED',
      remarks: 'Transcripts meet all minimum GPA thresholds for Canadian universities.',
    },
  },
  {
    filename: '07_document_rejected',
    trigger: 'document.reviewed',
    title: '7. Documents - Document Re-upload Requested',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      documentTitle: 'IELTS English Proficiency Test Score',
      status: 'REJECTED',
      remarks: 'Document is blurry and missing TRF registration code. Please re-scan in 300 DPI.',
    },
  },
  {
    filename: '08_application_submitted',
    trigger: 'application.submitted',
    title: '8. Application - Application Submitted',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      universityName: 'University of Toronto',
      courseTitle: 'Master of Science in Computer Science',
      intake: 'Fall 2027',
      applicationNumber: 'UOT-2027-89102',
    },
  },
  {
    filename: '09_application_rejected',
    trigger: 'application.rejected',
    title: '9. Application - Application Decision Update',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      universityName: 'McGill University',
      courseTitle: 'MSc Data Science',
      reason: 'Program reached competitive capacity for the selected intake.',
    },
  },
  {
    filename: '10_offer_received',
    trigger: 'offer.received',
    title: '10. Offers - Official Offer Letter Issued',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      universityName: 'University of British Columbia',
      courseTitle: 'Master of Engineering in Computing',
      offerType: 'Unconditional Admission Offer',
    },
  },
  {
    filename: '11_offer_accepted',
    trigger: 'offer.accepted',
    title: '11. Offers - Signed Acceptance Approved',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      universityName: 'University of British Columbia',
      courseTitle: 'Master of Engineering in Computing',
    },
  },
  {
    filename: '12_offer_rejected',
    trigger: 'offer.rejected',
    title: '12. Offers - Offer Revision Required',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      universityName: 'University of British Columbia',
      rejectionReason: 'Signed acceptance sheet missing signature date on page 3. Please re-upload.',
    },
  },
  {
    filename: '13_payment_requested',
    trigger: 'payment.requested',
    title: '13. Payments - Fee Deposit Invoice',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      amount: '5,000',
      currency: 'CAD',
      purpose: 'Tuition Deposit for Fall 2027 Admission Confirmation',
      dueDate: 'November 15, 2026',
    },
  },
  {
    filename: '14_payment_success',
    trigger: 'payment.success',
    title: '14. Payments - Payment Receipt Confirmed',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      amount: '5,000',
      currency: 'CAD',
      referenceNumber: 'TXN-UBC-99102834',
    },
  },
  {
    filename: '15_visa_updated',
    trigger: 'visa.updated',
    title: '15. Visa - Visa Decision Update',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      visaStatus: 'APPROVED',
      country: 'Canada',
    },
  },
  {
    filename: '16_travel_updated',
    trigger: 'travel.updated',
    title: '16. Travel - Pre-Departure Arrangements',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      destination: 'Vancouver, Canada',
    },
  },
  {
    filename: '17_departure_recorded',
    trigger: 'departure.recorded',
    title: '17. Travel - Departure Confirmed',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      departureDate: 'December 28, 2026',
    },
  },
  {
    filename: '18_arrival_confirmed',
    trigger: 'arrival.confirmed',
    title: '18. Travel - Arrival Confirmed',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      arrivalDate: 'December 29, 2026',
    },
  },
  {
    filename: '19_orientation_invited',
    trigger: 'orientation.invited',
    title: '19. Orientation - Pre-Departure Session Invite',
    payload: {
      name: 'Rohan Sharma',
      studentEmail: 'rohan.sharma@example.com',
      title: 'Canada Pre-Departure Briefing & Banking Setup',
      sessionDate: 'December 10, 2026',
      sessionTime: '4:00 PM IST',
      googleMeetLink: 'https://meet.google.com/xyz-uvwx-rst',
      venue: 'Online Google Meet / Main Auditorium',
    },
  },
];

async function generateAll() {
  console.log(`Generating ${testCases.length} email template HTML files and Chrome screenshots...`);

  const galleryItems: { filename: string; title: string; pngName: string; htmlName: string }[] = [];

  for (const tc of testCases) {
    const templateResult = EmailService.renderTemplate(tc.trigger, tc.payload);
    let html = EmailService.buildHtmlLayout({
      preheader: templateResult.preheader,
      title: templateResult.title,
      badge: templateResult.badge,
      badgeBg: templateResult.badgeBg,
      badgeColor: templateResult.badgeColor,
      bodyHtml: templateResult.bodyHtml,
      ctaText: templateResult.ctaText,
      ctaUrl: templateResult.ctaUrl,
    });

    if (logoBase64) {
      html = html.replace(/src="cid:brand-logo"/g, `src="${logoBase64}"`);
    }

    const htmlFilename = `${tc.filename}.html`;
    const htmlFilePath = path.join(HTML_DIR, htmlFilename);
    fs.writeFileSync(htmlFilePath, html, 'utf-8');

    const pngFilename = `${tc.filename}.png`;
    const pngFilePath = path.join(SCREENSHOTS_DIR, pngFilename);

    try {
      execSync(
        `google-chrome --headless=new --disable-gpu --no-sandbox --window-size=680,1050 --screenshot="${pngFilePath}" "file://${htmlFilePath}"`,
        { stdio: 'pipe' }
      );
      console.log(`✓ [${tc.filename}] Captured: ${pngFilename}`);
    } catch (err: any) {
      console.error(`✗ Error capturing ${pngFilename}:`, err?.message);
    }

    galleryItems.push({
      filename: tc.filename,
      title: tc.title,
      pngName: pngFilename,
      htmlName: htmlFilename,
    });
  }

  // Generate Interactive Gallery HTML
  const galleryHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Overseas CRM - Email Templates Gallery & Screenshots</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { display: flex; height: 100vh; background-color: #F8FAFC; color: #0F172A; }
    #sidebar { width: 340px; background: #FFFFFF; border-right: 1px solid #E2E8F0; overflow-y: auto; padding: 20px 16px; flex-shrink: 0; }
    #sidebar h2 { font-size: 16px; font-weight: 700; margin-bottom: 6px; color: #0057F8; }
    #sidebar p { font-size: 12px; color: #64748B; margin-bottom: 16px; }
    .nav-btn { display: block; width: 100%; text-align: left; padding: 10px 12px; margin-bottom: 6px; border-radius: 6px; border: 1px solid transparent; background: transparent; font-size: 13px; font-weight: 500; color: #334155; cursor: pointer; transition: all 0.15s; }
    .nav-btn:hover { background: #F1F5F9; color: #0F172A; }
    .nav-btn.active { background: #EEF4FF; border-color: #C3D9FF; color: #0057F8; font-weight: 600; }
    #content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    #topbar { padding: 14px 24px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; }
    #topbar h3 { font-size: 15px; font-weight: 600; }
    .actions { display: flex; gap: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid #CBD5E1; background: #FFFFFF; color: #334155; }
    .btn-primary { background: #0057F8; color: #FFFFFF; border-color: #0057F8; }
    #preview-area { flex: 1; padding: 24px; overflow-y: auto; display: flex; justify-content: center; background: #F1F5F9; }
    .preview-card { background: #FFFFFF; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; max-width: 650px; width: 100%; border: 1px solid #E2E8F0; }
    iframe { width: 100%; height: 850px; border: none; display: block; }
  </style>
</head>
<body>
  <div id="sidebar">
    <h2>Email Templates Gallery</h2>
    <p>19 Full-Lifecycle Student Email Templates</p>
    <div id="list">
      ${galleryItems
        .map(
          (item, idx) => `
        <button class="nav-btn ${idx === 0 ? 'active' : ''}" onclick="selectItem('${item.filename}', '${item.title}', '${item.htmlName}', '${item.pngName}', this)">
          ${item.title}
        </button>
      `
        )
        .join('')}
    </div>
  </div>

  <div id="content">
    <div id="topbar">
      <h3 id="current-title">${galleryItems[0].title}</h3>
      <div class="actions">
        <a id="btn-html" href="html/${galleryItems[0].htmlName}" target="_blank" class="btn">View Raw HTML</a>
        <a id="btn-png" href="screenshots/${galleryItems[0].pngName}" download class="btn btn-primary">Download Screenshot (.PNG)</a>
      </div>
    </div>
    <div id="preview-area">
      <div class="preview-card">
        <iframe id="preview-frame" src="html/${galleryItems[0].htmlName}"></iframe>
      </div>
    </div>
  </div>

  <script>
    function selectItem(filename, title, htmlName, pngName, el) {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('current-title').textContent = title;
      document.getElementById('preview-frame').src = 'html/' + htmlName;
      document.getElementById('btn-html').href = 'html/' + htmlName;
      document.getElementById('btn-png').href = 'screenshots/' + pngName;
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), galleryHtml, 'utf-8');
  console.log(`\n🎉 Generated interactive gallery: docs/email-previews/index.html`);
  console.log(`📸 Screenshots directory: docs/email-previews/screenshots/`);
}

generateAll().catch(console.error);
