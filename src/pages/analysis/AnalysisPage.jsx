import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../../components/common/PageLayout';
import ProgressStepper from '../../components/common/ProgressStepper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { MdDownload } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { HiOutlineArrowTrendingDown, HiOutlineArrowTrendingUp } from "react-icons/hi2";
import { FaBalanceScale } from "react-icons/fa";
import './AnalysisPage.css';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const mockMaterials = [
  { material: 'Concrete (RC 28/20)', baseline: 238, optimized: 189, unit: 'kg CO₂e' },
  { material: 'Steel Rebar (T12)', baseline: 141, optimized: 112, unit: 'kg CO₂e' },
  { material: 'Glass Facade (Triple)', baseline: 181, optimized: 141, unit: 'kg CO₂e' },
  { material: 'Timber Joists', baseline: 121, optimized: 98, unit: 'kg CO₂e' },
  { material: 'Cement (OPC)', baseline: 95, optimized: 76, unit: 'kg CO₂e' },
];

const pieColors = [
  'var(--primary-blue)',
  'var(--primary-green)',
  'var(--warning-yellow)',
  'var(--info-blue)',
  'var(--secondary-gray)',
];

function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

function pctChange(baseline, optimized) {
  if (baseline === 0) return 0;
  return ((optimized - baseline) / baseline) * 100;
}

function diff(baseline, optimized) {
  return optimized - baseline;
}

// Tooltip for bar chart
function BarTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const baseline = payload.find((p) => p.dataKey === 'baseline')?.value ?? 0;
  const optimized = payload.find((p) => p.dataKey === 'optimized')?.value ?? 0;
  const delta = diff(baseline, optimized);
  const deltaPct = pctChange(baseline, optimized);

  const improved = delta < 0;

  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">{label}</div>
      <div className="tooltip-row">
        <span className="muted">Baseline:</span>
        <span>{formatNumber(baseline)} kg CO₂e</span>
      </div>
      <div className="tooltip-row">
        <span className="muted">Optimized:</span>
        <span>{formatNumber(optimized)} kg CO₂e</span>
      </div>
      <div className="tooltip-row">
        <span className="muted">Change:</span>
        <span className={improved ? 'text-success' : 'text-danger'}>
          {delta > 0 ? '+' : ''}
          {formatNumber(delta)} kg ({deltaPct > 0 ? '+' : ''}
          {deltaPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

// Tooltip for pie chart
function PieTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const { name, value, percent } = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">{name}</div>
      <div className="tooltip-row">
        <span className="muted">Share:</span>
        <span>{(percent * 100).toFixed(1)}%</span>
      </div>
      <div className="tooltip-row">
        <span className="muted">CO₂e:</span>
        <span>{formatNumber(value)} kg</span>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use passed materials from Suggestions page or fallback to mock data
  const materials = location.state?.materials || mockMaterials;
  
  const totals = useMemo(() => {
    const baselineTotal = materials.reduce((sum, m) => sum + m.baseline, 0);
    const optimizedTotal = materials.reduce((sum, m) => sum + m.optimized, 0);
    const totalDelta = optimizedTotal - baselineTotal; // negative = good
    const totalDeltaPct = pctChange(baselineTotal, optimizedTotal);

    // Mock "cost variance" & "material efficiency" (replace later)
    const costVariance = 12400; // e.g. +12,400
    const materialEfficiency = 1250; // e.g. "tons" or "m²" etc.

    return {
      baselineTotal,
      optimizedTotal,
      totalDelta,
      totalDeltaPct,
      costVariance,
      materialEfficiency,
    };
  }, [materials]);

  const barData = useMemo(
    () =>
      materials.map((m) => ({
        name: m.material,
        baseline: m.baseline,
        optimized: m.optimized,
      })),
    [materials]
  );

  // Pie chart: distribution by baseline (can swap to optimized if needed)
  const pieData = useMemo(
    () =>
      materials.map((m) => ({
        name: m.material,
        value: m.baseline,
      })),
    [materials]
  );

  const handleDownloadCSV = () => {
    // Simple client-side CSV download (mock data)
    const headers = ['Material', 'Baseline (kg CO2e)', 'Optimized (kg CO2e)', 'Change (kg)', 'Change (%)'];
    const rows = materials.map((m) => {
      const d = diff(m.baseline, m.optimized);
      const p = pctChange(m.baseline, m.optimized);
      return [m.material, m.baseline, m.optimized, d, p.toFixed(2)];
    });

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'enviroSync-analysis.csv';
    a.click();

    URL.revokeObjectURL(url);
  };

  const goBackToEdit = () => {
    // placeholder for navigation later
    window.history.back();
  };

  const lockAndGenerateReport = () => {
    navigate('/report');
  };

  const handleSaveDraft = () => {
    try {
      const payload = {
        savedAt: new Date().toISOString(),
        stage: 'analysis',
        totals,
      };
      localStorage.setItem('envirosync.analysis.draft.v1', JSON.stringify(payload));
    } catch {
      // ignore storage failures
    }
  };

  const improvedTotal = totals.totalDelta < 0;

  return (
    <PageLayout
      title=""
      subtitle=""
      showNavbar={false}
      showHeader={true}
      showFooter={true}
      maxWidth="1440px"
    >
      <div className="analysis-page">
        {/* Stepper */}
        <ProgressStepper 
          currentStage="analysis"
          completedStages={['upload', 'categorization', 'calculation', 'suggestion']}
          onStageClick={(stageId) => {
            if (stageId === 'upload') navigate('/upload');
            if (stageId === 'categorization') navigate('/categorization');
            if (stageId === 'calculation') navigate('/calculation');
            if (stageId === 'suggestion') navigate('/suggestions');
          }}
        />


        {/* Summary header row */}
        <div className="summary-header">
          <div>
            <h1 className="section-title">Final Summary</h1>
            <p className="section-subtitle">Project A • REF: 2026/GRN-8821-MC</p>
          </div>
          <Button variant="secondary" onClick={handleDownloadCSV} className="btn-download">
            <MdDownload className="btn-icon" />
            Download CSV
          </Button>
        </div>


        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* KPI 1 */}
          <Card className="kpi-card">
            <div className="kpi-label">Total CO2E Reduction</div>

            <div className="kpi-main">
              <span className="kpi-big text-success">~42.5</span>
              <span className="kpi-unit">kg CO₂e</span>
            </div>

            <div className="kpi-trend text-success">
              <HiOutlineArrowTrendingDown className="kpi-icon" />
              <span>16% Below Baseline</span>
            </div>

          </Card>

          {/* KPI 2 */}
          <Card className="kpi-card">
            <div className="kpi-label">Cost Variance</div>

            <div className="kpi-main">
              <span className="kpi-big">+$12,400</span>
            </div>

            <div className="kpi-trend text-warning">
              <HiOutlineArrowTrendingUp className="kpi-icon" />
              <span>3.2% Increase</span>
            </div>
          </Card>

          {/* KPI 3 */}
          <Card className="kpi-card">
            <div className="kpi-label">Material Efficiency</div>

            <div className="kpi-main">
              <span className="kpi-big">1250</span>
              <span className="kpi-unit">m³</span>
            </div>

            <div className="kpi-trend kpi-stable">
              <FaBalanceScale className="kpi-icon" />
              <span>Stable Volume</span>
            </div>
          </Card>
        </div>


        {/* Charts row */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Card title="Baseline vs Optimized (kg CO₂e)">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={barData} margin={{ top: 10, right: 20, left: 10, bottom: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    height={120}
                    angle={-45}
                    textAnchor="end"
                    dy={5}
                    tickMargin={5}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip content={<BarTooltip />} />
                  <Legend />
                  <Bar dataKey="baseline" name="Baseline" fill="var(--danger-red)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="optimized" name="Optimized" fill="var(--success-green)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Carbon Distribution by Material (Baseline)">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <RechartsTooltip content={<PieTooltip />} />
                  <Legend verticalAlign="bottom" height={80} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={105}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>


        {/* Breakdown table */}
        <Card title="Material Breakdown">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th className="text-right">Baseline</th>
                  <th className="text-right">Optimized</th>
                  <th className="text-right">Change</th>
                  <th className="text-right">%</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const d = diff(m.baseline, m.optimized);
                  const p = pctChange(m.baseline, m.optimized);
                  const improved = d < 0;

                  return (
                    <tr key={m.material}>
                      <td className="material-name">{m.material}</td>
                      <td className="text-right">{formatNumber(m.baseline)} kg</td>
                      <td className="text-right">{formatNumber(m.optimized)} kg</td>
                      <td className={`text-right ${improved ? 'text-success' : 'text-danger'}`}>
                        {d > 0 ? '+' : ''}
                        {formatNumber(d)} kg
                      </td>
                      <td className={`text-right ${improved ? 'text-success' : 'text-danger'}`}>
                        {p > 0 ? '+' : ''}
                        {p.toFixed(1)}%
                      </td>
                      <td className="text-center">
                        <span className={`status-pill ${improved ? 'good' : 'bad'}`}>
                          {improved ? 'Reduced' : 'Increased'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Final confirmation */}
        <div className="final-confirm">
          <p className="final-confirmation">
            Final Confirmation
          </p>
          <p className="final-text">
            By continuing, you acknowledge that the optimized alternatives reflect the project’s sustainability targets and
            are ready to be used in the final report.
          </p>
          <div className="final-actions">
            <Button variant="secondary" onClick={handleSaveDraft} className="btn-save-draft">
              Save Draft
            </Button>
            <Button variant="success" onClick={lockAndGenerateReport} className="btn-lock">
              <CiLock className="btn-icon" />
              Lock &amp; Generate Report
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

