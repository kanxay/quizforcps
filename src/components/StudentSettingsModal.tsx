import { useState, useEffect } from 'react';
import {
  User,
  Shield,
  KeyRound,
  FileText,
  Award,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  MapPin,
  Building2,
  Clock,
  Printer,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { StudentProfile, Submission } from '../types';
import { getStudentProfile, saveStudentProfile, fetchSubmissions } from '../lib/turso';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onViewCertificate?: (sub: Submission) => void;
  onProfileUpdated?: (profile: StudentProfile) => void;
}

export function StudentSettingsModal({ isOpen, onClose, onViewCertificate, onProfileUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'history' | 'device'>('profile');

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'ຊາຍ' | 'ຍິງ'>('ຊາຍ');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('ຈຳປາສັກ');
  const [organization, setOrganization] = useState('');

  // Security fields
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Status
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Exam History
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load existing profile from storage
    const profile = getStudentProfile();
    if (profile) {
      setFullName(profile.fullName || '');
      setAge(profile.age || '');
      setGender(profile.gender || 'ຊາຍ');
      setPhone(profile.phone || '');
      setVillage(profile.village || '');
      setDistrict(profile.district || '');
      setProvince(profile.province || 'ຈຳປາສັກ');
      setOrganization(profile.organization || '');
      setIsPinEnabled(Boolean(profile.isPinEnabled));
      setSecurityPin(profile.securityPin || '');
      setConfirmPin(profile.securityPin || '');
    }

    // Load submission history for this student
    loadStudentHistory(profile?.fullName || '');
  }, [isOpen]);

  const loadStudentHistory = async (name: string) => {
    setLoadingHistory(true);
    try {
      const all = await fetchSubmissions();
      if (name.trim()) {
        const filtered = all.filter(
          (s) => s.studentInfo?.fullName?.toLowerCase().trim() === name.toLowerCase().trim()
        );
        setMySubmissions(filtered);
      } else {
        setMySubmissions(all.slice(0, 5));
      }
    } catch (err) {
      console.warn('History load error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isPinEnabled && securityPin) {
      if (securityPin.length < 4) {
        setErrorMessage('ລະຫັດ PIN ຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວເລກ/ຕົວອັກສອນ');
        return;
      }
      if (securityPin !== confirmPin) {
        setErrorMessage('ລະຫັດ PIN ທັງສອງຊ່ອງບໍ່ກົງກັນ!');
        return;
      }
    }

    const updated: StudentProfile = {
      fullName: fullName.trim(),
      age: age.trim(),
      gender,
      phone: phone.trim(),
      village: village.trim(),
      district: district.trim(),
      province: province.trim() || 'ຈຳປາສັກ',
      organization: organization.trim(),
      securityPin: isPinEnabled ? securityPin.trim() : '',
      isPinEnabled,
    };

    saveStudentProfile(updated);
    if (onProfileUpdated) onProfileUpdated(updated);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    // Refresh history
    loadStudentHistory(updated.fullName);
  };

  const handleClearDrafts = () => {
    if (window.confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບ Draft ຂໍ້ສອບທີ່ບັນທຶກໄວ້ຊົ່ວຄາວໃນເຄື່ອງນີ້?')) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('lao_exam_draft_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      alert('ລຶບຂໍ້ມູນ Draft ຂໍ້ສອບທີ່ຄ້າງໃນອຸປະກອນສຳເລັດແລ້ວ.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-200 border border-blue-400/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">ການຕັ້ງຄ່າ & ຄວາມປອດໄພນັກຮຽນ (Student Settings & Security)</h3>
              <p className="text-xs text-blue-200 mt-0.5">ໂຮງໝໍແຂວງຈຳປາສັກ · ຈັດການຂໍ້ມູນໂປຣໄຟລ໌ ແລະ ຄວາມປອດໄພສ່ວນຕົວ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ໂປຣໄຟລ໌ສ່ວນຕົວ</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>ຄວາມປອດໄພ & PIN</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>ປະຫວັດການສອບ ({mySubmissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('device')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'device'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>ອຸປະກອນ & ຄວາມເປັນສ່ວນຕົວ</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ບັນທຶກການຕັ້ງຄ່າໂປຣໄຟລ໌ ແລະ ຄວາມປອດໄພສຳເລັດແລ້ວ!</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-blue-900 leading-relaxed">
                💡 <strong>ຄຳແນະນຳ:</strong> ເມື່ອທ່ານບັນທຶກຂໍ້ມູນນີ້ແລ້ວ ລະບົບຈະດຶງຂໍ້ມູນຊື່, ອາຍຸ, ບ້ານ, ເມືອງ ແລະ ໜ່ວຍງານໄປໃສ່ໃນໃບສອບເສັງ ແລະ ໃບຢັ້ງຢືນອັດຕະໂນມັດ ໂດຍບໍ່ຕ້ອງພິມໃໝ່ທຸກຄັ້ງ!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ຊື່ ແລະ ນາມສະກຸນ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ທ້າວ ບຸນມີ ສີສົມພອນ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ເບີໂທລະສັບຕິດຕໍ່
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="020 9xxxxxxx"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ເພດ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'ຊາຍ' | 'ຍິງ')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ຊາຍ">ຊາຍ</option>
                    <option value="ຍິງ">ຍິງ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ອາຍຸ (ປີ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="24"
                    min={15}
                    max={80}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">
                    ໂຮງໝໍ / ໜ່ວຍງານອາສາສະໝັກ
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="ໜ່ວຍກູ້ໄພຫຼວງ 1623 / ໂຮງໝໍເມືອງ..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ບ້ານ
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="ບ້ານ ໂພນສະຫວັນ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ເມືອງ
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="ເມືອງ ປາກເຊ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ແຂວງ
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="ຈຳປາສັກ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>ບັນທຶກຂໍ້ມູນໂປຣໄຟລ໌</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY & PIN */}
          {activeTab === 'security' && (
            <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">ລະບົບປົກປ້ອງດ້ວຍລະຫັດ PIN ສ່ວນຕົວ</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ເປີດໃຊ້ລະຫັດ PIN (4-6 ຕົວເລກ) ເພື່ອປ້ອງກັນບໍ່ໃຫ້ຜູ້ອື່ນມາແອບອ້າງຊື່ສອບເສັງ ຫຼື ເບິ່ງຄະແນນຂອງທ່ານ
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={isPinEnabled}
                    onChange={(e) => setIsPinEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {isPinEnabled && (
                <div className="space-y-4 p-4 border border-blue-100 bg-blue-50/40 rounded-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        ລະຫັດ PIN ສ່ວນຕົວໃໝ່ (4-6 ຕົວເລກ) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={securityPin}
                          onChange={(e) => setSecurityPin(e.target.value)}
                          placeholder="ໃສ່ລະຫັດ PIN ເຊັ່ນ: 1234"
                          maxLength={8}
                          className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm tracking-wider"
                          required={isPinEnabled}
                        />
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="text-slate-400 hover:text-slate-600 absolute right-3 top-3"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        ຢືນຢັນລະຫັດ PIN ອີກຄັ້ງ <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          placeholder="ຢືນຢັນລະຫັດ PIN"
                          maxLength={8}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm tracking-wider"
                          required={isPinEnabled}
                        />
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-blue-800">
                    * ລະຫັດ PIN ນີ້ຈະຖືກເກັບຮັກສາໄວ້ໃນອຸປະກອນຂອງທ່ານເພື່ອປົກປ້ອງຄວາມເປັນສ່ວນຕົວ.
                  </p>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  ມາດຕະຖານຄວາມປອດໄພການສອບເສັງ
                </h4>
                <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                  <li>ລະບົບມີການກວດຈັບການສະຫຼັບໜ້າຈໍ ຫຼື ເປີດແຖບອື່ນຂະນະສອບເສັງ</li>
                  <li>ຫ້າມກັອບປີ້ຂໍ້ຄວາມ ຫຼື ຄລິກຂວາໃນລະຫວ່າງການທົດສອບ</li>
                  <li>ເມື່ອໝົດເວລາສອບເສັງ ລະບົບຈະສົ່ງຄຳຕອບໃຫ້ອັດຕະໂນມັດທັນທີ</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>ບັນທຶກການຕັ້ງຄ່າຄວາມປອດໄພ</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: EXAM HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">ປະຫວັດການສອບເສັງ ແລະ ໃບຢັ້ງຢືນ</h4>
                  <p className="text-xs text-slate-500">ລາຍການບົດສອບເສັງທີ່ທ່ານໄດ້ສົ່ງຄຳຕອບໃນລະບົບ</p>
                </div>
                <button
                  type="button"
                  onClick={() => loadStudentHistory(fullName)}
                  className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl font-semibold"
                >
                  ຣີເຟຣຊ
                </button>
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-2" />
                  <p className="text-xs text-slate-500">ກຳລັງດຶງຂໍ້ມູນປະຫວັດການສອບ...</p>
                </div>
              ) : mySubmissions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">ຍັງບໍ່ມີປະຫວັດການສອບເສັງ</p>
                  <p className="text-[11px] text-slate-400 mt-1">ເມື່ອທ່ານສອບເສັງສຳເລັດ ຜົນຄະແນນ ແລະ ໃບຢັ້ງຢືນຈະສະແດງຢູ່ນີ້</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mySubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sub.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {sub.passed ? 'ຜ່ານ' : 'ບໍ່ຜ່ານ'} ({sub.percentage}%)
                          </span>
                          <span className="text-slate-400 text-[10px] flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {sub.submittedAt ? sub.submittedAt.slice(0, 10) : ''}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-xs">{sub.examTitle}</h5>
                        <p className="text-[11px] text-slate-500">
                          ອາຈານ: {sub.teacherName} · ຄະແນນ: {sub.totalScore}/{sub.maxTotalScore}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {sub.passed && onViewCertificate && (
                          <button
                            type="button"
                            onClick={() => {
                              onViewCertificate(sub);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>ພິມໃບຢັ້ງຢືນ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DEVICE & PRIVACY */}
          {activeTab === 'device' && (
            <div className="space-y-5 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">ຄວາມເປັນສ່ວນຕົວ & ຂໍ້ມູນໃນອຸປະກອນ</h4>
                <p className="text-xs text-slate-500">ຈັດການ Cache ຂໍ້ມູນ ແລະ ຄວາມປອດໄພຂອງ Browser ນີ້</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-slate-800">ລຶບ Draft ຂໍ້ສອບທີ່ຄ້າງໃນເຄື່ອງ</h5>
                  <p className="text-[11px] text-slate-500">
                    ລຶບຄຳຕອບທີ່ບັນທຶກຊົ່ວຄາວໃນອຸປະກອນນີ້ (ກໍລະນີໃຊ້ເຄື່ອງຄອມພິວເຕີສາທາລະນະ)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearDrafts}
                  className="px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-semibold border border-rose-200 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  ລຶບ Draft
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-slate-800">ລຶບຂໍ້ມູນໂປຣໄຟລ໌ອອກຈາກເຄື່ອງນີ້</h5>
                  <p className="text-[11px] text-slate-500">
                    ລຶບຊື່, ເບີໂທ, ທີ່ຢູ່ ແລະ ລະຫັດ PIN ທີ່ບັນທຶກໄວ້ໃນ Browser ນີ້
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບໂປຣໄຟລ໌ຂອງທ່ານອອກຈາກເຄື່ອງນີ້?')) {
                      localStorage.removeItem('emscps_student_profile');
                      setFullName('');
                      setAge('');
                      setPhone('');
                      setVillage('');
                      setDistrict('');
                      setIsPinEnabled(false);
                      setSecurityPin('');
                      alert('ລຶບໂປຣໄຟລ໌ສຳເລັດແລ້ວ');
                    }
                  }}
                  className="px-3.5 py-2 text-slate-700 bg-white hover:bg-slate-100 rounded-xl font-semibold border border-slate-200 shrink-0 cursor-pointer"
                >
                  ລຶບໂປຣໄຟລ໌
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
