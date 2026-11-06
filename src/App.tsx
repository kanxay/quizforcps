import { useState, useEffect } from 'react';
import { BookOpen, AlertTriangle, RefreshCw } from 'lucide-react';
import type { AuthSession, Exam, Submission } from './types';
import { getTursoConfig, initDatabase, fetchExams } from './lib/turso';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { TursoConfigModal } from './components/TursoConfigModal';
import { StudentExamList } from './components/StudentExamList';
import { StudentExamRoom } from './components/StudentExamRoom';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { CertificatePrintView } from './components/CertificatePrintView';
import { StudentSettingsModal } from './components/StudentSettingsModal';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  // Active view states
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [certificateSubmission, setCertificateSubmission] = useState<Submission | null>(null);

  // Modals & Connection Status
  const [isTursoConfigOpen, setIsTursoConfigOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isStudentSettingsOpen, setIsStudentSettingsOpen] = useState(false);
  const [isTursoConfigured, setIsTursoConfigured] = useState(false);
  const [dbStatusError, setDbStatusError] = useState<string | null>(null);

  // Initialize DB and load exams
  const checkAndInitDb = async () => {
    const config = getTursoConfig();
    setIsTursoConfigured(config.isConfigured);

    if (config.isConfigured) {
      try {
        const res = await initDatabase();
        if (res.success) {
          setDbStatusError(null);
          loadExamsList();
        } else {
          setDbStatusError(res.message);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setDbStatusError(msg);
      }
    } else {
      setDbStatusError('ກະລຸນາຕັ້ງຄ່າ Turso Database ເພື່ອເລີ່ມຕົ້ນໃຊ້ງານ');
    }
  };

  const loadExamsList = async () => {
    setLoadingExams(true);
    try {
      const list = await fetchExams();
      setExams(list);
    } catch (err) {
      console.warn('Exams fetch warn:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    checkAndInitDb();

    // Check saved session in localStorage
    const savedSession = localStorage.getItem('emscps_auth_session');
    if (savedSession) {
      try {
        const parsed: AuthSession = JSON.parse(savedSession);
        if (parsed.role === 'student' || parsed.role === 'admin' || (parsed.role === 'teacher' && parsed.teacher)) {
          setSession(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
    // No session -> open login modal
    setIsLoginModalOpen(true);
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    setIsLoginModalOpen(false);
    setSelectedExam(null);
    setCertificateSubmission(null);
    checkAndInitDb();
  };

  const handleLogout = () => {
    localStorage.removeItem('emscps_auth_session');
    setSession(null);
    setSelectedExam(null);
    setCertificateSubmission(null);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Turso Not Configured Warning Banner - only for Admin */}
      {!isTursoConfigured && session?.role === 'admin' && (
        <div className="no-print bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>ຍັງບໍ່ທັນໄດ້ກຳນົດຄ່າ Turso Database. ກະລຸນາຕັ້ງຄ່າ URL ແລະ Auth Token ເພື່ອເຊື່ອມຕໍ່.</span>
          </div>
          <button
            onClick={() => setIsTursoConfigOpen(true)}
            className="px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            ຕັ້ງຄ່າດຽວນີ້
          </button>
        </div>
      )}

      {/* Main Navbar */}
      {session && !selectedExam && !certificateSubmission && (
        <Navbar
          session={session}
          onLogout={handleLogout}
          onOpenTursoConfig={() => setIsTursoConfigOpen(true)}
          onOpenStudentSettings={() => setIsStudentSettingsOpen(true)}
          isTursoConfigured={isTursoConfigured}
        />
      )}

      {/* Main Content View Container */}
      <main className="flex-1">
        {/* Certificate View */}
        {certificateSubmission ? (
          <CertificatePrintView
            submission={certificateSubmission}
            onBack={() => setCertificateSubmission(null)}
          />
        ) : selectedExam ? (
          /* Active Exam Taking Room */
          <StudentExamRoom
            exam={selectedExam}
            onExit={() => {
              setSelectedExam(null);
              loadExamsList();
            }}
            onViewCertificate={(sub) => setCertificateSubmission(sub)}
          />
        ) : !session ? (
          /* Zero State Landing */
          <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ລະບົບສອບເສັງອາສາສະໝັກອອນລາຍ
            </h1>
            <p className="text-sm font-semibold text-blue-700 mt-1">ໂຮງໝໍແຂວງຈຳປາສັກ (Champasak Provincial Hospital)</p>
            <p className="text-xs text-slate-500 mt-2 max-w-md">
              ລະບົບສອບເສັງ ແລະ ຢັ້ງຢືນມາດຕະຖານຄວາມຮູ້ອາສາສະໝັກ ມີຄົບວົງຈອນ: ອອກຂໍ້ສອບ, ສອບເສັງ, ກວດຄະແນນ ແລະ ອອກໃບຢັ້ງຢືນ
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="mt-6 px-7 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              ເຂົ້າສູ່ລະບົບສອບເສັງ
            </button>
          </div>
        ) : session.role === 'student' ? (
          /* Volunteer Examinee Exam Catalog */
          <StudentExamList
            exams={exams}
            onSelectExam={(exam) => setSelectedExam(exam)}
            onOpenSettings={() => setIsStudentSettingsOpen(true)}
            loading={loadingExams}
          />
        ) : session.role === 'teacher' && session.teacher ? (
          /* Teacher Question Bank & Grading Dashboard */
          <TeacherDashboard teacher={session.teacher} />
        ) : session.role === 'admin' ? (
          /* Admin Analytics & System Settings */
          <AdminDashboard
            onViewCertificate={(sub) => setCertificateSubmission(sub)}
            onOpenTursoConfig={() => setIsTursoConfigOpen(true)}
            isTursoConfigured={isTursoConfigured}
          />
        ) : null}
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Student Settings & Security Modal */}
      <StudentSettingsModal
        isOpen={isStudentSettingsOpen}
        onClose={() => setIsStudentSettingsOpen(false)}
        onViewCertificate={(sub) => {
          setCertificateSubmission(sub);
          setIsStudentSettingsOpen(false);
        }}
      />

      {/* Turso Database Config Modal */}
      <TursoConfigModal
        isOpen={isTursoConfigOpen}
        onClose={() => setIsTursoConfigOpen(false)}
        onSaved={() => {
          checkAndInitDb();
        }}
      />
    </div>
  );
}
