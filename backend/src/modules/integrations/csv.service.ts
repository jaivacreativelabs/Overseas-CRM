import { LeadModel } from '../leads/lead.model';
import { UniversityModel } from '../universities/university.model';
import { BadRequestError } from '../../utils/errors';

export interface CSVImportSummary {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: Array<{ rowNumber: number; data: any; reason: string }>;
  createdRecords: any[];
}

export class CSVService {
  /**
   * Helper to parse simple CSV string into objects
   */
  public static parseCSVText(csvText: string): Array<Record<string, string>> {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const rowObj: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowObj[header] = values[index] !== undefined ? values[index] : '';
      });
      rows.push(rowObj);
    }

    return rows;
  }

  /**
   * Bulk imports leads/students from CSV data
   */
  public static async importLeadsFromCSV(csvText: string, userId?: string): Promise<CSVImportSummary> {
    const rows = this.parseCSVText(csvText);
    if (rows.length === 0) {
      throw new BadRequestError('CSV file is empty or missing valid headers');
    }

    let successfulCount = 0;
    let failedCount = 0;
    const errors: Array<{ rowNumber: number; data: any; reason: string }> = [];
    const createdRecords: any[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // header is row 1

      const name = row['Name'] || row['name'] || row['Full Name'] || row['Student Name'];
      const email = row['Email'] || row['email'] || row['Email Address'];
      const phone = row['Phone'] || row['phone'] || row['Mobile'] || row['Contact'];
      const city = row['City'] || row['city'];
      const state = row['State'] || row['state'];
      const targetCountry = row['Target Country'] || row['targetCountry'] || row['Country'];
      const targetCourse = row['Target Course'] || row['targetCourse'] || row['Course'];
      const source = row['Source'] || row['source'] || 'CSV Import';

      if (!name || !email || !phone) {
        failedCount++;
        errors.push({
          rowNumber,
          data: row,
          reason: 'Name, Email, and Phone are mandatory',
        });
        continue;
      }

      // Check duplicate email or phone in DB
      const existing = await LeadModel.findOne({
        $or: [{ email: email.toLowerCase().trim() }, { phone: phone.trim() }],
        isArchived: false,
      });

      if (existing) {
        failedCount++;
        errors.push({
          rowNumber,
          data: row,
          reason: `Duplicate record found with matching email (${email}) or phone (${phone})`,
        });
        continue;
      }

      try {
        const lead = new LeadModel({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          city: city?.trim() || '',
          state: state?.trim() || '',
          targetCountry: targetCountry?.trim() || 'USA',
          targetCourse: targetCourse?.trim() || '',
          source: source.trim(),
          status: 'NEW',
          stage: 'LEAD_CAPTURED',
        });

        await lead.save();
        successfulCount++;
        createdRecords.push(lead);
      } catch (err: any) {
        failedCount++;
        errors.push({
          rowNumber,
          data: row,
          reason: err.message || 'Database validation error',
        });
      }
    }

    return {
      totalRows: rows.length,
      successfulRows: successfulCount,
      failedRows: failedCount,
      errors,
      createdRecords,
    };
  }

  /**
   * Export CRM Lead/Student records to CSV
   */
  public static async exportLeadsToCSV(): Promise<string> {
    const leads = await LeadModel.find({ isArchived: false }).sort({ createdAt: -1 });

    const headers = [
      'Name',
      'Email',
      'Phone',
      'City',
      'State',
      'Country',
      'Target Country',
      'Target Course',
      'Stage',
      'Status',
      'Source',
      'Created At',
    ];

    const rows = leads.map((l) => [
      `"${l.name || ''}"`,
      `"${l.email || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.city || ''}"`,
      `"${l.state || ''}"`,
      `"${l.country || ''}"`,
      `"${l.targetCountry || ''}"`,
      `"${l.targetCourse || ''}"`,
      `"${l.stage || ''}"`,
      `"${l.status || ''}"`,
      `"${l.source || ''}"`,
      `"${l.createdAt ? new Date(l.createdAt).toISOString() : ''}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
