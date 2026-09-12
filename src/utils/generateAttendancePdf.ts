import { Client } from '../types';

interface ClientReportStat {
  client: Client;
  present: number;
  absent: number;
  totalDays: number;
  rate: number;
}

interface PdfReportOptions {
  gymName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  totalPresentCount: number;
  avgDailyPresence: number;
  clientStats: ClientReportStat[];
  mostRegular: ClientReportStat[];
  highestWeekday: { name: string; avg: number };
  lowestWeekday: { name: string; avg: number };
  gymDays: number;
  category?: 'all' | 'active';
}

function escapePdfText(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/[•·]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

interface PdfPage {
  commands: string[];
}

class SimplePdfDocument {
  private pages: PdfPage[] = [];
  private currentPage: PdfPage | null = null;
  public readonly width = 595.28; // A4 pt
  public readonly height = 841.89; // A4 pt

  addPage(): PdfPage {
    const page: PdfPage = { commands: [] };
    this.pages.push(page);
    this.currentPage = page;
    return page;
  }

  drawText(
    text: string,
    x: number,
    y: number,
    font: 'F1' | 'F2' = 'F1',
    size: number = 10,
    r = 0,
    g = 0,
    b = 0
  ) {
    if (!this.currentPage) this.addPage();
    const clean = escapePdfText(text);
    this.currentPage!.commands.push(
      `BT /${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${clean}) Tj ET`
    );
  }

  drawRightText(
    text: string,
    rightX: number,
    y: number,
    font: 'F1' | 'F2' = 'F1',
    size: number = 10,
    r = 0,
    g = 0,
    b = 0
  ) {
    const charWidth = (font === 'F2' ? 0.58 : 0.51) * size;
    const textWidth = text.length * charWidth;
    this.drawText(text, rightX - textWidth, y, font, size, r, g, b);
  }

  drawCenterText(
    text: string,
    centerX: number,
    y: number,
    font: 'F1' | 'F2' = 'F1',
    size: number = 10,
    r = 0,
    g = 0,
    b = 0
  ) {
    const charWidth = (font === 'F2' ? 0.58 : 0.51) * size;
    const textWidth = text.length * charWidth;
    this.drawText(text, centerX - textWidth / 2, y, font, size, r, g, b);
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number = 1,
    r = 0.1,
    g = 0.1,
    b = 0.1
  ) {
    if (!this.currentPage) this.addPage();
    this.currentPage!.commands.push(
      `${width} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
    );
  }

  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    fillR = 0.96,
    fillG = 0.96,
    fillB = 0.96
  ) {
    if (!this.currentPage) this.addPage();
    this.currentPage!.commands.push(
      `${fillR.toFixed(3)} ${fillG.toFixed(3)} ${fillB.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
    );
  }

  build(): Blob {
    const pageCount = this.pages.length;
    const objects: string[] = [];
    const pageObjNums: number[] = [];

    for (let i = 0; i < pageCount; i++) {
      pageObjNums.push(3 + i * 2);
    }

    // Obj 1: Catalog
    objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`;

    // Obj 2: Pages
    const kidsStr = pageObjNums.map((n) => `${n} 0 R`).join(' ');
    objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageCount} >>\nendobj`;

    // Standard Built-in Fonts: F1 = Helvetica, F2 = Helvetica-Bold
    const fontRes = `/Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >>`;

    for (let i = 0; i < pageCount; i++) {
      const pageNum = pageObjNums[i];
      const contentNum = pageNum + 1;
      const streamContent = this.pages[i].commands.join('\n');
      const streamBytes = new TextEncoder().encode(streamContent);

      objects[pageNum] = `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << ${fontRes} >> /Contents ${contentNum} 0 R >>\nendobj`;
      objects[contentNum] = `${contentNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj`;
    }

    // Assemble PDF
    const pdfHeader = `%PDF-1.4\n%âãÏÓ\n`;
    const offsets: number[] = [0];
    let currentOffset = new TextEncoder().encode(pdfHeader).length;
    const bodyParts: string[] = [pdfHeader];

    for (let i = 1; i < objects.length; i++) {
      offsets[i] = currentOffset;
      const objStr = objects[i] + '\n';
      bodyParts.push(objStr);
      currentOffset += new TextEncoder().encode(objStr).length;
    }

    const xrefOffset = currentOffset;
    let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
      xref += String(offsets[i]).padStart(10, '0') + ` 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    bodyParts.push(xref, trailer);

    const fullText = bodyParts.join('');
    const fullBytes = new TextEncoder().encode(fullText);
    return new Blob([fullBytes], { type: 'application/pdf' });
  }
}

export function generateAndDownloadAttendancePdf(opts: PdfReportOptions): string {
  const doc = new SimplePdfDocument();
  const leftX = 40;
  const rightX = 555;
  const contentWidth = rightX - leftX;

  // Format date helper DD/MM/YYYY
  const formatDMY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    return dateStr;
  };

  const gymUpper = (opts.gymName || 'Matrx Den 640').toUpperCase();

  // =========================================================================
  // PAGE 1: EXECUTIVE ANALYTICAL REPORT
  // =========================================================================
  doc.addPage();

  // Header Title
  doc.drawText(gymUpper, leftX, 790, 'F2', 20, 0, 0, 0);
  doc.drawText('ATTENDANCE & ENGAGEMENT EXECUTIVE REPORT', leftX, 772, 'F2', 11, 0.09, 0.4, 0.2);

  // Subtitle / Date details
  const dateRangeStr = `Date Period: ${formatDMY(opts.startDate)} to ${formatDMY(opts.endDate)}`;
  doc.drawText(dateRangeStr, leftX, 752, 'F1', 10, 0.2, 0.2, 0.2);

  const durationStr = `Total Operating Days: ${opts.durationDays} (Excl. Sundays)`;
  doc.drawRightText(durationStr, rightX, 752, 'F2', 10, 0.1, 0.1, 0.1);

  // Top dividing rule
  doc.drawLine(leftX, 742, rightX, 742, 1.5, 0.1, 0.1, 0.1);

  // KEY METRICS BOXES (3 Columns)
  const metricY = 665;
  const colWidth = (contentWidth - 24) / 3;

  // Col 1: Total Check-Ins
  doc.drawRect(leftX, metricY, colWidth, 65, 0.97, 0.98, 0.99);
  doc.drawLine(leftX, metricY, leftX, metricY + 65, 3.5, 0.05, 0.09, 0.16);
  doc.drawText('TOTAL CHECK-INS', leftX + 12, metricY + 48, 'F2', 9, 0.25, 0.3, 0.35);
  doc.drawText(String(opts.totalPresentCount), leftX + 12, metricY + 22, 'F2', 22, 0, 0, 0);
  doc.drawText('Recorded attendance entries', leftX + 12, metricY + 8, 'F1', 8, 0.4, 0.45, 0.5);

  // Col 2: Avg Daily Attendance
  const col2X = leftX + colWidth + 12;
  doc.drawRect(col2X, metricY, colWidth, 65, 0.95, 0.98, 0.95);
  doc.drawLine(col2X, metricY, col2X, metricY + 65, 3.5, 0.09, 0.4, 0.2);
  doc.drawText('AVG DAILY ATTENDANCE', col2X + 12, metricY + 48, 'F2', 9, 0.09, 0.4, 0.2);
  doc.drawText(`${opts.avgDailyPresence} /day`, col2X + 12, metricY + 22, 'F2', 22, 0.09, 0.4, 0.2);
  doc.drawText(`Across ${opts.gymDays} active logged days`, col2X + 12, metricY + 8, 'F1', 8, 0.3, 0.4, 0.3);

  // Col 3: Total Members / Active Clients in Report
  const col3X = col2X + colWidth + 12;
  doc.drawRect(col3X, metricY, colWidth, 65, 0.97, 0.98, 0.99);
  doc.drawLine(col3X, metricY, col3X, metricY + 65, 3.5, 0.05, 0.09, 0.16);
  const card3Label = opts.category === 'active' ? 'ACTIVE CLIENTS IN REPORT' : 'TOTAL MEMBERS IN REPORT';
  doc.drawText(card3Label, col3X + 12, metricY + 48, 'F2', 8.5, 0.25, 0.3, 0.35);
  doc.drawText(String(opts.clientStats.length), col3X + 12, metricY + 22, 'F2', 22, 0, 0, 0);
  doc.drawText(opts.category === 'active' ? 'Attended at least 1 day' : 'Registered gym clients', col3X + 12, metricY + 8, 'F1', 8, 0.4, 0.45, 0.5);

  // Section 2: Two Columns (Most Regular Members & Weekday Trends)
  const sec2Y = 620;
  const halfColWidth = (contentWidth - 24) / 2;

  // Left Section: Top Regular Turnout
  doc.drawText('MOST REGULAR MEMBERS (TOP TURNOUT)', leftX, sec2Y, 'F2', 11, 0.05, 0.09, 0.16);
  doc.drawLine(leftX, sec2Y - 6, leftX + halfColWidth, sec2Y - 6, 1.5, 0.05, 0.09, 0.16);

  let topMemberY = sec2Y - 24;
  const regularSlice = opts.mostRegular.slice(0, 10);
  if (regularSlice.length > 0) {
    regularSlice.forEach((stat, idx) => {
      const memNum = stat.client.membership_number ? ` (#${stat.client.membership_number})` : '';
      const nameText = `${idx + 1}. ${stat.client.name}${memNum}`;
      doc.drawText(nameText, leftX, topMemberY, 'F2', 9.5, 0.1, 0.15, 0.2);
      const statText = `${stat.rate}% (${stat.present} days)`;
      doc.drawRightText(statText, leftX + halfColWidth, topMemberY, 'F2', 9.5, 0.09, 0.4, 0.2);
      doc.drawLine(leftX, topMemberY - 4, leftX + halfColWidth, topMemberY - 4, 0.5, 0.9, 0.92, 0.94);
      topMemberY -= 20;
    });
  } else {
    doc.drawText('No attendance logged in this range.', leftX, topMemberY, 'F1', 10, 0.5, 0.5, 0.5);
  }

  // Right Section: Weekday Patterns & Report Summary
  const rightColX = leftX + halfColWidth + 24;
  doc.drawText('WEEKDAY ATTENDANCE PATTERNS', rightColX, sec2Y, 'F2', 11, 0.05, 0.09, 0.16);
  doc.drawLine(rightColX, sec2Y - 6, rightX, sec2Y - 6, 1.5, 0.05, 0.09, 0.16);

  let patternY = sec2Y - 24;
  doc.drawText('Highest Present Weekday:', rightColX, patternY, 'F2', 10, 0.2, 0.25, 0.3);
  doc.drawRightText(`${opts.highestWeekday.name} (Avg: ${opts.highestWeekday.avg})`, rightX, patternY, 'F2', 10.5, 0.09, 0.4, 0.2);
  doc.drawLine(rightColX, patternY - 6, rightX, patternY - 6, 0.5, 0.9, 0.92, 0.94);

  patternY -= 26;
  doc.drawText('Lowest Present Weekday:', rightColX, patternY, 'F2', 10, 0.2, 0.25, 0.3);
  doc.drawRightText(`${opts.lowestWeekday.name} (Avg: ${opts.lowestWeekday.avg})`, rightX, patternY, 'F2', 10.5, 0.6, 0.1, 0.1);
  doc.drawLine(rightColX, patternY - 6, rightX, patternY - 6, 0.5, 0.9, 0.92, 0.94);

  patternY -= 32;
  doc.drawText('Executive Summary & Notes:', rightColX, patternY, 'F2', 10, 0.1, 0.15, 0.2);
  patternY -= 16;
  doc.drawText('This analytical report provides an executive overview of gym engagement,', rightColX, patternY, 'F1', 8.5, 0.3, 0.35, 0.4);
  patternY -= 13;
  doc.drawText('daily attendance volume, and consistency during the selected duration.', rightColX, patternY, 'F1', 8.5, 0.3, 0.35, 0.4);
  patternY -= 13;
  doc.drawText('Sundays are excluded from the operating duration. The complete member', rightColX, patternY, 'F1', 8.5, 0.3, 0.35, 0.4);
  patternY -= 13;
  doc.drawText('attendance roster begins on Page 2.', rightColX, patternY, 'F1', 8.5, 0.3, 0.35, 0.4);

  // Page 1 Footer
  doc.drawLine(leftX, 55, rightX, 55, 1, 0.2, 0.2, 0.2);
  doc.drawText('Zen Attendance System', leftX, 42, 'F2', 9, 0.2, 0.2, 0.2);
  doc.drawRightText('Page 1', rightX, 42, 'F2', 9, 0.2, 0.2, 0.2);

  // =========================================================================
  // PAGE 2+: FULL MEMBER ATTENDANCE TABLE (PAGINATED CLEANLY)
  // =========================================================================
  const rowsPerPage = 28;
  const totalStats = opts.clientStats.length;
  const totalRosterPages = Math.max(1, Math.ceil(totalStats / rowsPerPage));

  for (let pageIdx = 0; pageIdx < totalRosterPages; pageIdx++) {
    doc.addPage();
    const curPageNum = pageIdx + 2;

    // Header on Page 2+
    const catHeader = opts.category === 'active' ? ' (ACTIVE CLIENTS ONLY)' : '';
    doc.drawText(`${gymUpper} - MEMBER ATTENDANCE REPORT${catHeader}`, leftX, 795, 'F2', 13, 0, 0, 0);
    const subheader = `Period: ${formatDMY(opts.startDate)} to ${formatDMY(opts.endDate)}  |  Total Operating Days: ${opts.durationDays}`;
    doc.drawText(subheader, leftX, 780, 'F1', 9.5, 0.25, 0.3, 0.35);
    doc.drawLine(leftX, 770, rightX, 770, 1.5, 0.1, 0.1, 0.1);

    // Table Column Headers
    let tableY = 750;
    doc.drawRect(leftX, tableY - 4, contentWidth, 20, 0.94, 0.95, 0.96);
    doc.drawText('S.NO', leftX + 8, tableY, 'F2', 8.5, 0.1, 0.15, 0.2);
    doc.drawText('CLIENT NAME & MEMBERSHIP #', leftX + 42, tableY, 'F2', 9, 0.1, 0.15, 0.2);
    doc.drawCenterText('PRESENT', leftX + 310, tableY, 'F2', 9, 0.09, 0.4, 0.2);
    doc.drawCenterText('ABSENT', leftX + 410, tableY, 'F2', 9, 0.6, 0.1, 0.1);
    doc.drawRightText('ATTENDANCE %', rightX - 8, tableY, 'F2', 9, 0.1, 0.15, 0.2);
    doc.drawLine(leftX, tableY - 6, rightX, tableY - 6, 1, 0.2, 0.2, 0.2);

    tableY -= 22;

    const startIdx = pageIdx * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, totalStats);
    const pageRows = opts.clientStats.slice(startIdx, endIdx);

    pageRows.forEach((stat, rowIdx) => {
      const isEven = rowIdx % 2 === 0;
      if (isEven) {
        doc.drawRect(leftX, tableY - 4, contentWidth, 18, 0.98, 0.99, 0.99);
      }

      const serialNum = startIdx + rowIdx + 1;

      // 1. S.No
      doc.drawText(String(serialNum), leftX + 8, tableY, 'F1', 8.5, 0.35, 0.4, 0.45);

      // 2. Client Name & Number
      const memStr = stat.client.membership_number ? ` (#${stat.client.membership_number})` : '';
      const fullName = `${stat.client.name}${memStr}`;
      doc.drawText(fullName, leftX + 42, tableY, 'F2', 9, 0.05, 0.09, 0.15);

      // 3. Days Present
      doc.drawCenterText(`${stat.present} d`, leftX + 310, tableY, 'F2', 9.5, 0.09, 0.4, 0.2);

      // 4. Days Absent
      doc.drawCenterText(`${stat.absent} d`, leftX + 410, tableY, 'F2', 9.5, 0.6, 0.1, 0.1);

      // 5. Rate %
      const rateColor = stat.rate >= 50 ? { r: 0.09, g: 0.4, b: 0.2 } : { r: 0.6, g: 0.1, b: 0.1 };
      doc.drawRightText(`${stat.rate}%`, rightX - 8, tableY, 'F2', 9.5, rateColor.r, rateColor.g, rateColor.b);

      doc.drawLine(leftX, tableY - 5, rightX, tableY - 5, 0.3, 0.9, 0.92, 0.94);
      tableY -= 20;
    });

    // Page Footer
    doc.drawLine(leftX, 55, rightX, 55, 1, 0.2, 0.2, 0.2);
    doc.drawText('Zen Attendance System', leftX, 42, 'F2', 9, 0.2, 0.2, 0.2);
    const pageLabel = pageIdx === totalRosterPages - 1 ? `Page ${curPageNum} - End of Report` : `Page ${curPageNum}`;
    doc.drawRightText(pageLabel, rightX, 42, 'F2', 9, 0.2, 0.2, 0.2);
  }

  // Generate binary PDF Blob
  const blob = doc.build();

  // Create clean filename based on gym name and dates
  const gymClean = (opts.gymName || 'Matrx_Den_640').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const catTag = opts.category === 'active' ? '_Active_Members' : '_All_Members';
  const fileName = `${gymClean}${catTag}_Attendance_Report_${opts.startDate}_to_${opts.endDate}.pdf`;

  // Trigger real browser download into the user's Downloads folder
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return fileName;
}
