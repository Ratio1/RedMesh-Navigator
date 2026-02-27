import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Job, WorkerReport, LlmAnalysis } from '@/lib/api/types';
import { RUN_MODE, JOB_STATUS } from '@/lib/api/constants';
import { probeResultToString, normalizeProbeResult } from '@/lib/utils/probeResult';
import type { AggregatedPortsData, WorkerActivityItem } from '@/app/dashboard/jobs/[jobId]/types';

type RGB = [number, number, number];

interface PDFColors {
  primary: RGB;
  secondary: RGB;
  danger: RGB;
  warning: RGB;
  success: RGB;
  info: RGB;
  text: RGB;
  muted: RGB;
  light: RGB;
}

function formatDate(value?: string): string {
  if (!value) return '--';
  try {
    return format(new Date(value), 'MMM d, yyyy HH:mm:ss');
  } catch {
    return value;
  }
}

function formatDuration(seconds?: number): string {
  if (seconds == null || seconds < 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

interface GenerateJobReportParams {
  job: Job;
  reports: Record<string, WorkerReport>;
  aggregatedPorts: AggregatedPortsData;
  workerActivity: WorkerActivityItem[];
  llmAnalyses?: Record<number, LlmAnalysis>;
  quickSummaries?: Record<number, LlmAnalysis>;
}

/**
 * Generates a PDF report for a job scan.
 */
export function generateJobReport({
  job,
  reports,
  aggregatedPorts,
  workerActivity,
  llmAnalyses,
  quickSummaries,
}: GenerateJobReportParams): void {
  const doc = new jsPDF();
  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const colors: PDFColors = {
    primary: [214, 40, 40],     // brand-primary #d62828
    secondary: [71, 85, 105],   // slate-500
    danger: [239, 68, 68],      // red-500
    warning: [245, 158, 11],    // amber-500
    success: [34, 197, 94],     // green-500
    info: [59, 130, 246],       // blue-500
    text: [30, 41, 59],         // slate-800
    muted: [100, 116, 139],     // slate-500
    light: [241, 245, 249],     // slate-100
  };

  // Helper functions
  const checkPageBreak = (needed: number): boolean => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  const addHeader = (text: string, size: number = 12, color: RGB = colors.primary): void => {
    checkPageBreak(15);
    doc.setFontSize(size);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(text, margin, y);
    y += size * 0.5 + 2;
    doc.setTextColor(...colors.text);
  };

  const addText = (text: string, indent: number = 0, bold: boolean = false): void => {
    doc.setFontSize(9);
    doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...colors.text);
    const wrapped = doc.splitTextToSize(text, contentWidth - indent);
    wrapped.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin + indent, y);
      y += 4.5;
    });
  };

  const addLabelValue = (label: string, value: string, indent: number = 0): void => {
    checkPageBreak(5);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...colors.muted);
    doc.text(label + ':', margin + indent, y);
    const labelWidth = doc.getTextWidth(label + ': ');
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const valueWrapped = doc.splitTextToSize(value, contentWidth - indent - labelWidth - 5);
    doc.text(valueWrapped[0] || '—', margin + indent + labelWidth, y);
    y += 4.5;
    if (valueWrapped.length > 1) {
      valueWrapped.slice(1).forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin + indent + labelWidth, y);
        y += 4.5;
      });
    }
  };

  const addDivider = (): void => {
    y += 3;
    checkPageBreak(5);
    doc.setDrawColor(...colors.light);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  /**
   * Render markdown text content to PDF with inline formatting support.
   * Handles headers, lists, code blocks, bold, italic, and inline code.
   */
  const renderMarkdownContent = (content: string, baseIndent: number = 0): void => {
    const leftMargin = margin + baseIndent;
    const availableWidth = contentWidth - baseIndent;

    /**
     * Render a single line with inline markdown formatting (bold, code, normal).
     * Splits `**bold**` and `` `code` `` into segments rendered with proper fonts.
     */
    const renderInlineLine = (rawLine: string, x: number, maxWidth: number, fontSize: number = 8): void => {
      // Parse into segments: { text, style: 'normal' | 'bold' | 'code' }
      type Segment = { text: string; style: 'normal' | 'bold' | 'code' };
      const segments: Segment[] = [];
      // Match **bold** or `code` or plain text
      const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(rawLine)) !== null) {
        if (match.index > lastIndex) {
          segments.push({ text: rawLine.slice(lastIndex, match.index), style: 'normal' });
        }
        if (match[2] !== undefined) {
          segments.push({ text: match[2], style: 'bold' });
        } else if (match[3] !== undefined) {
          segments.push({ text: match[3], style: 'code' });
        }
        lastIndex = re.lastIndex;
      }
      if (lastIndex < rawLine.length) {
        segments.push({ text: rawLine.slice(lastIndex), style: 'normal' });
      }
      if (segments.length === 0) return;

      // Check if everything fits on one line
      let totalWidth = 0;
      for (const seg of segments) {
        doc.setFont(seg.style === 'code' ? 'Courier' : 'Helvetica', seg.style === 'bold' ? 'bold' : 'normal');
        doc.setFontSize(seg.style === 'code' ? fontSize - 1 : fontSize);
        totalWidth += doc.getTextWidth(seg.text);
      }

      if (totalWidth <= maxWidth) {
        // Render inline — all segments on one line
        let cx = x;
        for (const seg of segments) {
          doc.setFont(seg.style === 'code' ? 'Courier' : 'Helvetica', seg.style === 'bold' ? 'bold' : 'normal');
          doc.setFontSize(seg.style === 'code' ? fontSize - 1 : fontSize);
          doc.setTextColor(...colors.text);
          doc.text(seg.text, cx, y);
          cx += doc.getTextWidth(seg.text);
        }
        y += fontSize * 0.5;
      } else {
        // Fallback: join as plain text (strip markers), wrap normally
        const plain = rawLine.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(...colors.text);
        const wrapped = doc.splitTextToSize(plain, maxWidth);
        wrapped.forEach((wl: string) => {
          checkPageBreak(4);
          doc.text(wl, x, y);
          y += 4;
        });
      }
    };

    const lines = content.split('\n');
    let inCodeBlock = false;
    let inList = false;

    for (const line of lines) {
      // Code block handling
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          y += 2;
          doc.setFillColor(30, 41, 59); // slate-800
        }
        continue;
      }

      if (inCodeBlock) {
        checkPageBreak(5);
        doc.setFillColor(30, 41, 59);
        doc.rect(leftMargin, y - 3, availableWidth, 5, 'F');
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(200, 200, 200);
        const wrapped = doc.splitTextToSize(line, availableWidth - 10);
        wrapped.forEach((wl: string) => {
          doc.text(wl, leftMargin + 5, y);
          y += 4;
        });
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        checkPageBreak(12);
        y += 4;
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(...colors.text);
        const text = line.slice(2).replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(text, availableWidth);
        wrapped.forEach((wl: string) => {
          doc.text(wl, leftMargin, y);
          y += 6;
        });
        y += 2;
        continue;
      }
      if (line.startsWith('## ')) {
        checkPageBreak(10);
        y += 3;
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        const text = line.slice(3).replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(text, availableWidth);
        wrapped.forEach((wl: string) => {
          doc.text(wl, leftMargin, y);
          y += 5;
        });
        // Underline
        doc.setDrawColor(...colors.light);
        doc.setLineWidth(0.3);
        doc.line(leftMargin, y, leftMargin + availableWidth, y);
        y += 4;
        continue;
      }
      if (line.startsWith('### ')) {
        checkPageBreak(8);
        y += 2;
        doc.setFontSize(10);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(...colors.secondary);
        const text = line.slice(4).replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(text, availableWidth);
        wrapped.forEach((wl: string) => {
          doc.text(wl, leftMargin, y);
          y += 4.5;
        });
        y += 1;
        continue;
      }
      if (line.startsWith('#### ')) {
        checkPageBreak(7);
        y += 1;
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(...colors.text);
        const text = line.slice(5).replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(text, availableWidth);
        wrapped.forEach((wl: string) => {
          doc.text(wl, leftMargin, y);
          y += 4;
        });
        continue;
      }

      // List items
      if (line.match(/^[-*]\s/)) {
        checkPageBreak(5);
        inList = true;
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(...colors.text);

        // Check for bold text in list item
        let text = line.slice(2);
        const boldMatch = text.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
        if (boldMatch) {
          doc.setFont('Helvetica', 'bold');
          doc.text('• ' + boldMatch[1] + ':', leftMargin + 5, y);
          const labelWidth = doc.getTextWidth('• ' + boldMatch[1] + ': ');
          doc.setFont('Helvetica', 'normal');
          if (boldMatch[2]) {
            const wrapped = doc.splitTextToSize(boldMatch[2], availableWidth - 10 - labelWidth);
            wrapped.forEach((wl: string, idx: number) => {
              if (idx === 0) {
                doc.text(wl, leftMargin + 5 + labelWidth, y);
              } else {
                y += 4;
                checkPageBreak(4);
                doc.text(wl, leftMargin + 10, y);
              }
            });
          }
        } else {
          text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
          const wrapped = doc.splitTextToSize('• ' + text, availableWidth - 5);
          wrapped.forEach((wl: string, idx: number) => {
            if (idx > 0) {
              checkPageBreak(4);
            }
            doc.text(wl, leftMargin + 5, y);
            y += 4;
          });
          y -= 4; // Adjust for loop increment
        }
        y += 4;
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        inList = false;
        y += 3;
        continue;
      }

      // Regular paragraph — render with inline bold/code formatting
      checkPageBreak(5);
      renderInlineLine(line, leftMargin, availableWidth);
      y += 1;
    }
  };

  /**
   * Render LLM analysis section: chrome header + markdown content
   */
  const renderLlmAnalysis = (analysis: LlmAnalysis, passNr?: number): void => {
    // Section header with AI icon indicator
    checkPageBreak(40);

    // Header bar
    doc.setFillColor(147, 51, 234); // purple-600
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
    y += 4;

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    const title = passNr !== undefined ? `AI Security Analysis (Pass #${passNr})` : 'AI Security Analysis';
    doc.text(title, margin + 5, y + 5);
    y += 18;

    // Description box
    doc.setFillColor(243, 232, 255); // purple-100
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
    y += 4;
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(107, 33, 168); // purple-700
    const description = 'This AI-generated security assessment is automatically created for completed scans. ' +
      'It analyzes discovered services, open ports, and potential vulnerabilities to provide actionable insights.';
    const descWrapped = doc.splitTextToSize(description, contentWidth - 10);
    descWrapped.forEach((line: string) => {
      doc.text(line, margin + 5, y + 3);
      y += 4;
    });
    y += 6;

    // Metadata bar
    doc.setFillColor(...colors.light);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    y += 4;

    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    const metaInfo = [
      `Type: ${analysis.analysisType.replace(/_/g, ' ')}`,
      `Open Ports: ${analysis.scanSummary.openPorts}`,
      `Generated: ${formatDate(analysis.createdAt)}`,
    ];
    doc.text(metaInfo.join('  |  '), margin + 5, y + 4);
    y += 15;

    renderMarkdownContent(analysis.content);

    y += 5;
    addDivider();
  };

  // === 1. COVER PAGE + REPORT CONTEXT ===
  // Red banner
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('Helvetica', 'bold');
  doc.text('RedMesh Scan Report', margin, 28);

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, margin, 38);

  y = 55;

  // Task Overview Box
  doc.setFillColor(...colors.light);
  doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
  y += 8;

  doc.setTextColor(...colors.text);
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'bold');
  doc.text(job.displayName, margin + 5, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...colors.muted);
  doc.text(`Target: ${job.target}`, margin + 5, y);
  y += 5;
  doc.text(`Job ID: ${job.id}`, margin + 5, y);

  y += 15;

  // Who requested
  if (job.initiatorAlias) {
    addLabelValue('Requested By', job.initiatorAlias);
  }
  if (job.initiatorAddress) {
    addLabelValue('Launcher Address', job.initiatorAddress);
  } else {
    addLabelValue('Initiator', job.initiator);
  }

  // What task
  if (job.summary && job.summary !== 'RedMesh scan job') {
    addLabelValue('Description', job.summary);
  }

  // When reported
  addLabelValue('Report Produced', formatDate(new Date().toISOString()));

  // Duration
  if (job.totalDuration != null) {
    addLabelValue('Duration', formatDuration(job.totalDuration));
  }
  y += 5;

  // When executed — Visual Timeline (circles + lines)
  if (job.timeline.length > 0) {
    y += 2;
    job.timeline.forEach((entry, idx) => {
      checkPageBreak(10);
      doc.setFillColor(...colors.primary);
      doc.circle(margin + 3, y - 1, 2, 'F');
      if (idx < job.timeline.length - 1) {
        doc.setDrawColor(...colors.light);
        doc.setLineWidth(1);
        doc.line(margin + 3, y + 2, margin + 3, y + 10);
      }
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(...colors.text);
      doc.text(entry.label, margin + 10, y);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(...colors.muted);
      doc.text(formatDate(entry.date), margin + 10, y + 4);
      y += 12;
    });
  }

  addDivider();

  // === 3. SUMMARY STATISTICS ===
  addHeader('Summary Statistics', 11);
  y += 2;

  const reportsList = Object.values(reports);
  const totalOpenPorts = aggregatedPorts.ports.length;
  const totalPortsScanned = reportsList.reduce((sum, r) => sum + r.portsScanned, 0);
  const reportsWithDetails = Object.entries(reports).filter(([, r]) => Object.keys(r.serviceInfo).length > 0 || Object.keys(r.webTestsInfo).length > 0);
  const workersWithFindings = reportsList.filter(r => r.openPorts.length > 0 || Object.keys(r.serviceInfo).length > 0).length;

  const stats = [
    { label: 'Workers', value: String(workerActivity.length || job.workerCount) },
    { label: 'Port Range', value: `${job.portRange?.start ?? 1} - ${job.portRange?.end ?? 65535}` },
    { label: 'Ports Scanned', value: String(totalPortsScanned) },
    { label: 'Open Ports Found', value: String(totalOpenPorts) },
    { label: 'Workers with Findings', value: String(workersWithFindings) },
  ];

  doc.setFillColor(...colors.light);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
  y += 5;

  const statWidth = contentWidth / stats.length;
  stats.forEach((stat, i) => {
    const x = margin + i * statWidth + statWidth / 2;
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(stat.value, x, y + 4, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text(stat.label, x, y + 10, { align: 'center' });
  });

  y += 25;

  // === 3b. QUICK AI SUMMARY (after stats, before full analysis) ===
  if (quickSummaries) {
    let bestQuickSummary: LlmAnalysis | undefined;

    if (job.runMode === RUN_MODE.SINGLEPASS) {
      bestQuickSummary = quickSummaries[1];
    } else {
      const passNumbers = Object.keys(quickSummaries).map(Number).sort((a, b) => b - a);
      if (passNumbers.length > 0) {
        bestQuickSummary = quickSummaries[passNumbers[0]];
      }
    }

    if (bestQuickSummary?.content) {
      checkPageBreak(20);

      // Header bar
      doc.setFillColor(...colors.primary);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.text('AI Summary', margin + 5, y + 7);
      y += 14;

      // Content with left accent bar
      const accentX = margin;
      const contentStartY = y;
      renderMarkdownContent(bestQuickSummary.content, 5);
      // Draw red accent line along the left edge of the content
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(1.5);
      doc.line(accentX, contentStartY - 2, accentX, y);
      y += 3;
    }
  }

  addDivider();

  // === 4. AI SECURITY ANALYSIS (promoted — singlepass: pass 1, continuous: latest pass) ===
  if (llmAnalyses) {
    let bestAnalysis: LlmAnalysis | undefined;
    let bestPassNr: number | undefined;

    if (job.runMode === RUN_MODE.SINGLEPASS) {
      if (llmAnalyses[1]) {
        bestAnalysis = llmAnalyses[1];
        bestPassNr = 1;
      }
    } else {
      // Continuous: pick the latest (highest) pass number
      const passNumbers = Object.keys(llmAnalyses).map(Number).sort((a, b) => b - a);
      if (passNumbers.length > 0) {
        bestPassNr = passNumbers[0];
        bestAnalysis = llmAnalyses[bestPassNr];
      }
    }

    if (bestAnalysis) {
      doc.addPage();
      y = 20;
      renderLlmAnalysis(bestAnalysis, bestPassNr);
    }
  }

  // Build CID → nodeAddress lookup from passHistory
  const cidToNodeAddress = new Map<string, string>();
  if (job.passHistory) {
    for (const pass of job.passHistory) {
      for (const [nodeAddr, cid] of Object.entries(pass.reports)) {
        cidToNodeAddress.set(cid, nodeAddr);
      }
    }
  }

  const truncateAddress = (addr: string) =>
    addr.length > 20 ? `${addr.slice(0, 8)}...${addr.slice(-8)}` : addr;

  // === 5. DETAILED FINDINGS (new page) ===
  const hasFindings = totalOpenPorts > 0 || job.aggregate || reportsWithDetails.length > 0;
  if (hasFindings) {
    doc.addPage();
    y = 20;
  }

  // Open Ports Section
  if (totalOpenPorts > 0) {
    addHeader('Discovered Open Ports', 14, colors.primary);
    y += 2;

    const sortedPorts = [...aggregatedPorts.ports].sort((a, b) => a - b);

    doc.setFillColor(254, 226, 226);
    doc.roundedRect(margin, y, contentWidth, 15, 2, 2, 'F');
    y += 5;
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    const portsText = sortedPorts.join(', ');
    const wrappedPorts = doc.splitTextToSize(portsText, contentWidth - 10);
    wrappedPorts.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin + 5, y);
      y += 4.5;
    });
    y += 4;
    addDivider();
  }

  // Aggregate Findings
  if (job.aggregate) {
    addHeader('Aggregate Findings', 12);
    y += 2;

    if (Object.keys(job.aggregate.serviceSummary).length > 0) {
      addHeader('Service Summary', 10, colors.secondary);
      Object.entries(job.aggregate.serviceSummary).forEach(([port, info]) => {
        addLabelValue(`Port ${port}`, String(info), 5);
      });
      y += 3;
    }

    if (Object.keys(job.aggregate.webFindings).length > 0) {
      addHeader('Web Findings', 10, colors.secondary);
      Object.entries(job.aggregate.webFindings).forEach(([key, finding]) => {
        addLabelValue(key, String(finding), 5);
      });
      y += 3;
    }

    addDivider();
  }

  // Detailed Worker Reports
  if (reportsWithDetails.length > 0) {
    addHeader('Detailed Worker Reports', 14, colors.primary);
    y += 5;

    reportsWithDetails.forEach(([cid, report], idx) => {
      checkPageBreak(50);

      const nodeAddress = cidToNodeAddress.get(cid) ?? cid;

      // Worker header
      doc.setFillColor(...colors.light);
      doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
      y += 5;

      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(...colors.text);
      doc.text(`Node: ${truncateAddress(nodeAddress)}`, margin + 5, y);

      // Status badge
      const workerStatusColor = report.done ? colors.primary : report.canceled ? colors.danger : colors.warning;
      doc.setFillColor(...workerStatusColor);
      doc.roundedRect(pageWidth - margin - 35, y - 4, 30, 7, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text(report.done ? 'DONE' : report.canceled ? 'CANCELED' : 'RUNNING', pageWidth - margin - 32, y);

      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.text(`Ports ${report.startPort}-${report.endPort} | ${report.portsScanned} scanned | ${report.openPorts.length} open`, margin + 5, y);
      y += 10;

      // Service Info
      if (Object.keys(report.serviceInfo).length > 0) {
        addHeader('Service Detection Results', 10, colors.primary);

        Object.entries(report.serviceInfo).forEach(([port, probes]) => {
          checkPageBreak(20);

          doc.setFontSize(9);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(...colors.primary);
          doc.text(`Port ${port}`, margin + 5, y);
          y += 5;

          Object.entries(probes as Record<string, unknown>).forEach(([probeName, result]) => {
            if (result === null || result === undefined) return;

            checkPageBreak(8);
            const normalized = normalizeProbeResult(result);
            const resultStr = normalized.lines.join('\n');
            const isVulnerability = normalized.hasVulnerability;
            const isError = normalized.hasError;

            doc.setFontSize(8);
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(...(isVulnerability ? colors.warning : isError ? colors.muted : colors.secondary));
            const cleanProbeName = probeName.replace(/^_service_info_/, '');
            doc.text(`${cleanProbeName}:`, margin + 10, y);

            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(...(isVulnerability ? colors.warning : isError ? [180, 180, 180] as RGB : colors.text));
            const wrappedResult = doc.splitTextToSize(resultStr, contentWidth - 50);
            wrappedResult.forEach((line: string, lineIdx: number) => {
              if (lineIdx === 0) {
                doc.text(line, margin + 10 + doc.getTextWidth(cleanProbeName + ': '), y);
              } else {
                checkPageBreak(4);
                y += 4;
                doc.text(line, margin + 15, y);
              }
            });
            y += 5;
          });
          y += 3;
        });
      }

      // Web Tests Info
      if (Object.keys(report.webTestsInfo).length > 0) {
        addHeader('Web Security Tests', 10, [59, 130, 246]);

        Object.entries(report.webTestsInfo).forEach(([port, tests]) => {
          checkPageBreak(20);

          doc.setFontSize(9);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text(`Port ${port}`, margin + 5, y);
          y += 5;

          Object.entries(tests as Record<string, unknown>).forEach(([testName, result]) => {
            if (result === null || result === undefined) return;

            checkPageBreak(8);
            const normalized = normalizeProbeResult(result);
            const resultStr = normalized.lines.join('\n');
            const isError = normalized.hasError;
            const isVulnerable = normalized.hasVulnerability;

            doc.setFontSize(8);
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(...(isVulnerable ? colors.danger : isError ? colors.muted : colors.secondary));
            const cleanTestName = testName.replace(/^_web_test_/, '');
            doc.text(`${cleanTestName}:`, margin + 10, y);

            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(...(isVulnerable ? colors.danger : isError ? [180, 180, 180] as RGB : colors.text));
            const wrappedResult = doc.splitTextToSize(resultStr, contentWidth - 50);
            wrappedResult.forEach((line: string, lineIdx: number) => {
              if (lineIdx === 0) {
                doc.text(line, margin + 10 + doc.getTextWidth(cleanTestName + ': '), y);
              } else {
                checkPageBreak(4);
                y += 4;
                doc.text(line, margin + 15, y);
              }
            });
            y += 5;
          });
          y += 3;
        });
      }

      // Completed tests summary
      if (report.completedTests && report.completedTests.length > 0) {
        checkPageBreak(15);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(...colors.muted);
        doc.text(`Completed Tests (${report.completedTests.length}):`, margin + 5, y);
        y += 4;
        doc.setFont('Helvetica', 'normal');
        const testsText = report.completedTests.map(t => t.replace(/^_/, '')).join(', ');
        const wrappedTests = doc.splitTextToSize(testsText, contentWidth - 10);
        wrappedTests.forEach((line: string) => {
          checkPageBreak(4);
          doc.text(line, margin + 5, y);
          y += 4;
        });
      }

      y += 10;

      if (idx < reportsWithDetails.length - 1) {
        addDivider();
      }
    });
  }

  // === FOOTER ===
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text(`RedMesh Report - ${job.displayName}`, margin, pageHeight - 10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
  }

  doc.save(`redmesh-report-${job.id.slice(0, 8)}.pdf`);
}
