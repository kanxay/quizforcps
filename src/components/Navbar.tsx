import { BookOpen, LogOut, Database, User, Shield, GraduationCap } from 'lucide-react';
import type { AuthSession } from '../types';

interface Props {
  session: AuthSession;
  onLogout: () => void;
  onOpenTursoConfig: () => void;
  onOpenStudentSettings?: () => void;
  isTursoConfigured: boolean;
}

export function Navbar({ session, onLogout, onOpenTursoConfig, onOpenStudentSettings, isTursoConfigured }: Props) {
  const isStudent = session.role === 'student';
  const isTeacher = session.role === 'teacher';
  const isAdmin = session.role === 'admin';

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single Wordmark Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap block leading-tight">
              CPS hospital Volunteer Exam
            </span>
            <span className="text-[11px] font-medium text-blue-700 whitespace-nowrap block leading-tight">
              ໂຮງໝໍແຂວງຈຳປາສັກ · ສອບເສັງອາສາສະໝັກ
            </span>
          </div>
        </div>

        {/* Zone 2: Role View Title */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-xl text-slate-700">
            {isStudent && 'ພື້ນທີ່ສອບເສັງ (Examinee Portal)'}
            {isTeacher && `ຫ້ອງການອາຈານ: ${session.teacher?.fullName}`}
            {isAdmin && 'ລະບົບຄວບຄຸມສ່ວນກາງ (Admin Console)'}
          </span>
        </div>

        {/* Zone 3: User Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Turso Database Status Button - Admin Only */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenTursoConfig}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isTursoConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="ຕັ້ງຄ່າ Turso Database"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px] font-semibold">
                {isTursoConfigured ? 'Turso' : 'ຕັ້ງ Turso'}
              </span>
            </button>
          )}



          {/* Role Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-700">
            {isStudent && (
              <>
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-900">ອາສາສະໝັກ</span>
              </>
            )}
            {isTeacher && (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-900 max-w-[120px] truncate" title={session.teacher?.fullName}>
                  {session.teacher?.fullName}
                </span>
              </>
            )}
            {isAdmin && (
              <>
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-900">Admin</span>
              </>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="ອອກຈາກລະບົບ"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">ອອກຈາກລະບົບ</span>
          </button>
        </div>
      </div>
    </header>
  );
}
