import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Settings as SettingsIcon,
  Download,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  Printer,
  RefreshCw,
  AlertCircle,
  EyeOff,
  Save,
  CheckCircle2,
  Lock,
  Percent,
  Sliders,
  TrendingUp,
  Database,
} from 'lucide-react';
import type { Teacher, Exam, Submission, SystemSecuritySettings } from '../types';
import {
  fetchTeachers,
  fetchExams,
  fetchSubmissions,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  deleteSubmission,
  getSettings,
  setAdminPassword,
  setPassPercentage,
  getSystemSettings,
  saveSystemSecuritySettings,
} from '../lib/turso';
import { exportSubmissionsToCSV, exportTeachersToCSV, exportFullBackupCSV } from '../lib/csvExport';

interface Props {
  onViewCertificate: (sub: Submission) => void;
  onOpenTursoConfig: () => void;
  isTursoConfigured: boolean;
}

export function AdminDashboard({ onViewCertificate, onOpenTursoConfig, isTursoConfigured }: Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin & Student Security Settings
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passThresholdInput, setPassThresholdInput] = useState(50);
  const [examAccessCodeInput, setExamAccessCodeInput] = useState('');
  const [enableExamCodeInput, setEnableExamCodeInput] = useState(false);
  const [antiCheatingCopyInput, setAntiCheatingCopyInput] = useState(true);
  const [detectTabSwitchInput, setDetectTabSwitchInput] = useState(true);
  const [limitOneAttemptInput, setLimitOneAttemptInput] = useState(false);
  const [showAnswerKeysInput, setShowAnswerKeysInput] = useState(true);
  const [requireFullscreenInput, setRequireFullscreenInput] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Teacher Management
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [tFullName, setTFullName] = useState('');
  const [tSubject, setTSubject] = useState('');
  const [tDepartment, setTDepartment] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Filters for Submissions
  const [examFilter, setExamFilter] = useState('ທັງໝົດ');
  const [teacherFilter, setTeacherFilter] = useState('ທັງໝົດ');
  const [provinceFilter, setProvinceFilter] = useState('ທັງໝົດ');
  const [statusFilter, setStatusFilter] = useState('ທັງໝົດ');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Submission for Detail Modal
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tList, eList, sList, sett] = await Promise.all([
        fetchTeachers(),
        fetchExams(),
        fetchSubmissions(),
        getSystemSettings(),
      ]);
      setTeachers(tList);
      setExams(eList);
      setSubmissions(sList);
      setPassThresholdInput(sett.passPercentage);
      setExamAccessCodeInput(sett.examAccessCode || '');
      setEnableExamCodeInput(sett.enableExamCode);
      setAntiCheatingCopyInput(sett.antiCheatingCopy);
      setDetectTabSwitchInput(sett.detectTabSwitch);
      setLimitOneAttemptInput(sett.limitOneAttempt);
      setShowAnswerKeysInput(sett.showAnswerKeys);
      setRequireFullscreenInput(sett.requireFullscreen);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (examFilter !== 'ທັງໝົດ' && s.examId !== examFilter) return false;
      if (teacherFilter !== 'ທັງໝົດ' && s.teacherName !== teacherFilter) return false;
      if (provinceFilter !== 'ທັງໝົດ' && s.studentInfo?.province !== provinceFilter) return false;
      if (statusFilter === 'ຜ່ານ' && !s.passed) return false;
      if (statusFilter === 'ບໍ່ຜ່ານ' && s.passed) return false;

      const subDate = s.studentInfo?.examDate || s.submittedAt?.slice(0, 10);
      if (startDate && subDate && subDate < startDate) return false;
      if (endDate && subDate && subDate > endDate) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matches =
          s.id.toLowerCase().includes(term) ||
          s.studentInfo?.fullName?.toLowerCase().includes(term) ||
          s.examTitle?.toLowerCase().includes(term) ||
          s.teacherName?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [submissions, examFilter, teacherFilter, provinceFilter, statusFilter, startDate, endDate, searchTerm]);

  // Distinct Provinces
  const provinces = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      if (s.studentInfo?.province) set.add(s.studentInfo.province);
    });
    return Array.from(set);
  }, [submissions]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = filteredSubmissions.length;
    const passed = filteredSubmissions.filter((s) => s.passed).length;
    const failed = total - passed;
    const avgScore =
      total > 0
        ? Math.round((filteredSubmissions.reduce((acc, s) => acc + s.percentage, 0) / total) * 10) / 10
        : 0;

    return { total, passed, failed, avgScore };
  }, [filteredSubmissions]);

  // SVG Chart: Distribution by 10% buckets (0-10%, 10-20% ... 90-100%)
  const scoreBuckets = useMemo(() => {
    const buckets = [
      { label: '<50%', count: 0 },
      { label: '50-60%', count: 0 },
      { label: '60-70%', count: 0 },
      { label: '70-80%', count: 0 },
      { label: '80-90%', count: 0 },
      { label: '90-100%', count: 0 },
    ];

    filteredSubmissions.forEach((s) => {
      const p = s.percentage;
      if (p < 50) buckets[0].count++;
      else if (p < 60) buckets[1].count++;
      else if (p < 70) buckets[2].count++;
      else if (p < 80) buckets[3].count++;
      else if (p < 90) buckets[4].count++;
      else buckets[5].count++;
    });

    return buckets;
  }, [filteredSubmissions]);

  // Teacher Handlers
  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setTFullName('');
    setTSubject('');
    setTDepartment('');
    setTPassword('');
    setShowTeacherModal(true);
  };

  const handleOpenEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setTFullName(t.fullName);
    setTSubject(t.subject);
    setTDepartment(t.department);
    setTPassword(t.password);
    setShowTeacherModal(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tFullName.trim() || !tPassword.trim()) {
      alert('ກະລຸນາປ້ອນ ຊື່-ນາມສະກຸນ ແລະ ລະຫັດຜ່ານ');
      return;
    }

    setSavingTeacher(true);
    try {
      if (editingTeacher) {
        const updated: Teacher = {
          ...editingTeacher,
          fullName: tFullName.trim(),
          subject: tSubject.trim(),
          department: tDepartment.trim(),
          password: tPassword.trim(),
        };
        await updateTeacher(updated);
        setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await createTeacher({
          fullName: tFullName.trim(),
          subject: tSubject.trim(),
          department: tDepartment.trim(),
          password: tPassword.trim(),
        });
        setTeachers((prev) => [created, ...prev]);
      }
      setShowTeacherModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບບັນຊີອາຈານ "${name}"?`)) return;
    try {
      await deleteTeacher(id);
      setTeachers((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!window.confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຜົນສອບເສັງ #${id}?`)) return;
    try {
      await deleteSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSub?.id === id) setSelectedSub(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    }
  };

  const handleSaveAdminSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const payload: Partial<SystemSecuritySettings> = {
        passPercentage: Number(passThresholdInput),
        examAccessCode: examAccessCodeInput.trim(),
        enableExamCode: enableExamCodeInput,
        antiCheatingCopy: antiCheatingCopyInput,
        detectTabSwitch: detectTabSwitchInput,
        limitOneAttempt: limitOneAttemptInput,
        showAnswerKeys: showAnswerKeysInput,
        requireFullscreen: requireFullscreenInput,
      };

      if (adminPasswordInput.trim()) {
        payload.adminPassword = adminPasswordInput.trim();
      }

      await saveSystemSecuritySettings(payload);
      setSettingsMsg({ success: true, text: 'ບັນທຶກການຕັ້ງຄ່າລະບົບ & ຄວາມປອດໄພ (ທັງ Admin ແລະ ນັກຮຽນ) ສຳເລັດແລ້ວ!' });
      setAdminPasswordInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSettingsMsg({ success: false, text: msg });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4">
      {/* Top Header & Tab Switcher */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            1) Dashboard
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            2) Setting
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="ໂຫຼດໃໝ່"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'dashboard' ? (
            <>
              <button
                onClick={() => exportSubmissionsToCSV(filteredSubmissions)}
                disabled={filteredSubmissions.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV (BOM)
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                ພິມລາຍງານ
              </button>
            </>
          ) : (
            <button
              onClick={() => exportFullBackupCSV(teachers, exams, submissions)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV ສຳຮອງທັງໝົດ
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          TAB 1: ADMIN DASHBOARD
      ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">ຜູ້ສອບທັງໝົດ</span>
              <strong className="text-2xl font-mono text-slate-900 mt-1 block">{metrics.total}</strong>
              <span className="text-[10px] text-slate-400 mt-0.5 block">ຄົນ</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">ບົດສອບເສັງ</span>
              <strong className="text-2xl font-mono text-slate-800 mt-1 block">{exams.length}</strong>
              <span className="text-[10px] text-slate-400 mt-0.5 block">ບົດ</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">ອາຈານ</span>
              <strong className="text-2xl font-mono text-slate-800 mt-1 block">{teachers.length}</strong>
              <span className="text-[10px] text-slate-400 mt-0.5 block">ຄົນ</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-200/70 bg-blue-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-blue-700 block">ຄະແນນສະເລ່ຍ</span>
              <strong className="text-2xl font-mono text-blue-900 mt-1 block">{metrics.avgScore}%</strong>
              <span className="text-[10px] text-blue-600 mt-0.5 block">ລວມທຸກບົດສອບ</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 block">ຈຳນວນຜ່ານ</span>
              <strong className="text-2xl font-mono text-emerald-900 mt-1 block">{metrics.passed}</strong>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">ຄົນ</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-rose-200/70 bg-rose-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-rose-700 block">ຈຳນວນບໍ່ຜ່ານ</span>
              <strong className="text-2xl font-mono text-rose-900 mt-1 block">{metrics.failed}</strong>
              <span className="text-[10px] text-rose-600 mt-0.5 block">ຄົນ</span>
            </div>
          </div>

          {/* SVG Score Distribution Chart */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  ການກະຈາຍຄະແນນສອບເສັງ (Score Distribution)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">ເກນຜ່ານ: {passThresholdInput}%</span>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                ຍັງບໍ່ມີຂໍ້ມູນເພື່ອສະແດງກຣາຟ
              </div>
            ) : (
              <div className="h-44 w-full">
                {(() => {
                  const maxCount = Math.max(...scoreBuckets.map((b) => b.count), 1);
                  const width = 600;
                  const height = 150;
                  const barWidth = 55;
                  const gap = (width - 60 - barWidth * scoreBuckets.length) / (scoreBuckets.length - 1);

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                      <line x1="30" y1="120" x2={width - 20} y2="120" stroke="#E2E8F0" strokeWidth="1" />
                      {scoreBuckets.map((b, i) => {
                        const barHeight = (b.count / maxCount) * 90;
                        const x = 30 + i * (barWidth + gap);
                        const y = 120 - barHeight;
                        const isPassing = i >= 1; // 50% and above

                        return (
                          <g key={i}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx="6"
                              fill={isPassing ? '#2563EB' : '#F43F5E'}
                              className="transition-all hover:opacity-85"
                            />
                            <text
                              x={x + barWidth / 2}
                              y={y - 6}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="bold"
                              fill="#1E293B"
                              className="font-mono"
                            >
                              {b.count}
                            </text>
                            <text
                              x={x + barWidth / 2}
                              y="136"
                              textAnchor="middle"
                              fontSize="10"
                              fill="#64748B"
                              className="font-mono"
                            >
                              {b.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ບົດສອບເສັງ</label>
              <select
                value={examFilter}
                onChange={(e) => setExamFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="ທັງໝົດ">ທຸກບົດສອບ</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ອາຈານ</label>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="ທັງໝົດ">ທຸກອາຈານ</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.fullName}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ແຂວງ</label>
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="ທັງໝົດ">ທຸກແຂວງ</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ສະຖານະ</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="ທັງໝົດ">ທັງໝົດ (ຜ່ານ/ບໍ່ຜ່ານ)</option>
                <option value="ຜ່ານ">ສະເພາະ ຜ່ານ</option>
                <option value="ບໍ່ຜ່ານ">ສະເພາະ ບໍ່ຜ່ານ</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ແຕ່ວັນທີ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
              </input>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ຮອດວັນທີ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ຄົ້ນຫາຊື່ຜູ້ສອບ, ລະຫັດ ID, ບົດສອບ, ຫຼື ອາຈານ..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* All Submissions Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                ຜົນສອບເສັງທັງໝົດ ({filteredSubmissions.length} ລາຍການ)
              </h3>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                ບໍ່ພົບຜົນສອບເສັງທີ່ກົງກັບເງື່ອນໄຂ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">ຊື່ຜູ້ສອບ</th>
                      <th className="px-4 py-3">ບົດສອບເສັງ</th>
                      <th className="px-4 py-3">ອາຈານ</th>
                      <th className="px-4 py-3">ຄະແນນ</th>
                      <th className="px-4 py-3">ເປີເຊັນ</th>
                      <th className="px-4 py-3">ຜົນ</th>
                      <th className="px-4 py-3">ວັນທີສອບ</th>
                      <th className="px-4 py-3 text-right">ຈັດການ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">#{s.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {s.studentInfo?.fullName}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {s.studentInfo?.district}, {s.studentInfo?.province}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate" title={s.examTitle}>
                          {s.examTitle}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{s.teacherName}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {s.totalScore} / {s.maxTotalScore}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">{s.percentage}%</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              s.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {s.passed ? 'ຜ່ານ' : 'ບໍ່ຜ່ານ'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {s.studentInfo?.examDate || s.submittedAt?.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSub(s)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                              title="ເບິ່ງລາຍລະອຽດ"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {s.passed && (
                              <button
                                onClick={() => onViewCertificate(s)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="ພິມໃບຢັ້ງຢືນ"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSubmission(s.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                              title="ລຶບ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: SETTINGS (TEACHERS & SYSTEM CONFIG)
      ======================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Top Actions & Connection Status */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${isTursoConfigured ? 'bg-emerald-500' : 'bg-rose-500'}`}
                />
                <span className="text-xs font-semibold text-slate-700">
                  ສະຖານະ Turso: {isTursoConfigured ? 'ເຊື່ອມຕໍ່ແລ້ວ' : 'ເຊື່ອມຕໍ່ບໍ່ໄດ້'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">ຈັດການບັນຊີອາຈານ (Teachers Management)</h3>
              <p className="text-xs text-slate-500">ສ້າງ ແລະ ຈັດການ User ສຳລັບອາຈານຜູ້ອອກຂໍ້ສອບ</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenTursoConfig}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                ຕັ້ງຄ່າ Turso
              </button>
              <button
                onClick={handleOpenAddTeacher}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                + ສ້າງ User ຂອງອາຈານ
              </button>
            </div>
          </div>

          {/* Teachers Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                ລາຍຊື່ອາຈານທັງໝົດ ({teachers.length} ຄົນ)
              </h4>
            </div>

            {teachers.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                ຍັງບໍ່ມີບັນຊີອາຈານໃນລະບົບ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">ຊື່ ແລະ ນາມສະກຸນ</th>
                      <th className="px-4 py-3">ວິຊາສອນ</th>
                      <th className="px-4 py-3">ພະແນກ / ໜ່ວຍງານ</th>
                      <th className="px-4 py-3">ລະຫັດຜ່ານ</th>
                      <th className="px-4 py-3">ວັນທີສ້າງ</th>
                      <th className="px-4 py-3 text-right">ຈັດການ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((t) => {
                      const isVisible = visiblePasswords[t.id];
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-mono font-bold text-slate-600">{t.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{t.fullName}</td>
                          <td className="px-4 py-3 text-slate-700">{t.subject}</td>
                          <td className="px-4 py-3 text-slate-600">{t.department}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {isVisible ? t.password : '••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setVisiblePasswords((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-400">{t.createdAt?.slice(0, 10)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditTeacher(t)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="ແກ້ໄຂ"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(t.id, t.fullName)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                title="ລຶບ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Settings Grid: Security & Database */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Admin Security & Passing Score Config */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                1. ຄວາມປອດໄພ & ການຕັ້ງຄ່າ Admin
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                ປ່ຽນລະຫັດຜ່ານຜູ້ດູແລລະບົບ ແລະ ກຳນົດເກນເປີເຊັນຄະແນນຜ່ານມາດຕະຖານ
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ລະຫັດຜ່ານ Admin ໃໝ່ (ປະວ່າງໄວ້ຖ້າບໍ່ຕ້ອງການປ່ຽນ)
                  </label>
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="ລະຫັດຜ່ານ Admin ໃໝ່..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ເກນຄະແນນຜ່ານ (%) (Pass Percentage Threshold)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={passThresholdInput}
                    onChange={(e) => setPassThresholdInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold"
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-400">ຄ່າເລີ່ມຕົ້ນ: 50% (ຄະແນນ 50% ຂຶ້ນໄປຈຶ່ງຖືວ່າຜ່ານ ແລະ ອອກໃບຢັ້ງຢືນໄດ້)</p>
                </div>
              </div>
            </div>

            {/* 2. Student & Exam Security Policies */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                2. ຄວາມປອດໄພ & ກົດລະບຽບການສອບເສັງຂອງນັກຮຽນ
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                ກຳນົດນະໂຍບາຍຄວາມປອດໄພ, ການປ້ອງກັນການສອບເສັງ, ແລະ ສິດຂອງຜູ້ສອບເສັງ
              </p>

              <div className="space-y-3.5 text-xs">
                {/* Exam Access Passcode */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">ລະຫັດຜ່ານເຂົ້າສອບເສັງ (Exam Access Code)</span>
                      <span className="text-[11px] text-slate-500 block">ບັງຄັບໃຫ້ນັກຮຽນຕ້ອງໃສ່ລະຫັດກ່ອນເລີ່ມສອບເສັງ</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={enableExamCodeInput}
                        onChange={(e) => setEnableExamCodeInput(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {enableExamCodeInput && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={examAccessCodeInput}
                        onChange={(e) => setExamAccessCodeInput(e.target.value)}
                        placeholder="ກຳນົດລະຫັດເຂົ້າສອບ ເຊັ່ນ: CPS2026"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold"
                      />
                    </div>
                  )}
                </div>

                {/* Anti-Cheating Copy Protection */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">ປ້ອງກັນການກັອບປີ້ / ຫ້າມຄລິກຂວາ</span>
                    <span className="text-[11px] text-slate-500">ຫ້າມ Copy ຂໍ້ຄວາມ ຫຼື ຄລິກຂວາໃນລະຫວ່າງສອບເສັງ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiCheatingCopyInput}
                    onChange={(e) => setAntiCheatingCopyInput(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>

                {/* Detect Tab Switching */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">ກວດຈັບການສະຫຼັບໜ້າຈໍ / ແຖບ</span>
                    <span className="text-[11px] text-slate-500">ແຈ້ງເຕືອນເມື່ອນັກຮຽນສະຫຼັບໜ້າຈໍ ຫຼື ເປີດແຖບອື່ນ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={detectTabSwitchInput}
                    onChange={(e) => setDetectTabSwitchInput(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>

                {/* Limit One Attempt */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">ຈຳກັດການສອບເສັງ 1 ຄັ້ງຕໍ່ຄົນ</span>
                    <span className="text-[11px] text-slate-500">ປ້ອງກັນບໍ່ໃຫ້ນັກຮຽນສອບເສັງຊ້ຳໃນບົດສອບດຽວກັນ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={limitOneAttemptInput}
                    onChange={(e) => setLimitOneAttemptInput(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>

                {/* Show Answer Keys */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">ສະແດງສະເລີຍຄຳຕອບຫຼັງສອບເສັງ</span>
                    <span className="text-[11px] text-slate-500">ໃຫ້ນັກຮຽນເຫັນຂໍ້ຖືກ/ຜິດ ຫຼັງຈາກກົດສົ່ງຄຳຕອບທັນທີ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showAnswerKeysInput}
                    onChange={(e) => setShowAnswerKeysInput(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings Save Banner & Action Button */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">ບັນທຶກການຕັ້ງຄ່າທັງໝົດ</h4>
              <p className="text-xs text-slate-500">ບັນທຶກການປ່ຽນແປງທັງໝົດຂອງລະບົບຄວາມປອດໄພ Admin ແລະ ນັກຮຽນ</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {settingsMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    settingsMsg.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {settingsMsg.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{settingsMsg.text}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveAdminSettings}
                disabled={savingSettings}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການຕັ້ງຄ່າທັງໝົດ'}</span>
              </button>
            </div>
          </div>

            {/* Turso Database Connection Settings Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  ຕັ້ງຄ່າຖານຂໍ້ມູນ Turso (LibSQL Database)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  ຈັດການ URL ແລະ Auth Token ສຳລັບເຊື່ອມຕໍ່ Turso LibSQL Cloud Database
                </p>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">ສະຖານະການເຊື່ອມຕໍ່:</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                      isTursoConfigured
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isTursoConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                      {isTursoConfigured ? 'ເຊື່ອມຕໍ່ Turso ແລ້ວ' : 'ຍັງບໍ່ທັນໄດ້ກຳນົດຄ່າ'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    ລະບົບນີ້ໃຊ້ສະຖາປັດຕະຍະກຳ Direct Client (@libsql/client/web) ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ Turso ຈາກ Browser ໂດຍກົງ ບໍ່ຜ່ານ Backend Server.
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={onOpenTursoConfig}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>{isTursoConfigured ? 'ກວດສອບ / ແກ້ໄຂຄ່າ Turso' : 'ຕັ້ງຄ່າ Turso Database ດຽວນີ້'}</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  * ປຸ່ມນີ້ສາມາດເຂົ້າເຖິງໄດ້ສະເພາະ Admin ເທົ່ານັ້ນ
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Modal: Add/Edit Teacher */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              {editingTeacher ? `ແກ້ໄຂອາຈານ #${editingTeacher.id}` : '+ ສ້າງ User ຂອງອາຈານ'}
            </h3>

            <form onSubmit={handleSaveTeacher} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ຊື່ ແລະ ນາມສະກຸນ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tFullName}
                  onChange={(e) => setTFullName(e.target.value)}
                  placeholder="ດຣ. ສົມໄຊ ວົງສາ"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ວິຊາສອນ / ຊ່ຽວຊານ</label>
                <input
                  type="text"
                  value={tSubject}
                  onChange={(e) => setTSubject(e.target.value)}
                  placeholder="ການປະຖົມພະຍາບານ..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ພະແນກ / ໜ່ວຍງານ</label>
                <input
                  type="text"
                  value={tDepartment}
                  onChange={(e) => setTDepartment(e.target.value)}
                  placeholder="ໜ່ວຍກູ້ໄພສຸກເສີນ..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ລະຫັດຜ່ານເຂົ້າສູ່ລະບົບ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tPassword}
                  onChange={(e) => setTPassword(e.target.value)}
                  placeholder="ກຳນົດລະຫັດຜ່ານ..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  disabled={savingTeacher}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-xs"
                >
                  {savingTeacher ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກອາຈານ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSub.studentInfo?.fullName} (#{selectedSub.id})
                </h3>
                <p className="text-xs text-slate-500">{selectedSub.examTitle}</p>
              </div>
              <button onClick={() => setSelectedSub(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 mt-4 space-y-3 text-xs pr-1">
              <div className="p-3 bg-slate-50 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">ຄະແນນປາລະໄນ</span>
                  <strong>{selectedSub.objectiveScore} / {selectedSub.maxObjectiveScore}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">ຄະແນນອັດຕະໄນ</span>
                  <strong>{selectedSub.essayScore} / {selectedSub.maxEssayScore}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">ຄະແນນລວມ</span>
                  <strong>{selectedSub.totalScore} / {selectedSub.maxTotalScore}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">ເປີເຊັນ</span>
                  <strong className={selectedSub.passed ? 'text-emerald-700' : 'text-rose-700'}>
                    {selectedSub.percentage}% ({selectedSub.passed ? 'ຜ່ານ' : 'ບໍ່ຜ່ານ'})
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                <p>ອາຍຸ: <strong>{selectedSub.studentInfo?.age}</strong> ປີ, ເພດ: <strong>{selectedSub.studentInfo?.gender}</strong></p>
                <p>ທີ່ຢູ່: <strong>ບ້ານ {selectedSub.studentInfo?.village}, ເມືອງ {selectedSub.studentInfo?.district}, ແຂວງ {selectedSub.studentInfo?.province}</strong></p>
                {selectedSub.studentInfo?.organization && <p>ໜ່ວຍງານ: <strong>{selectedSub.studentInfo.organization}</strong></p>}
                <p>ວັນທີສອບເສັງ: <strong>{selectedSub.studentInfo?.examDate || selectedSub.submittedAt?.slice(0, 10)}</strong></p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteSubmission(selectedSub.id)}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
              >
                ລຶບຜົນສອບ
              </button>
              <div className="flex items-center gap-2">
                {selectedSub.passed && (
                  <button
                    onClick={() => {
                      onViewCertificate(selectedSub);
                      setSelectedSub(null);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                  >
                    ພິມໃບຢັ້ງຢືນ
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-1.5 bg-slate-100 text-xs font-semibold rounded-xl"
                >
                  ປິດ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
