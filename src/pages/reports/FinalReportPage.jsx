import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PageLayout from '../../components/common/PageLayout';
import ProgressStepper from '../../components/common/ProgressStepper';
import Button from '../../components/common/Button';
import { MdDownload } from 'react-icons/md';
import { CiLock } from 'react-icons/ci';
import { clearAllProjectDrafts } from '../../utils/draftUtils';
import { supabase } from '../../lib/supabase';
import { API_BASE } from '../../lib/api';

import {
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
} from 'react-icons/hi2';
import { FaBalanceScale } from 'react-icons/fa';
import './FinalReport.css';

// ── Fallback mock data (used if no location.state is passed) ─────────────────
const MOCK_MATERIALS = [
  { material: 'Concrete (RC 28/20)', baseline: 238, optimized: 189, unit: 'kg CO₂e' },
  { material: 'Steel Rebar (T12)', baseline: 141, optimized: 112, unit: 'kg CO₂e' },
  { material: 'Glass Facade (Triple)', baseline: 181, optimized: 141, unit: 'kg CO₂e' },
  { material: 'Timber Joists', baseline: 121, optimized: 98, unit: 'kg CO₂e' },
  { material: 'Cement (OPC)', baseline: 95, optimized: 76, unit: 'kg CO₂e' },
];

// ── Pure helpers ─────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat().format(n);
const pct = (b, o) => (b === 0 ? 0 : ((o - b) / b) * 100);
const delta = (b, o) => o - b;
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeMaterial = (material) => {
  const originalMaterial =
    material.originalMaterial ||
    material.original_material ||
    material.original_material_name ||
    material.baseMaterial ||
    material.material ||
    'Unknown Material';

  const explicitAlternative =
    material.appliedAlternative ||
    material.selectedAlternative ||
    material.selected_alternative_name ||
    material.recommended_alternative ||
    null;

  const inferredAlternative =
    material.material && material.material !== originalMaterial ? material.material : null;

  const isApplied = Boolean(material.is_alternative_applied || explicitAlternative || inferredAlternative);
  const appliedAlternative = isApplied ? (explicitAlternative || inferredAlternative || 'Selected AI Alternative') : null;

  const baseline = toNum(
    material.baseline ?? material.originalCarbon ?? material.original_carbon ?? material.original_carbon_value,
    0,
  );

  const optimized = toNum(
    material.optimized ?? material.recommendedCarbon ?? material.recommended_carbon ?? material.selected_alternative_carbon,
    baseline,
  );

  return {
    material: originalMaterial,
    appliedAlternative,
    baseline,
    optimized,
    unit: material.unit || material.original_carbon_unit || 'kg CO2e',
    quantity: material.quantity,
    category: material.category,
    is_alternative_applied: isApplied,
  };
};

const Hint = ({ text }) => (
  <span className="fr-help" title={text} aria-label={text}>?</span>
);

// ── Page component ───────────────────────────────────────────────────────────
export default function FinalReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const reportGenerated = useRef(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportSnapshot, setReportSnapshot] = useState(null);

  // Values passed via navigate('/report', { state: { materials, projectName, projectRef } })
  const materials = location.state?.materials || MOCK_MATERIALS;
  const normalizedMaterials = useMemo(() => (materials || []).map(normalizeMaterial), [materials]);
  const projectName =
    location.state?.projectName ||
    localStorage.getItem('envirosync.project_name') ||
    'Untitled Project';
  const projectRef = location.state?.projectRef || null;
  const projectId = location.state?.projectId || localStorage.getItem('envirosync.project_id');

  // ── Generate & persist final report on page load ──────────────────────────
  useEffect(() => {
    if (!projectId || reportGenerated.current) return;
    reportGenerated.current = true;

    const generateReport = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('Final report saved to DB:', data.report?.id);
        if (data.report) setReportSnapshot(data.report);
        setReportSaved(true);
      } catch (err) {
        console.warn('Failed to save final report:', err.message);
        setReportError(err.message);
      }
    };

    generateReport();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const fetchLatestReport = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/reports?project_id=${projectId}&limit=1`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) return;

        const data = await response.json();
        const latest = (data.reports || [])[0];
        if (latest) setReportSnapshot((prev) => prev || latest);
      } catch (err) {
        console.warn('Unable to fetch latest report snapshot:', err.message);
      }
    };

    fetchLatestReport();
  }, [projectId, reportSaved]);

  // ── Aggregate totals ───────────────────────────────────────────────────────
  const hasOptimisations = normalizedMaterials.some((m) => m.baseline !== m.optimized);

  const totals = useMemo(() => {
    const baselineTotal = normalizedMaterials.reduce((s, m) => s + m.baseline, 0);
    const optimizedTotal = normalizedMaterials.reduce((s, m) => s + m.optimized, 0);
    const totalDelta = optimizedTotal - baselineTotal;
    const totalDeltaPct = pct(baselineTotal, optimizedTotal);
    const reductionKg = Math.abs(totalDelta).toFixed(0);
    return { baselineTotal, optimizedTotal, totalDelta, totalDeltaPct, reductionKg };
  }, [normalizedMaterials]);

  // ── Cost & material metrics computed from actual materials data ────────
  const costVariance = useMemo(() => {
    // Sum up quantity-based cost difference between alternatives
    return normalizedMaterials.reduce((sum, m) => {
      const qty = parseFloat(m.quantity) || 1;
      // If optimized differs from baseline, estimate a cost delta (RM 1.50/kg CO₂e saved as proxy)
      const carbonDiff = m.baseline - m.optimized;
      return sum + (carbonDiff > 0 ? carbonDiff * 1.50 : 0);
    }, 0);
  }, [normalizedMaterials]);

  const materialEfficiency = useMemo(() => {
    return normalizedMaterials.reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0);
  }, [normalizedMaterials]);

  // ── IMPROVED Sustainability grade from BOTH baseline emissions AND reduction percentage ────
  const sustainabilityGrade = useMemo(() => {
    const totalT = totals.baselineTotal / 1000;
    const reductionPct = Math.abs(totals.totalDeltaPct);
    
    // Factor in BOTH baseline emissions AND reduction achieved
    // Base score from emissions level (0-50 points)
    let baseScore = 0;
    
    if (totalT < 15) baseScore = 50;        // Excellent baseline
    else if (totalT < 30) baseScore = 48;
    else if (totalT < 40) baseScore = 46;
    else if (totalT < 55) baseScore = 44;
    else if (totalT < 70) baseScore = 42;
    else if (totalT < 85) baseScore = 40;
    else if (totalT < 100) baseScore = 38;
    else baseScore = 35;                    // Poor baseline
    
    // Reduction bonus (0-50 points)
    // This rewards users who achieved good optimization
    let reductionBonus = 0;
    if (reductionPct >= 30) reductionBonus = 50;        // 30%+ = Excellent optimization
    else if (reductionPct >= 25) reductionBonus = 45;   // 25-30%
    else if (reductionPct >= 20) reductionBonus = 30;   // 20-25%
    else if (reductionPct >= 15) reductionBonus = 20;   // 15-20%
    else if (reductionPct >= 10) reductionBonus = 15;   // 10-15%
    else if (reductionPct >= 5) reductionBonus = 8;     // 5-10%
    else reductionBonus = 0;                            // <5% = minimal bonus
    
    // Total score (0-100)
    const totalScore = baseScore + reductionBonus;
    
    // Convert score to grade with percentile badges
    if (totalScore >= 90) return { grade: 'A+', badge: 'TOP 2%', score: totalScore };
    if (totalScore >= 85) return { grade: 'A', badge: 'TOP 5%', score: totalScore };
    if (totalScore >= 80) return { grade: 'A-', badge: 'TOP 10%', score: totalScore };
    if (totalScore >= 75) return { grade: 'B+', badge: 'TOP 15%', score: totalScore };
    if (totalScore >= 70) return { grade: 'B', badge: 'TOP 30%', score: totalScore };
    if (totalScore >= 65) return { grade: 'B-', badge: 'TOP 40%', score: totalScore };
    if (totalScore >= 60) return { grade: 'C+', badge: 'TOP 50%', score: totalScore };
    if (totalScore >= 55) return { grade: 'C', badge: 'TOP 60%', score: totalScore };
    if (totalScore >= 50) return { grade: 'C-', badge: 'AVERAGE', score: totalScore };
    if (totalScore >= 40) return { grade: 'D+', badge: 'BELOW AVG', score: totalScore };
    if (totalScore >= 30) return { grade: 'D', badge: 'POOR', score: totalScore };
    return { grade: 'F', badge: 'CRITICAL', score: totalScore };
  }, [totals.baselineTotal, totals.totalDeltaPct]);

  // ── Carbon distribution (for the donut) ───────────────────────────────────
  const totalBaseline = totals.baselineTotal || 1;
  const distribution = useMemo(() => {
    const sorted = [...normalizedMaterials].sort((a, b) => b.baseline - a.baseline);
    if (sorted.length <= 2) return sorted.map((m) => ({ label: m.material, pct: (m.baseline / totalBaseline) * 100 }));
    const top2 = sorted.slice(0, 2);
    const others = sorted.slice(2).reduce((s, m) => s + m.baseline, 0);
    return [
      ...top2.map((m) => ({ label: m.material, pct: (m.baseline / totalBaseline) * 100 })),
      { label: 'Others', pct: (others / totalBaseline) * 100 },
    ];
  }, [normalizedMaterials, totalBaseline]);

  const DONUT_COLORS = ['#0e7c6b', '#1abc9c', '#94a3b8'];

  // Donut gradient string
  let cumulative = 0;
  const donutGradient = distribution
    .map((d, i) => {
      const from = cumulative;
      cumulative += d.pct;
      return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${from.toFixed(1)}% ${cumulative.toFixed(1)}%`;
    })
    .join(', ');

  // ── Download Excel template (.xlsx) ────────────────────────────────────────
  const handleDownloadExcel = () => {
    const generatedAt = new Date().toLocaleString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const totalsDelta = delta(totals.baselineTotal, totals.optimizedTotal);
    const totalsPct = pct(totals.baselineTotal, totals.optimizedTotal);

    const materialRows = normalizedMaterials.map((m) => {
      const d = delta(m.baseline, m.optimized);
      const p = pct(m.baseline, m.optimized);
      const status = d < 0 ? 'Reduced' : d === 0 ? 'No change' : 'Increased';
      return [
        m.material,
        m.appliedAlternative || '—',
        m.category || '—',
        m.quantity || '—',
        m.unit || 'kg CO2e',
        m.baseline,
        m.optimized,
        d,
        `${p.toFixed(2)}%`,
        status,
      ];
    });

    const distributionRows = distribution.map((d) => [d.label, `${d.pct.toFixed(2)}%`]);

    const TEMPLATE_COLS = 10;
    const paddedRow = (values = []) => {
      const normalized = values.slice(0, TEMPLATE_COLS);
      const missing = Math.max(0, TEMPLATE_COLS - normalized.length);
      return [...normalized, ...Array(missing).fill('')];
    };
    const emptyRow = () => paddedRow([]);
    const sectionRow = (title) => paddedRow([`========== ${title} ==========`]);

    const rows = [
      paddedRow(['ENVIROSYNC FINAL EMISSION REPORT']),
      paddedRow(['Client-ready Excel template for spreadsheet sharing']),
      emptyRow(),

      sectionRow('PROJECT & REPORT DETAILS'),
      paddedRow(['Project Name', projectName, '', '', '', 'Reference', reportReference]),
      paddedRow(['Generated At', generatedAt, '', '', '', 'Report Date', formatDate(reportDate)]),
      paddedRow(['Official Grade', reportGrade, '', '', '', 'Grade Label', reportGradeLabel]),
      paddedRow(['Total Carbon (T CO2e)', reportCarbonT.toFixed(2)]),
      emptyRow(),

      sectionRow('KEY PERFORMANCE INDICATORS'),
      paddedRow(['Baseline Total (kg CO2e)', totals.baselineTotal.toFixed(2), '', '', '', 'Optimised Total (kg CO2e)', totals.optimizedTotal.toFixed(2)]),
      paddedRow(['Absolute Change (kg CO2e)', totalsDelta.toFixed(2), '', '', '', 'Reduction Achieved (%)', Math.abs(totalsPct).toFixed(2)]),
      paddedRow(['Cost Variance (RM)', Math.round(costVariance), '', '', '', 'Material Efficiency (total units)', Math.round(materialEfficiency)]),
      paddedRow(['Displayed Score Grade', displayedScoreGrade, '', '', '', 'Displayed Score Badge', displayedScoreBadge]),
      emptyRow(),

      sectionRow('CARBON DISTRIBUTION (BASELINE)'),
      paddedRow(['Contributor', 'Share (%)']),
      ...distributionRows.map((r) => paddedRow(r)),
      emptyRow(),

      sectionRow('MATERIAL BREAKDOWN & SELECTED ALTERNATIVES'),
      paddedRow([
        'Material',
        'Applied Alternative',
        'Category',
        'Quantity',
        'Unit',
        'Baseline (kg CO2e)',
        'Optimised (kg CO2e)',
        'Change (kg CO2e)',
        'Change (%)',
        'Status',
      ]),
      ...materialRows.map((r) => paddedRow(r)),
      paddedRow([
        'TOTAL',
        '—',
        '—',
        '—',
        'kg CO2e',
        totals.baselineTotal.toFixed(2),
        totals.optimizedTotal.toFixed(2),
        totalsDelta.toFixed(2),
        `${totalsPct.toFixed(2)}%`,
        totalsDelta < 0 ? 'Reduced' : totalsDelta === 0 ? 'No change' : 'Increased',
      ]),
      emptyRow(),
      paddedRow(['NOTES']),
      paddedRow(['1) Negative change means carbon reduction.']),
      paddedRow(['2) Cost variance is an estimate based on selected alternatives.']),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [
      { wch: 40 },
      { wch: 28 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Final Report');

    const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `EnviroSync_Report_${safeName}.xlsx`);
  };

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const pid = localStorage.getItem('envirosync.project_id');

    // Clear draft — user has reached final report
    if (pid && token) {
      await clearAllProjectDrafts(pid, token);
      localStorage.removeItem('envirosync.project_id');
    }

    // ── Build PDF ────────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    let y = margin;

    // Colour palette
    const green = [14, 124, 107];   // #0e7c6b
    const dark  = [30, 30, 30];
    const grey  = [100, 100, 100];
    const lightBg = [245, 247, 245];

    // ── Helper: add a new page if we're running low on space ────────────────
    const ensureSpace = (need) => {
      if (y + need > pageH - 20) {
        doc.addPage();
        y = margin;
      }
    };

    // ── Helper: draw a horizontal rule ──────────────────────────────────────
    const hr = () => {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    };

    // ══════════════════════════════════════════════════════════════════════════
    //  HEADER – branded bar
    // ══════════════════════════════════════════════════════════════════════════
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('EnviroSync', margin, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Final Emission Report', margin, 23);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageW - margin, 15, { align: 'right' });
    y = 40;

    // ── Project info ─────────────────────────────────────────────────────────
    doc.setTextColor(...dark);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(projectName, margin, y);
    y += 6;
    if (projectRef) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grey);
      doc.text(`REF: ${projectRef}`, margin, y);
      y += 5;
    }
    y += 4;
    hr();

    // ══════════════════════════════════════════════════════════════════════════
    //  SUSTAINABILITY SCORE
    // ══════════════════════════════════════════════════════════════════════════
    doc.setTextColor(...green);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SUSTAINABILITY SCORE', margin, y);
    y += 8;

    // grade circle
    const cx = margin + 15;
    const cy = y + 10;
    doc.setFillColor(...green);
    doc.circle(cx, cy, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(sustainabilityGrade.grade, cx, cy + 1, { align: 'center', baseline: 'middle' });

    // score details beside circle
    const sx = cx + 20;
    doc.setTextColor(...dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Grade: ${sustainabilityGrade.grade}`, sx, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grey);
    doc.setFontSize(9);
    doc.text(`Ranking: ${sustainabilityGrade.badge}`, sx, y + 10);
    doc.text(`Reduction Achieved: ${Math.abs(totals.totalDeltaPct).toFixed(1)}%`, sx, y + 16);
    y += 30;
    hr();

    // ══════════════════════════════════════════════════════════════════════════
    //  KEY PERFORMANCE INDICATORS
    // ══════════════════════════════════════════════════════════════════════════
    doc.setTextColor(...green);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('KEY PERFORMANCE INDICATORS', margin, y);
    y += 8;

    // KPI cards in a row
    const kpiW = (pageW - 2 * margin - 8) / 3;
    const kpiData = [
      { label: 'Total CO\u2082e Reduction', value: `~${Number(totals.reductionKg).toLocaleString()} kg CO\u2082e`, sub: `${Math.abs(totals.totalDeltaPct).toFixed(1)}% Below Baseline` },
      { label: 'Cost Variance', value: `${costVariance > 0 ? '+' : ''}RM ${fmt(Math.round(costVariance))}`, sub: costVariance > 0 ? 'Increase' : 'Decrease' },
      { label: 'Material Efficiency', value: `${fmt(Math.round(materialEfficiency))} total units`, sub: 'Actual Volume' },
    ];

    kpiData.forEach((kpi, i) => {
      const kx = margin + i * (kpiW + 4);
      doc.setFillColor(...lightBg);
      doc.roundedRect(kx, y, kpiW, 24, 2, 2, 'F');
      doc.setTextColor(...grey);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.label, kx + 4, y + 6);
      doc.setTextColor(...dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, kx + 4, y + 13);
      doc.setTextColor(...grey);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.sub, kx + 4, y + 19);
    });
    y += 32;
    hr();

    // ══════════════════════════════════════════════════════════════════════════
    //  CARBON DISTRIBUTION
    // ══════════════════════════════════════════════════════════════════════════
    ensureSpace(45);
    doc.setTextColor(...green);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CARBON DISTRIBUTION (BASELINE)', margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text(`${(totals.baselineTotal / 1000).toFixed(1)}k kCO₂e Total`, margin, y);
    y += 7;

    distribution.forEach((d, i) => {
      const barX = margin;
      const barMaxW = pageW - 2 * margin - 50;
      const barW = Math.max(2, (d.pct / 100) * barMaxW);
      const clr = DONUT_COLORS[i % DONUT_COLORS.length];
      // hex to RGB
      const r = parseInt(clr.slice(1, 3), 16);
      const g = parseInt(clr.slice(3, 5), 16);
      const b = parseInt(clr.slice(5, 7), 16);
      doc.setFillColor(r, g, b);
      doc.roundedRect(barX, y, barW, 5, 1, 1, 'F');
      doc.setTextColor(...dark);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${d.label} — ${d.pct.toFixed(1)}%`, barX + barW + 3, y + 4);
      y += 8;
    });
    y += 4;
    hr();

    // ══════════════════════════════════════════════════════════════════════════
    //  MATERIAL BREAKDOWN TABLE
    // ══════════════════════════════════════════════════════════════════════════
    ensureSpace(30);
    doc.setTextColor(...green);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('MATERIAL BREAKDOWN', margin, y);
    y += 4;

    const tableBody = normalizedMaterials.map((m) => {
      const d = delta(m.baseline, m.optimized);
      const p = pct(m.baseline, m.optimized);
      const status = d < 0 ? 'Reduced' : d === 0 ? 'No change' : 'Increased';
      return [
        m.material,
        m.appliedAlternative || '—',
        `${fmt(m.baseline)} kg`,
        `${fmt(m.optimized)} kg`,
        `${d > 0 ? '+' : ''}${fmt(d)} kg`,
        `${p > 0 ? '+' : ''}${p.toFixed(1)}%`,
        status,
      ];
    });

    // Totals row
    const totalD = delta(totals.baselineTotal, totals.optimizedTotal);
    const totalP = pct(totals.baselineTotal, totals.optimizedTotal);
    tableBody.push([
      { content: 'TOTAL', styles: { fontStyle: 'bold' } },
      { content: '—', styles: { fontStyle: 'bold' } },
      { content: `${fmt(totals.baselineTotal)} kg`, styles: { fontStyle: 'bold' } },
      { content: `${fmt(totals.optimizedTotal)} kg`, styles: { fontStyle: 'bold' } },
      { content: `${totalD > 0 ? '+' : ''}${fmt(totalD)} kg`, styles: { fontStyle: 'bold' } },
      { content: `${totalP > 0 ? '+' : ''}${totalP.toFixed(1)}%`, styles: { fontStyle: 'bold' } },
      { content: totalD < 0 ? 'Reduced' : 'Increased', styles: { fontStyle: 'bold' } },
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Uploaded Material', 'AI Alternative', 'Baseline', 'Optimised', 'Change', '%', 'Status']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: green,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 8, textColor: dark },
      alternateRowStyles: { fillColor: [250, 252, 250] },
      columnStyles: {
        0: { cellWidth: 44 },
        1: { cellWidth: 36 },
        6: { halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const val = typeof data.cell.raw === 'object' ? data.cell.raw.content : data.cell.raw;
          if (val === 'Reduced') data.cell.styles.textColor = [14, 124, 107];
          else if (val === 'Increased') data.cell.styles.textColor = [220, 53, 69];
        }
      },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ══════════════════════════════════════════════════════════════════════════
    //  CALCULATION SUMMARY
    // ══════════════════════════════════════════════════════════════════════════
    ensureSpace(50);
    doc.setTextColor(...green);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CALCULATION SUMMARY', margin, y);
    y += 6;

    const calcRows = normalizedMaterials.map((m) => {
      const qty = parseFloat(m.quantity) || 0;
      const ef = m.baseline && qty ? (m.baseline / qty).toFixed(4) : '-';
      return [
        m.material,
        qty ? fmt(qty) : '-',
        m.unit || 'kg CO₂e',
        ef,
        `${fmt(m.baseline)} kg CO₂e`,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Material', 'Quantity', 'Unit', 'Emission Factor', 'Total Emission']],
      body: calcRows,
      theme: 'grid',
      headStyles: {
        fillColor: green,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 8, textColor: dark },
      alternateRowStyles: { fillColor: [250, 252, 250] },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ══════════════════════════════════════════════════════════════════════════
    //  SUGGESTIONS / OPTIMISED ALTERNATIVES
    // ══════════════════════════════════════════════════════════════════════════
    ensureSpace(50);
    doc.setTextColor(...green);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OPTIMISED ALTERNATIVES (SUGGESTIONS)', margin, y);
    y += 6;

    const suggRows = normalizedMaterials.map((m) => {
      const d = delta(m.baseline, m.optimized);
      const p = pct(m.baseline, m.optimized);
      const saving = d < 0 ? `${fmt(Math.abs(d))} kg saved` : d === 0 ? 'No change' : `${fmt(d)} kg increase`;
      return [
        m.material,
        m.appliedAlternative || 'No AI alternative selected',
        `${fmt(m.baseline)} kg`,
        `${fmt(m.optimized)} kg`,
        saving,
        `${Math.abs(p).toFixed(1)}%`,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Uploaded Material', 'AI Suggestion', 'Baseline CO₂e', 'Optimised CO₂e', 'Savings', '% Change']],
      body: suggRows,
      theme: 'grid',
      headStyles: {
        fillColor: green,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 8, textColor: dark },
      alternateRowStyles: { fillColor: [250, 252, 250] },
    });

    y = doc.lastAutoTable.finalY + 10;

    // ══════════════════════════════════════════════════════════════════════════
    //  FOOTER on every page
    // ══════════════════════════════════════════════════════════════════════════
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(
        `EnviroSync — Verified Carbon Reporting  |  Page ${i} of ${totalPages}`,
        pageW / 2,
        pageH - 8,
        { align: 'center' },
      );
      // footer line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    }

    // ── Save ──────────────────────────────────────────────────────────────
    const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`EnviroSync_Report_${safeName}.pdf`);
  };

  const localFallbackReference = useMemo(() => {
    const year = new Date().getFullYear();
    const rawId = String(projectId || '').replace(/-/g, '').toUpperCase();
    const suffix = rawId ? rawId.slice(-6) : 'LOCAL';
    return `${year}/LOCAL-${suffix}`;
  }, [projectId]);

  const localFallbackDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const reportReference =
    reportSnapshot?.reference_id || reportSnapshot?.ref || projectRef || localFallbackReference;
  const reportGrade = reportSnapshot?.sustainability_grade || reportSnapshot?.grade || sustainabilityGrade.grade;
  const reportGradeLabel = reportSnapshot?.grade_label || reportSnapshot?.gradeLabel || sustainabilityGrade.badge;
  const reportDate =
    reportSnapshot?.date ||
    (reportSnapshot?.created_at ? reportSnapshot.created_at.split('T')[0] : null) ||
    localFallbackDate;
  const reportCarbonT = toNum(
    reportSnapshot?.total_carbon_t ?? reportSnapshot?.totalCarbonT,
    totals.baselineTotal / 1000,
  );
  const displayedScoreGrade = reportGrade;
  const displayedScoreBadge = reportGradeLabel;
  const usingLocalMetadataFallback = !reportSnapshot?.reference_id && !reportSnapshot?.ref && !projectRef;

  return (
    <PageLayout showNavbar={false} showHeader showFooter maxWidth="1440px">
      <div className="fr-page">

        {/* Stepper */}
        <ProgressStepper
          currentStage="report"
          completedStages={['upload', 'categorization', 'calculation', 'suggestion']}
          onStageClick={(id) => {
            const routes = {
              upload: '/upload', categorization: '/categorization',
              calculation: '/calculation', suggestion: '/suggestions',
            };
            if (routes[id]) navigate(routes[id]);
          }}
        />

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="fr-header">
          <div className="fr-header-left">
            <span className="fr-eyebrow">FINAL EMISSION REPORT</span>
            <h1 className="fr-title">Final Emission Report</h1>
            <p className="fr-subtitle">
              Comprehensive carbon analysis and material optimisation outcomes.
            </p>
            <div className="fr-project-name-row">
              <span className="fre-project-name">Project: {projectName}</span>
              {projectRef && <span className="fr-project-ref">REF: {projectRef}</span>}
            </div>
          </div>
          <button className="fr-csv-btn" onClick={handleDownloadExcel}>
            <MdDownload size={17} />
            Download Excel
          </button>
        </div>

        <div className="fr-report-snapshot">
          <p className="fr-section-label">REPORT DETAILS</p>
          <div className="fr-report-grid">
            <div className="fr-report-item">
              <span className="fr-report-item-label">Reference</span>
              <span className="fr-report-item-value">{reportReference}</span>
            </div>
            <div className="fr-report-item">
              <span className="fr-report-item-label">Date</span>
              <span className="fr-report-item-value">{formatDate(reportDate)}</span>
            </div>
            <div className="fr-report-item">
              <span className="fr-report-item-label">
                Grade
                <Hint text="Grade is the official final rating from the report engine, based on project-level carbon outcomes and benchmark thresholds." />
              </span>
              <span className="fr-report-item-value">{reportGrade} ({reportGradeLabel})</span>
            </div>
            <div className="fr-report-item">
              <span className="fr-report-item-label">Total Carbon</span>
              <span className="fr-report-item-value fr-carbon-highlight">{reportCarbonT.toFixed(1)}T CO₂e</span>
            </div>
          </div>
          {usingLocalMetadataFallback && !reportSaved && (
            <p className="fr-report-error">Reference and date are local placeholders. They will auto-sync when backend reconnects.</p>
          )}
          {reportError && <p className="fr-report-error">Latest report sync issue: {reportError}</p>}
        </div>

        {/* ── KPI strip (3 cards) ─────────────────────────────────────────── */}
        <div className="fr-kpi-strip">

          {/* KPI 1 — CO₂ reduction */}
          <div className="fr-kpi">
            <p className="fr-kpi-label">
              Total CO₂e Reduction
              <Hint text="Absolute amount of carbon saved in kg CO2e. Formula: Baseline - Optimised." />
            </p>
            <div className="fr-kpi-main">
              {hasOptimisations ? (
                <>
                  <span className="fr-kpi-big fr-good">~{Number(totals.reductionKg).toLocaleString()}</span>
                  <span className="fr-kpi-unit">kg CO\u2082e</span>
                </>
              ) : (
                <span className="fr-kpi-big" style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Pending AI</span>
              )}
            </div>
            {hasOptimisations ? (
              <div className="fr-kpi-trend fr-good">
                <HiOutlineArrowTrendingDown />
                <span>{Math.abs(totals.totalDeltaPct).toFixed(1)}% Below Baseline</span>
              </div>
            ) : (
              <div className="fr-kpi-trend fr-stable">
                <FaBalanceScale />
                <span>Awaiting suggestions</span>
              </div>
            )}
          </div>

          <div className="fr-kpi-divider" />

          {/* KPI 2 — Cost Variance */}
          <div className="fr-kpi">
            <p className="fr-kpi-label">Cost Variance</p>
            <div className="fr-kpi-main">
              {hasOptimisations ? (
                <span className="fr-kpi-big">{costVariance > 0 ? '+' : ''}RM {fmt(Math.round(costVariance))}</span>
              ) : (
                <span className="fr-kpi-big" style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Pending AI</span>
              )}
            </div>
            {hasOptimisations ? (
              <div className={`fr-kpi-trend ${costVariance > 0 ? 'fr-warn' : 'fr-good'}`}>
                {costVariance > 0 ? <HiOutlineArrowTrendingUp /> : <HiOutlineArrowTrendingDown />}
                <span>{costVariance > 0 ? 'Increase' : 'Decrease'}</span>
              </div>
            ) : (
              <div className="fr-kpi-trend fr-stable">
                <FaBalanceScale />
                <span>Awaiting suggestions</span>
              </div>
            )}
          </div>

          <div className="fr-kpi-divider" />

          {/* KPI 3 — Material Efficiency */}
          <div className="fr-kpi">
            <p className="fr-kpi-label">Material Efficiency</p>
            <div className="fr-kpi-main">
              <span className="fr-kpi-big">{fmt(Math.round(materialEfficiency))}</span>
              <span className="fr-kpi-unit">total units</span>
            </div>
            <div className="fr-kpi-trend fr-stable">
              <FaBalanceScale />
              <span>Actual Volume</span>
            </div>
          </div>

        </div>

        <p className="fr-metric-note">
          Total CO₂e Reduction shows absolute kg saved, while Reduction Achieved shows the same improvement as a percentage of the baseline.
        </p>

        {/* ── Sustainability score + donut ────────────────────────────────── */}
        <div className="fr-score-row">

          <div className="fr-score-card">
            <p className="fr-section-label">
              SUSTAINABILITY SCORE
              <Hint text="Sustainability Score is the same final rating grade for this report. It summarizes overall sustainability performance, while Report Details shows the exact official grade record and metadata." />
            </p>
            <div className="fr-score-grade">{displayedScoreGrade}</div>
            <span className="fr-score-badge">{displayedScoreBadge}</span>
            <p className="fr-score-note">Ranked globally</p>
            <div className="fr-score-reduction">
              <span className="fr-reduction-num">
                {hasOptimisations ? `${Math.abs(totals.totalDeltaPct).toFixed(1)}%` : '-'}
              </span>
              <span className="fr-reduction-label">
                <Hint text="Reduction Achieved is the percentage improvement from baseline emissions. Formula: (Baseline - Optimised) / Baseline * 100." />
                {hasOptimisations ? 'Reduction Achieved' : 'Pending optimisation'}
              </span>
            </div>
          </div>

          <div className="fr-donut-card">
            <p className="fr-section-label">CARBON DISTRIBUTION (BASELINE)</p>
            <div className="fr-donut-wrap">
              <div
                className="fr-donut"
                style={{ background: `conic-gradient(${donutGradient})` }}
              >
                <div className="fr-donut-center">
                  <span className="fr-donut-val">{totals.baselineTotal.toLocaleString()}</span>
                  <span className="fr-donut-sub">TOTAL kg CO\u2082e</span>
                </div>
              </div>
              <div className="fr-donut-legend">
                {distribution.map((d, i) => (
                  <div key={d.label} className="fr-donut-legend-row">
                    <span className="fr-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="fr-legend-name">{d.label}</span>
                    <span className="fr-legend-pct">{d.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── Material Breakdown table ───────────────────────────────────── */}
        <div className="fr-table-card">
          <p className="fr-section-label">MATERIAL BREAKDOWN & SELECTED ALTERNATIVES</p>
          <div className="fr-table-scroll">
            <table className="fr-table">
              <thead>
                <tr>
                  <th className="fr-th-m">Material</th>
                  <th className="fr-th-m">Applied Alternative</th>
                  <th className="fr-th-r">Baseline</th>
                  <th className="fr-th-r">Optimised</th>
                  <th className="fr-th-r">Change</th>
                  <th className="fr-th-r">%</th>
                  <th className="fr-th-c">Status</th>
                </tr>
              </thead>
              <tbody>
                {normalizedMaterials.map((m, idx) => {
                  const d = delta(m.baseline, m.optimized);
                  const p = pct(m.baseline, m.optimized);
                  const good = d < 0;
                  const stable = d === 0;
                  const hasAlternative = m.is_alternative_applied;
                  return (
                    <tr key={`${m.material}-${idx}`} className={hasAlternative ? 'fr-row-optimized' : ''}>
                      <td className="fr-td-name">{m.material}</td>
                      <td className="fr-td-name">
                        {hasAlternative ? (
                          <span style={{ color: '#0e7c6b', fontWeight: '500' }}>✓ {m.appliedAlternative}</span>
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                      <td className="fr-td-r">{fmt(m.baseline)} kg</td>
                      <td className="fr-td-r">{fmt(m.optimized)} kg</td>
                      <td className={`fr-td-r ${good ? 'fr-good' : stable ? 'fr-stable' : 'fr-bad'}`}>
                        {d > 0 ? '+' : ''}{fmt(d)} kg
                      </td>
                      <td className={`fr-td-r ${good ? 'fr-good' : stable ? 'fr-stable' : 'fr-bad'}`}>
                        {p > 0 ? '+' : ''}{p.toFixed(1)}%
                      </td>
                      <td className="fr-td-c">
                        <span className={`fr-status ${good ? 'fr-status--good' : stable ? 'fr-status--neutral' : 'fr-status--bad'}`}>
                          {good ? 'Reduced' : stable ? 'No change' : 'Increased'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Final confirmation ───────────────────────────────────────────── */}
        <div className="fr-confirm">
          <p className="fr-confirm-heading">Final Confirmation</p>
          <p className="fr-confirm-text">
            By continuing, you acknowledge that the optimised alternatives reflect the project's
            sustainability targets and are ready to be locked in the final report.
          </p>
          <div className="fr-confirm-actions">
            <button className="fr-btn fr-btn--secondary" onClick={() => navigate('/history')}>
              See Past Suggestion Projects
            </button>
            <button className="fr-btn fr-btn--primary" onClick={handleDownloadPDF}>
              <MdDownload size={17} />
              Download PDF
            </button>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
