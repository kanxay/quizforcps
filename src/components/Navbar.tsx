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
    <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Wordmark with mobile-safe truncation */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate block leading-tight">
              CPS hospital Volunteer Exam
            </span>
            <span className="text-[11px] font-medium text-blue-700 truncate block leading-tight">
              ໂຮງໝໍແຂວງຈຳປາສັກ · ສອບເສັງອາສາສະໝັກ
            </span>
          </div>
        </div>

        {/* Zone 2: Role View Title */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {isStudent && 'ພື້ນທີ່ສອບເສັງ (Examinee Portal)'}
            {isTeacher && `ຫ້ອງການອາຈານ: ${session.teacher?.fullName}`}
            {isAdmin && 'ລະບົບຄວບຄຸມສ່ວນກາງ (Admin Console)'}
          </span>
        </div>

        {/* Zone 3: User Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Turso Database Status Button - Admin Only */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenTursoConfig}
              className={`min-h-[40px] min-w-[40px] px-2.5 py-2 rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isTursoConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="ຕັ້ງຄ່າ Turso Database"
            >
              <Database className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px] font-semibold whitespace-nowrap">
                {isTursoConfigured ? 'Turso' : 'ຕັ້ງ Turso'}
              </span>
            </button>
          )}

          {/* Role Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-700">
            {isStudent && (
              <>
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-900 whitespace-nowrap">ອາສາສະໝັກ</span>
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
                <span className="font-semibold text-slate-900 whitespace-nowrap">Admin</span>
              </>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
            title="ອອກຈາກລະບົບ"
            aria-label="ອອກຈາກລະບົບ"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline whitespace-nowrap">ອອກຈາກລະບົບ</span>
          </button>
        </div>
      </div>
    </header>
  );
}
