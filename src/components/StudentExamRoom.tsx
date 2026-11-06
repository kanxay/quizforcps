import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Award,
  Printer,
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
    const el = document.getElementById(`q-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
     VIEW 1: INTAKE PERSONAL DETAILS
  ======================================================== */
  if (step === 'intake') {
    return (
      <div className="w-full max-w-xl mx-auto py-8 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            ກັບຄືນລາຍການບົດສອບ
          </button>

          <div className="pb-4 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
              {exam.subject}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">{exam.title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              ເວລາສອບເສັງ: <strong>{exam.durationMinutes} ນາທີ</strong> · ຈຳນວນຂໍ້ສອບ: <strong>{exam.questions.length} ຂໍ້</strong>
            </p>
          </div>

          <form onSubmit={handleStartExam} className="mt-5 space-y-4 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              ຂໍ້ມູນປະຈຳຕົວຂອງຜູ້ສອບເສັງ (Examinee Information)
            </h3>

            {intakeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{intakeError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ຊື່ ແລະ ນາມສະກຸນ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={studentInfo.fullName}
                onChange={(e) => setStudentInfo((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="ທ້າວ / ນາງ..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ອາຍຸ (ປີ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentInfo.age}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="ເຊັ່ນ: 24"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ເພດ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={studentInfo.gender}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, gender: e.target.value as 'ຊາຍ' | 'ຍິງ' }))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ຊາຍ">ຊາຍ</option>
                  <option value="ຍິງ">ຍິງ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ບ້ານ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentInfo.village}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, village: e.target.value }))}
                  placeholder="ບ້ານ..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ເມືອງ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentInfo.district}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, district: e.target.value }))}
                  placeholder="ເມືອງ..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ແຂວງ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentInfo.province}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, province: e.target.value }))}
                  placeholder="ແຂວງ..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {isPreFilledFromProfile && (
              <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>ດຶງຂໍ້ມູນຈາກໂປຣໄຟລ໌ຂອງທ່ານອັດຕະໂນມັດ (ສາມາດປັບປຸງໄດ້)</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ໜ່ວຍງານ / ອົງການອາສາສະໝັກ (ບໍ່ບັງຄັບ)
              </label>
              <input
                type="text"
                value={studentInfo.organization || ''}
                onChange={(e) => setStudentInfo((prev) => ({ ...prev, organization: e.target.value }))}
                placeholder="ເຊັ່ນ: ໜ່ວຍກູ້ໄພສຸກເສີນ, ສະມາຄົມອາສາສະໝັກ..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Exam Access Code if enabled */}
            {systemSecurity?.enableExamCode && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  ລະຫັດຜ່ານເຂົ້າສອບເສັງ (Exam Access Code) <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-amber-800 mb-2">
                  ບົດສອບເສັງນີ້ມີລະບົບປ້ອງກັນ. ກະລຸນາໃສ່ລະຫັດຜ່ານທີ່ໄດ້ຮັບຈາກອາຈານ ຫຼື ຜູ້ດູແລລະບົບ.
                </p>
                <input
                  type="password"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  placeholder="ໃສ່ລະຫັດຜ່ານເຂົ້າສອບ..."
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                ເລີ່ມຕົ້ນສອບເສັງທັນທີ
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ========================================================
     VIEW 2: ACTIVE EXAM ROOM (SINGLE SCROLL + FLOATING NAV)
  ======================================================== */
  if (step === 'taking') {
    const isTimeUrgent = timeLeft < 300; // less than 5 mins
    const isTimeCritical = timeLeft < 60; // less than 1 min

    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Floating Security Tab-Switch Warning Banner */}
        {showTabWarning && systemSecurity?.detectTabSwitch && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-rose-400">
            <ShieldAlert className="w-5 h-5 text-white shrink-0 animate-bounce" />
            <span>⚠️ ແຈ້ງເຕືອນຄວາມປອດໄພ: ທ່ານໄດ້ສະຫຼັບໜ້າຈໍ ຫຼື ເປີດແຖບອື່ນ ({tabSwitchCount} ຄັ້ງ)! ກະລຸນາຕັ້ງໃຈເຮັດບົດສອບເສັງ.</span>
            <button
              onClick={() => setShowTabWarning(false)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
            >
              ຮັບຊາບ
            </button>
          </div>
        )}

        {/* Sticky Top Header with Countdown & Progress */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                {exam.title}
              </h2>
              <p className="text-[11px] text-slate-500">
                ຜູ້ສອບ: <span className="font-semibold text-slate-800">{studentInfo.fullName}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Security Active Badge */}
              {systemSecurity?.antiCheatingCopy && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ໂໝດປ້ອງກັນ</span>
                </div>
              )}

              {/* Progress pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
                <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>ຕອບແລ້ວ {answeredCount} / {exam.questions.length} ຂໍ້</span>
              </div>

              {/* Countdown Timer */}
              <div
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold border transition-colors ${
                  isTimeCritical
                    ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                    : isTimeUrgent
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTimer(timeLeft)}</span>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ສົ່ງຂໍ້ສອບ</span>
              </button>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="max-w-6xl mx-auto mt-4 px-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          </div>
        )}

        {/* Exam Body: Split into Questions Flow & Floating Question Grid */}
        <div className="max-w-6xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Main Questions List */}
          <div
            onContextMenu={(e) => systemSecurity?.antiCheatingCopy && e.preventDefault()}
            onCopy={(e) => systemSecurity?.antiCheatingCopy && e.preventDefault()}
            className={`lg:col-span-3 space-y-5 ${systemSecurity?.antiCheatingCopy ? 'select-none' : ''}`}
          >
            {exam.questions.map((q, index) => {
              const qNum = index + 1;
              const answered = isQuestionAnswered(q);

              return (
                <div
                  key={q.id}
                  id={`q-${q.id}`}
                  className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition-all ${
                    answered ? 'border-slate-200' : 'border-slate-200'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {qNum}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {q.type === 'single_choice' && 'ເລືອກຄຳຕອບດຽວ'}
                        {q.type === 'multiple_choice' && 'ເລືອກໄດ້ຫຼາຍຄຳຕອບ'}
                        {q.type === 'text' && 'ຂຽນຕອບ'}
                      </span>
                    </div>

                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                      {q.points} ຄະແນນ
                    </span>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                    {q.text}
                  </p>

                  {/* Answers Section */}
                  <div className="mt-4 space-y-2.5">
                    {/* 1. Single Choice Options */}
                    {q.type === 'single_choice' && q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = answers[q.id] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSingleSelect(q.id, optIdx)}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-start gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/80 border-blue-500 text-blue-950 font-semibold shadow-xs ring-1 ring-blue-500/20'
                                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 text-slate-800'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 text-slate-500'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="flex-1 leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Multiple Choice Options */}
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-blue-600 font-semibold">
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
                              className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-start gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/80 border-blue-500 text-blue-950 font-semibold shadow-xs ring-1 ring-blue-500/20'
                                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 text-slate-800'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 text-slate-500'
                                }`}
                              >
                                {isSelected ? '✓' : String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="flex-1 leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Text / Essay Answer */}
                    {q.type === 'text' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          ຄຳຕອບຂອງທ່ານ:
                        </label>
                        <textarea
                          rows={4}
                          value={(answers[q.id] as string) || ''}
                          onChange={(e) => handleTextChange(q.id, e.target.value)}
                          placeholder="ພິມຄຳຕອບລະອຽດຂອງທ່ານທີ່ນີ້..."
                          className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          * ຂໍ້ສອບແບບຂຽນຕອບຈະໄດ້ຮັບການກວດ ແລະ ໃຫ້ຄະແນນໂດຍອາຈານຜູ້ອອກຂໍ້ສອບ
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bottom Final Submit Trigger */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-xs">
              <p className="text-xs text-slate-600 mb-3">
                ເມື່ອທ່ານກວດກາຄຳຕອບຄົບຖ້ວນແລ້ວ ກະລຸນາກົດປຸ່ມສົ່ງຂໍ້ສອບດ້ານລຸ່ມນີ້
              </p>
              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
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

          {/* Floating/Sticky Question Grid Navigator (Right side on desktop) */}
          <div className="hidden lg:block lg:col-span-1 sticky top-24">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
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
                      className={`h-9 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
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

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-blue-600" />
                  <span>ຕອບແລ້ວ ({answeredCount} ຂໍ້)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-slate-200" />
                  <span>ຍັງບໍ່ທັນຕອບ ({exam.questions.length - answeredCount} ຂໍ້)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================
     VIEW 3: SUBMISSION RESULT & PASS/FAIL SCREEN
  ======================================================== */
  if (step === 'result' && submissionResult) {
    const isPassed = submissionResult.passed;

    return (
      <div className="w-full max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 text-center">
          {/* Status Badge */}
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}
          >
            {isPassed ? <Award className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {isPassed ? 'ຍິນດີດ້ວຍ! ທ່ານສອບເສັງຜ່ານແລ້ວ' : 'ທ່ານຍັງບໍ່ຜ່ານເກນການສອບເສັງ'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ບົດສອບ: <strong>{exam.title}</strong>
          </p>

          {/* Scores Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 max-w-xl mx-auto text-center font-mono">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-sans">ຄະແນນປາລະໄນ</span>
              <strong className="text-lg text-slate-900">{submissionResult.objectiveScore} / {submissionResult.maxObjectiveScore}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-sans">ຄະແນນອັດຕະໄນ</span>
              <strong className="text-lg text-slate-900">
                {submissionResult.isFullyGraded
                  ? `${submissionResult.essayScore} / ${submissionResult.maxEssayScore}`
                  : 'ລໍຖ້າກວດ'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-sans">ຄະແນນລວມ</span>
              <strong className="text-lg text-slate-900">{submissionResult.totalScore} / {submissionResult.maxTotalScore}</strong>
            </div>
            <div
              className={`p-3 rounded-2xl border ${
                isPassed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span className="text-[11px] block font-sans">ເປີເຊັນ (%)</span>
              <strong className="text-xl font-bold">{submissionResult.percentage}%</strong>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onExit}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              ກັບຄືນລາຍການບົດສອບ
            </button>

            {isPassed && (
              <button
                onClick={() => onViewCertificate(submissionResult)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                ເບິ່ງ ແລະ ພິມໃບຢັ້ງຢືນ (Certificate)
              </button>
            )}
          </div>

          {/* Answer Breakdown Details */}
          <div className="mt-10 pt-6 border-t border-slate-100 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              ກວດກາຄຳຕອບລະອຽດ (Answer Review)
            </h3>

            {systemSecurity?.showAnswerKeys === false ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <ShieldCheck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-xs">ຄຳຕອບຂອງທ່ານຖືກບັນທຶກເຂົ້າສູ່ລະບົບຮຽບຮ້ອຍແລ້ວ</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                  ອາຈານ ແລະ ຜູ້ດູແລລະບົບໄດ້ກຳນົດປິດການສະແດງສະເລີຍຂໍ້ສອບຊົ່ວຄາວ ເພື່ອມາດຕະຖານຄວາມປອດໄພຂອງການສອບເສັງ.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {exam.questions.map((q, idx) => {
                  const ansItem = submissionResult.answers[q.id];
                  const isCorrect = ansItem?.isCorrect;

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border ${
                      q.type === 'text'
                        ? 'bg-slate-50 border-slate-200'
                        : isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800">
                        ຂໍ້ທີ {idx + 1}: {q.text}
                      </span>
                      <span className="font-mono text-[11px] font-bold">
                        {ansItem?.awardedScore} / {q.points} ຄະແນນ
                      </span>
                    </div>

                    {q.type === 'single_choice' && q.options && (
                      <div className="space-y-1 text-[11px]">
                        <p className="text-slate-600">
                          ຄຳຕອບຂອງທ່ານ: <strong>{ansItem?.chosenAnswer !== -1 && typeof ansItem?.chosenAnswer === 'number' ? q.options[ansItem.chosenAnswer] : 'ບໍ່ໄດ້ຕອບ'}</strong>
                        </p>
                        {!isCorrect && (
                          <p className="text-emerald-700 font-semibold">
                            ຄຳຕອບທີ່ຖືກຕ້ອງ: {typeof q.correctAnswer === 'number' && q.options[q.correctAnswer]}
                          </p>
                        )}
                      </div>
                    )}

                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-1 text-[11px]">
                        <p className="text-slate-600">
                          ຄຳຕອບຂອງທ່ານ: <strong>
                            {Array.isArray(ansItem?.chosenAnswer) && ansItem.chosenAnswer.length > 0
                              ? ansItem.chosenAnswer.map((i) => q.options?.[i]).join(', ')
                              : 'ບໍ່ໄດ້ຕອບ'}
                          </strong>
                        </p>
                        {!isCorrect && (
                          <p className="text-emerald-700 font-semibold">
                            ຄຳຕອບທີ່ຖືກຕ້ອງ: {(q.correctAnswer as number[])?.map((i) => q.options?.[i]).join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {q.type === 'text' && (
                      <div className="space-y-1.5 text-[11px]">
                        <p className="text-slate-700">
                          ຄຳຕອບຂອງທ່ານ: <span className="font-medium">{String(ansItem?.chosenAnswer || 'ບໍ່ໄດ້ຕອບ')}</span>
                        </p>
                        {q.sampleAnswer && (
                          <p className="text-blue-700">
                            ຄຳຕອບຕົວຢ່າງ: {q.sampleAnswer}
                          </p>
                        )}
                        <p className="text-slate-400">
                          {ansItem?.teacherFeedback ? `ຄຳຕິຊົມຈາກອາຈານ: ${ansItem.teacherFeedback}` : 'ສະຖານະ: ລໍຖ້າອາຈານໃຫ້ຄະແນນ'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  return null;
}
