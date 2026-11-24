import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Send,
  HelpCircle,
  FileText,
  User,
  CheckSquare,
  Square,
  Radio,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Eye,
  LayoutGrid,
  X,
} from 'lucide-react';
import type { Exam, Question, StudentInfo, StudentAnswerItem, Submission, SystemSecuritySettings } from '../types';
import { createSubmission, getSystemSettings, getStudentProfile, fetchSubmissions } from '../lib/turso';

interface Props {
  exam: Exam;
  onExit: () => void;
  onViewCertificate: (sub: Submission) => void;
}

export function StudentExamRoom({ exam, onExit, onViewCertificate }: Props) {
  // Step: 'intake' -> 'taking' -> 'result'
  const [step, setStep] = useState<'intake' | 'taking' | 'result'>('intake');

  // System & Student Security States
  const [systemSecurity, setSystemSecurity] = useState<SystemSecuritySettings | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [isPreFilledFromProfile, setIsPreFilledFromProfile] = useState(false);

  // Intake Personal Info State
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    fullName: '',
    age: '',
    gender: 'ຊາຍ',
    village: '',
    district: '',
    province: 'ຈຳປາສັກ',
    organization: '',
    examDate: new Date().toISOString().slice(0, 10),
  });
  const [intakeError, setIntakeError] = useState<string | null>(null);

  // Exam Answers State: questionId -> value
  // for single: number, for multiple: number[], for text: string
  const [answers, setAnswers] = useState<Record<string, number | number[] | string>>({});

  // Countdown timer state (seconds)
  const [timeLeft, setTimeLeft] = useState<number>(exam.durationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Result state
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [passThreshold, setPassThreshold] = useState(50);

  // Mobile Question Grid Drawer state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const draftKey = `lao_exam_draft_${exam.id}`;

  // Restore draft and prefill from student profile
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    let draftFound = false;

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.studentInfo) {
          setStudentInfo(parsed.studentInfo);
          draftFound = true;
        }
        if (parsed.answers) {
          setAnswers(parsed.answers);
        }
      } catch {
        // ignore
      }
    }

    if (!draftFound) {
      const profile = getStudentProfile();
      if (profile && profile.fullName) {
        setStudentInfo((prev) => ({
          ...prev,
          fullName: profile.fullName,
          age: profile.age || prev.age,
          gender: profile.gender || prev.gender,
          village: profile.village || prev.village,
          district: profile.district || prev.district,
          province: profile.province || prev.province,
          organization: profile.organization || prev.organization,
        }));
        setIsPreFilledFromProfile(true);
      }
    }

    // Load full system security settings
    getSystemSettings().then((s) => {
      setSystemSecurity(s);
      setPassThreshold(s.passPercentage);
    });
  }, [exam.id, draftKey]);

  // Tab Switch & Blur Security Detector during exam taking
  useEffect(() => {
    if (step !== 'taking' || !systemSecurity?.detectTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        setShowTabWarning(true);
      }
    };

    const handleBlur = () => {
      setTabSwitchCount((prev) => prev + 1);
      setShowTabWarning(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [step, systemSecurity?.detectTabSwitch]);

  // Auto-save draft whenever answers or studentInfo change
  useEffect(() => {
    if (step === 'taking') {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ studentInfo, answers }));
      } catch {
        // ignore
      }
    }
  }, [answers, studentInfo, step, draftKey]);

  // Timer Countdown Effect
  useEffect(() => {
    if (step !== 'taking') return;

    if (timeLeft <= 0) {
      // Time is up! Auto-submit
      handleFinalSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError(null);

    if (!studentInfo.fullName.trim()) {
      setIntakeError('ກະລຸນາປ້ອນ ຊື່ ແລະ ນາມສະກຸນ ຂອງຜູ້ສອບ');
      return;
    }
    if (!studentInfo.age.trim()) {
      setIntakeError('ກະລຸນາປ້ອນ ອາຍຸ');
      return;
    }
    if (!studentInfo.village.trim() || !studentInfo.district.trim() || !studentInfo.province.trim()) {
      setIntakeError('ກະລຸນາປ້ອນ ບ້ານ, ເມືອງ, ແລະ ແຂວງ');
      return;
    }

    // Check Exam Access Code
    if (systemSecurity?.enableExamCode && systemSecurity.examAccessCode) {
      if (accessCodeInput.trim() !== systemSecurity.examAccessCode.trim()) {
        setIntakeError('ລະຫັດຜ່ານເຂົ້າສອບເສັງ (Exam Access Code) ບໍ່ຖືກຕ້ອງ! ກະລຸນາກວດສອບຄືນ.');
        return;
      }
    }

    // Check Limit One Attempt Policy
    if (systemSecurity?.limitOneAttempt) {
      try {
        const all = await fetchSubmissions();
        const existing = all.find(
          (s) =>
            s.examId === exam.id &&
            s.studentInfo?.fullName?.toLowerCase().trim() === studentInfo.fullName.toLowerCase().trim()
        );
        if (existing) {
          setIntakeError('ທ່ານໄດ້ເຄີຍສົ່ງບົດສອບເສັງນີ້ແລ້ວ. ລະບົບກຳນົດໃຫ້ສອບເສັງໄດ້ພຽງ 1 ຄັ້ງຕໍ່ຄົນ.');
          return;
        }
      } catch {
        // ignore
      }
    }

    setStep('taking');
  };

  // Answer handlers
  const handleSingleSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleMultipleSelect = (questionId: string, optionIndex: number) => {
    const current = (answers[questionId] as number[]) || [];
    let updated: number[];
    if (current.includes(optionIndex)) {
      updated = current.filter((idx) => idx !== optionIndex);
    } else {
      updated = [...current, optionIndex].sort((a, b) => a - b);
    }
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  // Check if question is answered
  const isQuestionAnswered = (q: Question): boolean => {
    const val = answers[q.id];
    if (val === undefined || val === null) return false;
    if (q.type === 'single_choice') return typeof val === 'number';
    if (q.type === 'multiple_choice') return Array.isArray(val) && val.length > 0;
    if (q.type === 'text') return typeof val === 'string' && val.trim().length > 0;
    return false;
  };

  const answeredCount = exam.questions.filter((q) => isQuestionAnswered(q)).length;

  const scrollToQuestion = (id: string) => {
    setIsMobileNavOpen(false);
    setTimeout(() => {
      const el = document.getElementById(`q-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Final Evaluation & Submission
  const handleFinalSubmit = async (auto = false) => {
    if (!auto) {
      const unanswered = exam.questions.length - answeredCount;
      if (unanswered > 0) {
        const confirmMsg = `ທ່ານຍັງບໍ່ທັນໄດ້ຕອບອີກ ${unanswered} ຂໍ້. ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການສົ່ງຂໍ້ສອບຕອນນີ້?`;
        if (!window.confirm(confirmMsg)) return;
      } else {
        if (!window.confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການສົ່ງຄຳຕອບບົດສອບເສັງ?')) return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Grade objective questions & initialize text questions
      let objectiveScore = 0;
      let maxObjectiveScore = 0;
      let maxEssayScore = 0;
      const gradedAnswers: Record<string, StudentAnswerItem> = {};
      let hasEssay = false;

      exam.questions.forEach((q) => {
        const studentAns = answers[q.id];

        if (q.type === 'single_choice') {
          maxObjectiveScore += q.points;
          const isCorrect = studentAns !== undefined && studentAns === q.correctAnswer;
          const score = isCorrect ? q.points : 0;
          objectiveScore += score;
          gradedAnswers[q.id] = {
            questionId: q.id,
            type: q.type,
            chosenAnswer: studentAns !== undefined ? (studentAns as number) : -1,
            isCorrect,
            awardedScore: score,
            maxScore: q.points,
          };
        } else if (q.type === 'multiple_choice') {
          maxObjectiveScore += q.points;
          const correctArr = (q.correctAnswer as number[]) || [];
          const studentArr = Array.isArray(studentAns) ? studentAns : [];

          // Full score if and only if all correct chosen and no wrong chosen
          const isCorrect =
            correctArr.length === studentArr.length &&
            correctArr.every((v) => studentArr.includes(v));

          const score = isCorrect ? q.points : 0;
          objectiveScore += score;
          gradedAnswers[q.id] = {
            questionId: q.id,
            type: q.type,
            chosenAnswer: studentArr,
            isCorrect,
            awardedScore: score,
            maxScore: q.points,
          };
        } else if (q.type === 'text') {
          hasEssay = true;
          maxEssayScore += q.points;
          gradedAnswers[q.id] = {
            questionId: q.id,
            type: q.type,
            chosenAnswer: typeof studentAns === 'string' ? studentAns : '',
            awardedScore: 0, // awaits teacher grading
            maxScore: q.points,
          };
        }
      });

      const maxTotalScore = maxObjectiveScore + maxEssayScore;
      const totalScore = objectiveScore; // essay score initially 0
      const percentage =
        maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100 * 10) / 10 : 0;
      const passed = percentage >= passThreshold;
      const isFullyGraded = !hasEssay; // if no essay, fully graded immediately!

      const submissionData: Omit<Submission, 'id' | 'submittedAt'> = {
        examId: exam.id,
        examTitle: exam.title,
        subject: exam.subject,
        teacherName: exam.teacherName,
        studentInfo,
        answers: gradedAnswers,
        objectiveScore,
        maxObjectiveScore,
        essayScore: 0,
        maxEssayScore,
        totalScore,
        maxTotalScore,
        percentage,
        passed,
        isFullyGraded,
      };

      const created = await createSubmission(submissionData);
      // Remove draft
      localStorage.removeItem(draftKey);

      setSubmissionResult(created);
      setStep('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(`ສົ່ງບົດສອບເສັງບໍ່ສຳເລັດ: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format seconds to MM:SS
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  /* ========================================================
     VIEW 1: FULL-SCREEN EXAMINEE INFORMATION FORM
  ======================================================== */
  if (step === 'intake') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Compact Full-Screen Mobile Top Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-2 -ml-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>ກັບຄືນເລືອກອາຈານ / ຫົວຂໍ້</span>
          </button>
          <span className="text-[11px] font-medium text-slate-400 truncate hidden sm:inline">
            ໂຮງໝໍແຂວງຈຳປາສັກ
          </span>
        </div>

        <div className="w-full max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex-1">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-8">
            <div className="pb-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-blue-700">
                {exam.teacherName} · {exam.subject}
              </p>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 leading-snug">
                {exam.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                ເວລາສອບເສັງ: <strong className="text-slate-800 font-mono tabular-nums">{exam.durationMinutes} ນາທີ</strong> · ຈຳນວນຂໍ້ສອບ:{' '}
                <strong className="text-slate-800 font-mono tabular-nums">{exam.questions.length} ຂໍ້</strong>
              </p>
            </div>

            <form onSubmit={handleStartExam} className="mt-5 space-y-4 text-xs sm:text-sm">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                ຂໍ້ມູນປະຈຳຕົວຂອງຜູ້ສອບເສັງ (Examinee Information)
              </h3>

              {intakeError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{intakeError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ຊື່ ແລະ ນາມສະກຸນ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentInfo.fullName}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="ທ້າວ / ນາງ..."
                  className="w-full min-h-[46px] px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ອາຍຸ (ປີ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={studentInfo.age}
                    onChange={(e) => setStudentInfo((prev) => ({ ...prev, age: e.target.value }))}
                    placeholder="ເຊັ່ນ: 24"
                    className="w-full min-h-[46px] px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ເພດ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={studentInfo.gender}
                    onChange={(e) => setStudentInfo((prev) => ({ ...prev, gender: e.target.value as 'ຊາຍ' | 'ຍິງ' }))}
                    className="w-full min-h-[46px] px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ຊາຍ">ຊາຍ</option>
                    <option value="ຍິງ">ຍິງ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ບ້ານ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentInfo.village}
                    onChange={(e) => setStudentInfo((prev) => ({ ...prev, village: e.target.value }))}
                    placeholder="ບ້ານ..."
                    className="w-full min-h-[46px] px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ເມືອງ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentInfo.district}
                    onChange={(e) => setStudentInfo((prev) => ({ ...prev, district: e.target.value }))}
                    placeholder="ເມືອງ..."
                    className="w-full min-h-[46px] px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ແຂວງ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentInfo.province}
                    onChange={(e) => setStudentInfo((prev) => ({ ...prev, province: e.target.value }))}
                    placeholder="ແຂວງ..."
                    className="w-full min-h-[46px] px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {isPreFilledFromProfile && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>ດຶງຂໍ້ມູນຈາກໂປຣໄຟລ໌ຂອງທ່ານອັດຕະໂນມັດ (ສາມາດປັບປຸງໄດ້)</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ໜ່ວຍງານ / ອົງການອາສາສະໝັກ (ບໍ່ບັງຄັບ)
                </label>
                <input
                  type="text"
                  value={studentInfo.organization || ''}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, organization: e.target.value }))}
                  placeholder="ເຊັ່ນ: ໜ່ວຍກູ້ໄພສຸກເສີນ, ສະມາຄົມອາສາສະໝັກ..."
                  className="w-full min-h-[46px] px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Exam Access Code if enabled */}
              {systemSecurity?.enableExamCode && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <label className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>ລະຫັດຜ່ານເຂົ້າສອບເສັງ (Exam Access Code) <span className="text-rose-500">*</span></span>
                  </label>
                  <p className="text-xs text-amber-800 mb-2">
                    ບົດສອບເສັງນີ້ມີລະບົບປ້ອງກັນ. ກະລຸນາໃສ່ລະຫັດຜ່ານທີ່ໄດ້ຮັບຈາກອາຈານ ຫຼື ຜູ້ດູແລລະບົບ.
                  </p>
                  <input
                    type="password"
                    value={accessCodeInput}
                    onChange={(e) => setAccessCodeInput(e.target.value)}
                    placeholder="ໃສ່ລະຫັດຜ່ານເຂົ້າສອບ..."
                    className="w-full min-h-[46px] px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-mono text-base sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[48px] py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>ເລີ່ມຕົ້ນສອບເສັງທັນທີ</span>
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================
     VIEW 2: ACTIVE EXAM ROOM (MOBILE STICKY BOTTOM BAR + DESKTOP SIDEBAR)
  ======================================================== */
  if (step === 'taking') {
    const isTimeUrgent = timeLeft < 300; // less than 5 mins
    const isTimeCritical = timeLeft < 60; // less than 1 min

    return (
      <div className="min-h-screen bg-slate-50 pb-24 lg:pb-12">
        {/* Floating Security Tab-Switch Warning Banner (Mobile-safe width) */}
        {showTabWarning && systemSecurity?.detectTabSwitch && (
          <div className="fixed top-16 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs font-bold border border-rose-400">
            <div className="flex items-start gap-2.5 min-w-0">
              <ShieldAlert className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <span className="leading-snug">
                ແຈ້ງເຕືອນຄວາມປອດໄພ: ທ່ານໄດ້ສະຫຼັບໜ້າຈໍ ({tabSwitchCount} ຄັ້ງ)! ກະລຸນາຕັ້ງໃຈເຮັດບົດສອບເສັງ.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTabWarning(false)}
              className="min-h-[36px] px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
            >
              ຮັບຊາບ
            </button>
          </div>
        )}

        {/* Compact Sticky Top Bar (56px mobile / 64px desktop) */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-3 sm:px-6 h-14 sm:h-16 flex items-center">
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-tight">
                {exam.title}
              </h2>
              <p className="text-[11px] text-slate-500 truncate leading-tight">
                ຜູ້ສອບ: <span className="font-semibold text-slate-800">{studentInfo.fullName}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Desktop Progress Text */}
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                ຕອບແລ້ວ <span className="font-mono tabular-nums">{answeredCount}/{exam.questions.length}</span> ຂໍ້
              </span>

              {/* Countdown Timer */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono tabular-nums text-xs sm:text-sm font-bold border transition-colors whitespace-nowrap ${
                  isTimeCritical
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : isTimeUrgent
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>{formatTimer(timeLeft)}</span>
              </div>

              {/* Desktop Top Submit Button (Mobile uses Sticky Bottom Bar) */}
              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="hidden lg:flex items-center gap-1.5 min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ສົ່ງຂໍ້ສອບ</span>
              </button>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="max-w-6xl mx-auto mt-4 px-3 sm:px-6">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          </div>
        )}

        {/* Exam Body: Single Scrollable Column on Mobile, Split with Right Grid on Desktop */}
        <div className="max-w-6xl mx-auto px-3 sm:px-6 mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-6 items-start">
          {/* Main Questions List */}
          <div
            onContextMenu={(e) => systemSecurity?.antiCheatingCopy && e.preventDefault()}
            onCopy={(e) => systemSecurity?.antiCheatingCopy && e.preventDefault()}
            className={`lg:col-span-3 space-y-4 sm:space-y-5 ${systemSecurity?.antiCheatingCopy ? 'select-none' : ''}`}
          >
            {exam.questions.map((q, index) => {
              const qNum = index + 1;
              const answered = isQuestionAnswered(q);

              return (
                <div
                  key={q.id}
                  id={`q-${q.id}`}
                  className={`scroll-mt-20 bg-white rounded-2xl border p-4 sm:p-6 shadow-xs transition-colors ${
                    answered ? 'border-blue-200/80' : 'border-slate-200'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono tabular-nums font-bold text-xs flex items-center justify-center shrink-0">
                        {qNum}
                      </span>
                      <span className="text-xs font-medium text-slate-500 truncate">
                        {q.type === 'single_choice' && 'ເລືອກຄຳຕອບດຽວ'}
                        {q.type === 'multiple_choice' && 'ເລືອກໄດ້ຫຼາຍຄຳຕອບ'}
                        {q.type === 'text' && 'ຂຽນຕອບ'}
                      </span>
                    </div>

                    <span className="font-mono tabular-nums text-xs font-bold text-blue-700 shrink-0">
                      {q.points} ຄະແນນ
                    </span>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {q.text}
                  </p>

                  {/* Answers Section */}
                  <div className="mt-4 space-y-2.5">
                    {/* 1. Single Choice Options */}
                    {q.type === 'single_choice' && q.options && (
                      <div className="space-y-2.5">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = answers[q.id] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSingleSelect(q.id, optIdx)}
                              className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border text-sm font-medium transition-all flex items-start gap-3 cursor-pointer active:scale-[0.99] ${
                                isSelected
                                  ? 'bg-blue-50/90 border-blue-500 text-blue-950 font-semibold shadow-xs ring-1 ring-blue-500/20'
                                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 text-slate-800'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-slate-300 text-slate-600'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="flex-1 leading-relaxed break-words">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Multiple Choice Options */}
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-2.5">
                        <p className="text-xs text-blue-600 font-semibold">
                          * ສາມາດເລືອກໄດ້ຫຼາຍກວ່າ 1 ຄຳຕອບ (ຄະແນນເຕັມເມື່ອເລືອກຖືກທັງໝົດ)
                        </p>
                        {q.options.map((opt, optIdx) => {
                          const selectedArr = (answers[q.id] as number[]) || [];
                          const isSelected = selectedArr.includes(optIdx);
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleMultipleSelect(q.id, optIdx)}
                              className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border text-sm font-medium transition-all flex items-start gap-3 cursor-pointer active:scale-[0.99] ${
                                isSelected
                                  ? 'bg-blue-50/90 border-blue-500 text-blue-950 font-semibold shadow-xs ring-1 ring-blue-500/20'
                                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 text-slate-800'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-slate-300 text-slate-600'
                                }`}
                              >
                                {isSelected ? '✓' : String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="flex-1 leading-relaxed break-words">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Text / Essay Answer */}
                    {q.type === 'text' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          ຄຳຕອບຂອງທ່ານ:
                        </label>
                        <textarea
                          rows={4}
                          value={(answers[q.id] as string) || ''}
                          onChange={(e) => handleTextChange(q.id, e.target.value)}
                          placeholder="ພິມຄຳຕອບລະອຽດຂອງທ່ານທີ່ນີ້..."
                          className="w-full p-3.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                        />
                        <p className="mt-1.5 text-xs text-slate-400">
                          * ຂໍ້ສອບແບບຂຽນຕອບຈະໄດ້ຮັບການກວດ ແລະ ໃຫ້ຄະແນນໂດຍອາຈານຜູ້ອອກຂໍ້ສອບ
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bottom Final Submit Trigger */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 text-center shadow-xs">
              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                ເມື່ອທ່ານກວດກາຄຳຕອບຄົບຖ້ວນແລ້ວ ກະລຸນາກົດປຸ່ມສົ່ງຂໍ້ສອບດ້ານລຸ່ມນີ້
              </p>
              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ກຳລັງສົ່ງຂໍ້ສອບ...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    ສົ່ງບົດສອບເສັງ (Submit Exam)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Floating/Sticky Question Grid Navigator (Right side on lg:+) */}
          <div className="hidden lg:block lg:col-span-1 sticky top-24">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 mb-3">
                ແຜນຜັງຂໍ້ສອບ (Question Navigator)
              </h3>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {exam.questions.map((q, i) => {
                  const answered = isQuestionAnswered(q);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQuestion(q.id)}
                      className={`h-10 rounded-xl font-mono tabular-nums text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        answered
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={`ຂໍ້ທີ ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-blue-600 shrink-0" />
                  <span>ຕອບແລ້ວ ({answeredCount} ຂໍ້)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-slate-200 shrink-0" />
                  <span>ຍັງບໍ່ທັນຕອບ ({exam.questions.length - answeredCount} ຂໍ້)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Bar (Thumb Zone: < lg) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe">
          <div className="h-14 px-3 flex items-center justify-between gap-2.5 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="flex-1 min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="whitespace-nowrap">
                ເລກຂໍ້ສອບ <span className="font-mono tabular-nums">({answeredCount}/{exam.questions.length})</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFinalSubmit(false)}
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'ກຳລັງສົ່ງ...' : 'ສົ່ງຂໍ້ສອບ'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Expandable Bottom Sheet Question Grid Drawer (< lg) */}
        {isMobileNavOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setIsMobileNavOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="ແຜນຜັງຂໍ້ສອບ"
          >
            <div
              className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[75dvh] flex flex-col pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="pt-2.5 pb-1">
                <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />
              </div>

              {/* Drawer Header */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">ແຜນຜັງຂໍ້ສອບ</h3>
                  <p className="text-xs text-slate-500">
                    ຕອບແລ້ວ <strong className="text-blue-700 font-mono tabular-nums">{answeredCount}</strong> /{' '}
                    <span className="font-mono tabular-nums">{exam.questions.length}</span> ຂໍ້ · ກົດເລກຂໍ້ເພື່ອຂ້າມໄປ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
                  aria-label="ປິດແຜນຜັງຂໍ້ສອບ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable 5-Column Touch Grid */}
              <div className="overflow-y-auto px-5 py-4 flex-1">
                <div className="grid grid-cols-5 gap-2.5">
                  {exam.questions.map((q, i) => {
                    const answered = isQuestionAnswered(q);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => scrollToQuestion(q.id)}
                        className={`min-h-[44px] rounded-xl font-mono tabular-nums text-sm font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                          answered
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-600" />
                    ຕອບແລ້ວ ({answeredCount})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-slate-200" />
                    ຍັງບໍ່ຕອບ ({exam.questions.length - answeredCount})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ========================================================
     VIEW 3: CLEAN SUBMISSION CONFIRMATION (NO SCORES SHOWN)
  ======================================================== */
  if (step === 'result' && submissionResult) {
    const formattedDate = submissionResult.submittedAt
      ? new Date(submissionResult.submittedAt).toLocaleString('lo-LA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleString('lo-LA');

    return (
      <div className="w-full max-w-2xl mx-auto py-5 sm:py-10 px-3 sm:px-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg p-5 sm:p-10 text-center">
          {/* Submission Success Icon Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 mb-4 sm:mb-5 shadow-xs">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ສົ່ງບົດສອບເສັງສຳເລັດແລ້ວ
          </h2>
          <p className="text-xs sm:text-sm font-medium text-emerald-700 mt-1">
            Exam Submitted Successfully
          </p>

          <p className="text-xs sm:text-sm text-slate-600 mt-3 max-w-md mx-auto leading-relaxed">
            ຂໍ້ມູນ ແລະ ຄຳຕອບຂອງທ່ານໄດ້ຖືກບັນທຶກເຂົ້າສູ່ລະບົບຮຽບຮ້ອຍແລ້ວ. ຄະນະກຳມະການ ແລະ ຄູອາຈານຈະດຳເນີນການກວດກາ ແລະ ປະກາດຜົນຕາມພາຍຫຼັງ.
          </p>

          {/* Submission Verification Receipt Card */}
          <div className="my-5 sm:my-6 p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/90 text-left space-y-3 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-600">
                ໃບຢືນຢັນການສົ່ງບົດສອບ (Submission Receipt)
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" />
                ບັນທຶກແລ້ວ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-[11px] text-slate-400 block">ຫົວຂໍ້ບົດສອບ</span>
                <strong className="text-slate-800 font-semibold">{exam.title}</strong>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">ລະຫັດບົດສອບເສັງ</span>
                <strong className="text-slate-800 font-mono font-bold">
                  #{submissionResult.id.slice(0, 10)}
                </strong>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">ຊື່ ແລະ ນາມສະກຸນ</span>
                <strong className="text-slate-800 font-semibold">
                  {submissionResult.studentInfo?.fullName || studentInfo.fullName || '-'}
                </strong>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">ສັງກັດ / ແຂວງ</span>
                <strong className="text-slate-800 font-semibold">
                  {submissionResult.studentInfo?.province || studentInfo.province || 'ໂຮງໝໍແຂວງຈຳປາສັກ'}
                </strong>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-[11px] text-slate-400 block">ວັນທີ & ເວລາທີ່ສົ່ງ</span>
                <span className="text-slate-700 font-medium font-mono text-xs">
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={onExit}
              className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              ກັບຄືນໜ້າເລືອກບົດສອບ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
