import { createClient, type Client } from '@libsql/client/web';
import type {
  Teacher,
  Exam,
  Submission,
  Question,
  StudentInfo,
  StudentAnswerItem,
  SystemSecuritySettings,
  StudentProfile,
} from '../types';

let cachedClient: Client | null = null;
let cachedConfigKey = '';

export function sanitizeTursoUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/^["']+|["']+$/g, '').trim();
  if (url.startsWith('libsql://')) {
    url = 'https://' + url.slice('libsql://'.length);
  } else if (!url.startsWith('https://') && !url.startsWith('http://') && url.includes('.')) {
    url = 'https://' + url;
  }
  return url;
}

export function sanitizeAuthToken(rawToken: string): string {
  if (!rawToken) return '';
  return rawToken.trim().replace(/^["']+|["']+$/g, '').trim();
}

export function getTursoConfig() {
  const envUrl = sanitizeTursoUrl(import.meta.env.VITE_TURSO_DATABASE_URL || '');
  const envToken = sanitizeAuthToken(import.meta.env.VITE_TURSO_AUTH_TOKEN || '');

  const localUrl = sanitizeTursoUrl(localStorage.getItem('emscps_turso_url') || '');
  const localToken = sanitizeAuthToken(localStorage.getItem('emscps_turso_token') || '');

  const url = envUrl || localUrl;
  const token = envToken || localToken;

  return {
    url,
    token,
    isConfigured: Boolean(url && token),
    isFromEnv: Boolean(envUrl && envToken),
  };
}

export function saveTursoConfig(url: string, token: string) {
  const sUrl = sanitizeTursoUrl(url);
  const sToken = sanitizeAuthToken(token);
  localStorage.setItem('emscps_turso_url', sUrl);
  localStorage.setItem('emscps_turso_token', sToken);
  cachedClient = null;
  cachedConfigKey = '';
}

export function clearTursoConfig() {
  localStorage.removeItem('emscps_turso_url');
  localStorage.removeItem('emscps_turso_token');
  cachedClient = null;
  cachedConfigKey = '';
}

export function getTursoClient(): Client {
  const config = getTursoConfig();
  if (!config.url || !config.token) {
    throw new Error('ບໍ່ພົບຂໍ້ມູນການເຊື່ອມຕໍ່ Turso. ກະລຸນາຕັ້ງຄ່າ VITE_TURSO_DATABASE_URL ແລະ VITE_TURSO_AUTH_TOKEN ຫຼື ກຳນົດໃນລະບົບ.');
  }

  const currentKey = `${config.url}::${config.token}`;
  if (!cachedClient || cachedConfigKey !== currentKey) {
    try {
      cachedClient = createClient({
        url: config.url,
        authToken: config.token,
      });
      cachedConfigKey = currentKey;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`ບໍ່ສາມາດເຊື່ອມຕໍ່ Turso ໄດ້: ${msg}`);
    }
  }

  return cachedClient;
}

/**
 * ສ້າງຕາຕະລາງອັດຕະໂນມັດ ແລະ seed ຂໍ້ມູນຕົວຢ່າງ (ຄັ້ງທຳອິດເທົ່ານັ້ນ)
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const client = getTursoClient();

    // 1. teachers
    await client.execute(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        subject TEXT NOT NULL,
        department TEXT NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    // 2. exams
    await client.execute(`
      CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        teacherId TEXT NOT NULL,
        teacherName TEXT NOT NULL,
        teacherDepartment TEXT NOT NULL,
        createdDate TEXT NOT NULL,
        durationMinutes INTEGER NOT NULL,
        description TEXT NOT NULL,
        questions TEXT NOT NULL
      );
    `);

    // 3. submissions
    await client.execute(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        examId TEXT NOT NULL,
        examTitle TEXT NOT NULL,
        subject TEXT NOT NULL,
        teacherName TEXT NOT NULL,
        studentInfo TEXT NOT NULL,
        answers TEXT NOT NULL,
        objectiveScore REAL NOT NULL,
        maxObjectiveScore REAL NOT NULL,
        essayScore REAL NOT NULL,
        maxEssayScore REAL NOT NULL,
        totalScore REAL NOT NULL,
        maxTotalScore REAL NOT NULL,
        percentage REAL NOT NULL,
        passed INTEGER NOT NULL,
        isFullyGraded INTEGER NOT NULL,
        submittedAt TEXT NOT NULL
      );
    `);

    // 4. settings
    await client.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Default settings
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password', 'abcd1234$');`,
      args: [],
    });
    await client.execute({
      sql: `UPDATE settings SET value = 'abcd1234$' WHERE key = 'admin_password' AND value = 'admin2026';`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('student_password', '');`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('pass_percentage', '50');`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('exam_access_code', '');`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_exam_code', '0');`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('anti_cheating_copy', '1');`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('detect_tab_switch', '1');`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('limit_one_attempt', '0');`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('show_answer_keys', '1');`,
      args: [],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES ('require_fullscreen', '0');`,
      args: [],
    });

    // SEED SAMPLE DATA: Only if tables are completely empty!
    const teacherCountRes = await client.execute(`SELECT COUNT(*) as cnt FROM teachers;`);
    const teacherCount = Number(teacherCountRes.rows[0]?.cnt || 0);

    if (teacherCount === 0) {
      const now = new Date().toISOString();
      const sampleTeacher: Teacher = {
        id: 'tch_001',
        fullName: 'ດຣ. ສົມໄຊ ວົງສາ',
        subject: 'ການປະຖົມພະຍາບານ ແລະ ວຽກງານກູ້ໄພສຸກເສີນ',
        department: 'ໜ່ວຍກູ້ໄພອາສາສະໝັກແຂວງຈຳປາສັກ',
        password: '123',
        createdAt: now,
      };

      await client.execute({
        sql: `INSERT INTO teachers (id, fullName, subject, department, password, createdAt) VALUES (?, ?, ?, ?, ?, ?);`,
        args: [
          sampleTeacher.id,
          sampleTeacher.fullName,
          sampleTeacher.subject,
          sampleTeacher.department,
          sampleTeacher.password,
          sampleTeacher.createdAt,
        ],
      });

      // Sample Exam "quizeforcps"
      const sampleQuestions: Question[] = [
        {
          id: 'q_1',
          type: 'single_choice',
          text: 'ເມື່ອພົບຄົນເຈັບໝົດສະຕິ ແລະ ບໍ່ຫາຍໃຈ ສິ່ງທຳອິດທີ່ອາສາສະໝັກຕ້ອງປະຕິບັດຄືຂໍ້ໃດ?',
          points: 2,
          options: [
            'ກວດເບິ່ງຄວາມປອດໄພຂອງສະຖານທີ່, ໂທແຈ້ງ 1195/1623 ແລະ ເລີ່ມຕົ້ນເຮັດ CPR ທັນທີ',
            'ເອົານ້ຳຫວານ ຫຼື ນ້ຳສະອາດໃຫ້ຄົນເຈັບດື່ມ',
            'ຍົກຂາທັງສອງຂຶ້ນສູງ ແລະ ລໍຖ້າ 10 ນາທີ',
            'ເອົານ້ຳຫອມ ຫຼື ຢາດົມໃຫ້ດົມ',
          ],
          correctAnswer: 0,
        },
        {
          id: 'q_2',
          type: 'single_choice',
          text: 'ອັດຕາຄວາມໄວໃນການກົດໜ້າເອິກ (Chest Compressions) ໃນການເຮັດ CPR ຜູ້ໃຫຍ່ທີ່ຖືກຕ້ອງແມ່ນເທົ່າໃດ?',
          points: 2,
          options: [
            '60 - 80 ຄັ້ງ / ນາທີ',
            '100 - 120 ຄັ້ງ / ນາທີ',
            '140 - 160 ຄັ້ງ / ນາທີ',
            '180 - 200 ຄັ້ງ / ນາທີ',
          ],
          correctAnswer: 1,
        },
        {
          id: 'q_3',
          type: 'multiple_choice',
          text: 'ຂໍ້ໃດແດ່ແມ່ນອາການ ແລະ ສັນຍານເຕືອນຂອງພາວະຊັອກ (Shock) ຈາກການເສຍເລືອດ? (ເລືອກໄດ້ຫຼາຍຂໍ້)',
          points: 3,
          options: [
            'ຊີບພະຈອນເຕັ້ນໄວ ແລະ ເບົາບາງ',
            'ຜິວໜັງຈືດເຢັນ ແລະ ມີເຫື່ອຊຶມອອກຕາມຕົນໂຕ',
            'ຄວາມດັນເລືອດຫຼຸດຕ່ຳລົງ',
            'ຜິວໜັງແດງຮ້ອນ ແລະ ຫາຍໃຈຊ້າຜິດປົກກະຕິ',
          ],
          correctAnswer: [0, 1, 2],
        },
        {
          id: 'q_4',
          type: 'single_choice',
          text: 'ການປະຖົມພະຍາບານເບື້ອງຕົ້ນສຳລັບບາດແຜຖືກໄຟໄໝ້ ຫຼື ນ້ຳຮ້ອນລວກລະດັບ 1-2 ທີ່ຖືກຕ້ອງທີ່ສຸດແມ່ນຫຍັງ?',
          points: 2,
          options: [
            'ໃຊ້ນ້ຳສະອາດອຸນຫະພູມຫ້ອງໄຫຼຜ່ານບາດແຜ 10 - 20 ນາທີ',
            'ເອົານ້ຳກ້ອນກົດທັບບາດແຜໂດຍກົງ',
            'ທາຢາສີຟັນ ຫຼື ນ້ຳປາໃສ່ບາດແຜ',
            'ທານ້ຳມັນພືດເພື່ອປ້ອງກັນບາດແຜແຫ້ງ',
          ],
          correctAnswer: 0,
        },
        {
          id: 'q_5',
          type: 'text',
          text: 'ຈົ່ງອະທິບາຍຂັ້ນຕອນການປະເມີນຄົນເຈັບສຸກເສີນຕາມຫຼັກການ ABCDE ໃນວຽກງານກູ້ໄພສຸກເສີນໂດຍຫຍໍ້',
          points: 5,
          sampleAnswer:
            'A = Airway (ທາງເດີນຫາຍໃຈໂລ່ງ), B = Breathing (ການຫາຍໃຈ), C = Circulation (ລະບົບໄຫຼວຽນເລືອດ ແລະ ຫ້າມເລືອດ), D = Disability (ລະບົບປະສາດ ແລະ ຄວາມຮູ້ສຶກຕົວ GCS), E = Exposure (ກວດເບິ່ງຮ່າງກາຍທົ່ວໄປ ແລະ ປ້ອງກັນພາວະໜາວສັ່ນ)',
        },
      ];

      const sampleExam: Exam = {
        id: 'exm_001',
        title: 'quizeforcps - ບົດສອບເສັງຄວາມຮູ້ການປະຖົມພະຍາບານ ແລະ ສົ່ງຕໍ່ຄົນເຈັບສຸກເສີນ',
        subject: 'ການປະຖົມພະຍາບານ ແລະ ລະບົບສົ່ງຕໍ່ EMS',
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.fullName,
        teacherDepartment: sampleTeacher.department,
        createdDate: now.slice(0, 10),
        durationMinutes: 30,
        description: 'ບົດສອບເສັງວັດແທກຄວາມຮູ້ພື້ນຖານສຳລັບອາສາສະໝັກກູ້ໄພ ແລະ ທີມງານນຳສົ່ງຄົນເຈັບສຸກເສີນ ແຂວງຈຳປາສັກ',
        questions: sampleQuestions,
      };

      await client.execute({
        sql: `INSERT INTO exams (id, title, subject, teacherId, teacherName, teacherDepartment, createdDate, durationMinutes, description, questions)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          sampleExam.id,
          sampleExam.title,
          sampleExam.subject,
          sampleExam.teacherId,
          sampleExam.teacherName,
          sampleExam.teacherDepartment,
          sampleExam.createdDate,
          sampleExam.durationMinutes,
          sampleExam.description,
          JSON.stringify(sampleExam.questions),
        ],
      });
    }

    return { success: true, message: 'ກວດສອບ ແລະ ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ Turso ສຳເລັດ' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `ເກີດຂໍ້ຜິດພາດໃນການສ້າງຕາຕະລາງ: ${msg}` };
  }
}

/* ==================== ID GENERATION ==================== */

export async function generateId(prefix: 'tch' | 'exm' | 'sub'): Promise<string> {
  try {
    const client = getTursoClient();
    const table = prefix === 'tch' ? 'teachers' : prefix === 'exm' ? 'exams' : 'submissions';
    const res = await client.execute(`SELECT id FROM ${table} WHERE id LIKE '${prefix}_%' ORDER BY id DESC LIMIT 50;`);

    let maxNum = 0;
    for (const row of res.rows) {
      const rawId = String(row.id || '');
      const match = rawId.match(new RegExp(`^${prefix}_(\\d+)$`, 'i'));
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }
    return `${prefix}_${String(maxNum + 1).padStart(3, '0')}`;
  } catch (err) {
    console.warn('ID generator fallback:', err);
    return `${prefix}_${Date.now().toString().slice(-4)}`;
  }
}

/* ==================== TEACHERS ==================== */

export async function fetchTeachers(): Promise<Teacher[]> {
  // Read cache first for immediate rendering
  const cached = localStorage.getItem('emscps_teachers_cache');
  let list: Teacher[] = [];
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  try {
    const client = getTursoClient();
    const res = await client.execute(`SELECT * FROM teachers ORDER BY createdAt DESC;`);
    const fresh: Teacher[] = res.rows.map((r) => ({
      id: String(r.id),
      fullName: String(r.fullName),
      subject: String(r.subject),
      department: String(r.department),
      password: String(r.password),
      createdAt: String(r.createdAt),
    }));
    // Sync cache
    localStorage.setItem('emscps_teachers_cache', JSON.stringify(fresh));
    return fresh;
  } catch (err: unknown) {
    if (list.length > 0) return list;
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດໂຫຼດລາຍຊື່ອາຈານໄດ້: ${msg}`);
  }
}

export async function createTeacher(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
  try {
    const client = getTursoClient();
    const id = await generateId('tch');
    const createdAt = new Date().toISOString();
    const teacher: Teacher = { ...data, id, createdAt };

    await client.execute({
      sql: `INSERT INTO teachers (id, fullName, subject, department, password, createdAt) VALUES (?, ?, ?, ?, ?, ?);`,
      args: [teacher.id, teacher.fullName, teacher.subject, teacher.department, teacher.password, teacher.createdAt],
    });

    // Update localStorage cache atomically
    const cached = localStorage.getItem('emscps_teachers_cache');
    const list: Teacher[] = cached ? JSON.parse(cached) : [];
    list.unshift(teacher);
    localStorage.setItem('emscps_teachers_cache', JSON.stringify(list));

    return teacher;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດສ້າງບັນຊີອາຈານໄດ້: ${msg}`);
  }
}

export async function updateTeacher(teacher: Teacher): Promise<void> {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: `UPDATE teachers SET fullName = ?, subject = ?, department = ?, password = ? WHERE id = ?;`,
      args: [teacher.fullName, teacher.subject, teacher.department, teacher.password, teacher.id],
    });

    // Update cache
    const cached = localStorage.getItem('emscps_teachers_cache');
    if (cached) {
      const list: Teacher[] = JSON.parse(cached);
      const updated = list.map((t) => (t.id === teacher.id ? teacher : t));
      localStorage.setItem('emscps_teachers_cache', JSON.stringify(updated));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດແກ້ໄຂບັນຊີອາຈານໄດ້: ${msg}`);
  }
}

export async function deleteTeacher(id: string): Promise<void> {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: `DELETE FROM teachers WHERE id = ?;`,
      args: [id],
    });

    // Update cache atomically
    const cached = localStorage.getItem('emscps_teachers_cache');
    if (cached) {
      const list: Teacher[] = JSON.parse(cached);
      const filtered = list.filter((t) => t.id !== id);
      localStorage.setItem('emscps_teachers_cache', JSON.stringify(filtered));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດລຶບອາຈານໄດ້: ${msg}`);
  }
}

/* ==================== EXAMS ==================== */

export async function fetchExams(): Promise<Exam[]> {
  const cached = localStorage.getItem('emscps_exams_cache');
  let list: Exam[] = [];
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  try {
    const client = getTursoClient();
    const res = await client.execute(`SELECT * FROM exams ORDER BY createdDate DESC;`);
    const fresh: Exam[] = res.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      subject: String(r.subject),
      teacherId: String(r.teacherId),
      teacherName: String(r.teacherName),
      teacherDepartment: String(r.teacherDepartment),
      createdDate: String(r.createdDate),
      durationMinutes: Number(r.durationMinutes),
      description: String(r.description),
      questions: JSON.parse(String(r.questions || '[]')),
    }));

    localStorage.setItem('emscps_exams_cache', JSON.stringify(fresh));
    return fresh;
  } catch (err: unknown) {
    if (list.length > 0) return list;
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດໂຫຼດລາຍການບົດສອບເສັງໄດ້: ${msg}`);
  }
}

export async function createExam(data: Omit<Exam, 'id' | 'createdDate'>): Promise<Exam> {
  try {
    const client = getTursoClient();
    const id = await generateId('exm');
    const createdDate = new Date().toISOString().slice(0, 10);
    const exam: Exam = { ...data, id, createdDate };

    await client.execute({
      sql: `INSERT INTO exams (id, title, subject, teacherId, teacherName, teacherDepartment, createdDate, durationMinutes, description, questions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        exam.id,
        exam.title,
        exam.subject,
        exam.teacherId,
        exam.teacherName,
        exam.teacherDepartment,
        exam.createdDate,
        exam.durationMinutes,
        exam.description,
        JSON.stringify(exam.questions),
      ],
    });

    // Update cache atomically
    const cached = localStorage.getItem('emscps_exams_cache');
    const list: Exam[] = cached ? JSON.parse(cached) : [];
    list.unshift(exam);
    localStorage.setItem('emscps_exams_cache', JSON.stringify(list));

    return exam;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດສ້າງບົດສອບເສັງໄດ້: ${msg}`);
  }
}

export async function updateExam(exam: Exam): Promise<void> {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: `UPDATE exams SET title = ?, subject = ?, durationMinutes = ?, description = ?, questions = ? WHERE id = ?;`,
      args: [
        exam.title,
        exam.subject,
        exam.durationMinutes,
        exam.description,
        JSON.stringify(exam.questions),
        exam.id,
      ],
    });

    // Update cache
    const cached = localStorage.getItem('emscps_exams_cache');
    if (cached) {
      const list: Exam[] = JSON.parse(cached);
      const updated = list.map((e) => (e.id === exam.id ? exam : e));
      localStorage.setItem('emscps_exams_cache', JSON.stringify(updated));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດແກ້ໄຂບົດສອບເສັງໄດ້: ${msg}`);
  }
}

export async function deleteExam(id: string): Promise<void> {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: `DELETE FROM exams WHERE id = ?;`,
      args: [id],
    });

    const cached = localStorage.getItem('emscps_exams_cache');
    if (cached) {
      const list: Exam[] = JSON.parse(cached);
      const filtered = list.filter((e) => e.id !== id);
      localStorage.setItem('emscps_exams_cache', JSON.stringify(filtered));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດລຶບບົດສອບເສັງໄດ້: ${msg}`);
  }
}

/* ==================== SUBMISSIONS ==================== */

export async function fetchSubmissions(options?: {
  examId?: string;
  teacherName?: string;
  passed?: boolean;
}): Promise<Submission[]> {
  try {
    const client = getTursoClient();
    const clauses: string[] = [];
    const args: (string | number)[] = [];

    if (options?.examId && options.examId !== 'ທັງໝົດ') {
      clauses.push('examId = ?');
      args.push(options.examId);
    }
    if (options?.teacherName && options.teacherName !== 'ທັງໝົດ') {
      clauses.push('teacherName = ?');
      args.push(options.teacherName);
    }
    if (options?.passed !== undefined) {
      clauses.push('passed = ?');
      args.push(options.passed ? 1 : 0);
    }

    const whereStr = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM submissions ${whereStr} ORDER BY submittedAt DESC;`;

    const res = await client.execute({ sql, args });
    return res.rows.map((r) => ({
      id: String(r.id),
      examId: String(r.examId),
      examTitle: String(r.examTitle),
      subject: String(r.subject),
      teacherName: String(r.teacherName),
      studentInfo: JSON.parse(String(r.studentInfo || '{}')),
      answers: JSON.parse(String(r.answers || '{}')),
      objectiveScore: Number(r.objectiveScore),
      maxObjectiveScore: Number(r.maxObjectiveScore),
      essayScore: Number(r.essayScore),
      maxEssayScore: Number(r.maxEssayScore),
      totalScore: Number(r.totalScore),
      maxTotalScore: Number(r.maxTotalScore),
      percentage: Number(r.percentage),
      passed: Boolean(r.passed),
      isFullyGraded: Boolean(r.isFullyGraded),
      submittedAt: String(r.submittedAt),
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດດຶງລາຍການຜົນສອບເສັງໄດ້: ${msg}`);
  }
}

export async function createSubmission(data: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
  try {
    const client = getTursoClient();
    const id = await generateId('sub');
    const submittedAt = new Date().toISOString();
    const sub: Submission = { ...data, id, submittedAt };

    await client.execute({
      sql: `INSERT INTO submissions (
        id, examId, examTitle, subject, teacherName, studentInfo, answers,
        objectiveScore, maxObjectiveScore, essayScore, maxEssayScore,
        totalScore, maxTotalScore, percentage, passed, isFullyGraded, submittedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        sub.id,
        sub.examId,
        sub.examTitle,
        sub.subject,
        sub.teacherName,
        JSON.stringify(sub.studentInfo),
        JSON.stringify(sub.answers),
        sub.objectiveScore,
        sub.maxObjectiveScore,
        sub.essayScore,
        sub.maxEssayScore,
        sub.totalScore,
        sub.maxTotalScore,
        sub.percentage,
        sub.passed ? 1 : 0,
        sub.isFullyGraded ? 1 : 0,
        sub.submittedAt,
      ],
    });

    return sub;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດສົ່ງຜົນສອບເສັງໄດ້: ${msg}`);
  }
}

export async function updateSubmissionGrading(
  submissionId: string,
  updatedAnswers: Record<string, StudentAnswerItem>,
  passThreshold: number
): Promise<Submission> {
  try {
    const client = getTursoClient();

    // Fetch submission first
    const res = await client.execute({
      sql: `SELECT * FROM submissions WHERE id = ? LIMIT 1;`,
      args: [submissionId],
    });

    if (res.rows.length === 0) {
      throw new Error('ບໍ່ພົບຜົນສອບເສັງ');
    }

    const current = res.rows[0];
    const objectiveScore = Number(current.objectiveScore);
    const maxObjectiveScore = Number(current.maxObjectiveScore);
    const maxEssayScore = Number(current.maxEssayScore);
    const maxTotalScore = Number(current.maxTotalScore);

    // Calculate total essay score from updated answers
    let newEssayScore = 0;
    let allGraded = true;

    Object.values(updatedAnswers).forEach((item) => {
      if (item.type === 'text') {
        newEssayScore += item.awardedScore || 0;
        if (item.awardedScore === undefined || item.awardedScore === null) {
          allGraded = false;
        }
      }
    });

    const newTotalScore = objectiveScore + newEssayScore;
    const newPercentage = maxTotalScore > 0 ? Math.round((newTotalScore / maxTotalScore) * 100 * 10) / 10 : 0;
    const passed = newPercentage >= passThreshold;

    await client.execute({
      sql: `UPDATE submissions SET answers = ?, essayScore = ?, totalScore = ?, percentage = ?, passed = ?, isFullyGraded = ? WHERE id = ?;`,
      args: [
        JSON.stringify(updatedAnswers),
        newEssayScore,
        newTotalScore,
        newPercentage,
        passed ? 1 : 0,
        allGraded ? 1 : 0,
        submissionId,
      ],
    });

    return {
      id: submissionId,
      examId: String(current.examId),
      examTitle: String(current.examTitle),
      subject: String(current.subject),
      teacherName: String(current.teacherName),
      studentInfo: JSON.parse(String(current.studentInfo)),
      answers: updatedAnswers,
      objectiveScore,
      maxObjectiveScore,
      essayScore: newEssayScore,
      maxEssayScore,
      totalScore: newTotalScore,
      maxTotalScore,
      percentage: newPercentage,
      passed,
      isFullyGraded: allGraded,
      submittedAt: String(current.submittedAt),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດບັນທຶກການກວດຄະແນນໄດ້: ${msg}`);
  }
}

export async function deleteSubmission(id: string): Promise<void> {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: `DELETE FROM submissions WHERE id = ?;`,
      args: [id],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດລຶບຜົນສອບເສັງໄດ້: ${msg}`);
  }
}

/* ==================== SETTINGS ==================== */

export async function getSettings(): Promise<{ adminPassword: string; studentPassword: string; passPercentage: number }> {
  try {
    const client = getTursoClient();
    const res = await client.execute(`SELECT key, value FROM settings;`);
    let adminPassword = 'abcd1234$';
    let studentPassword = '';
    let passPercentage = 50;

    for (const row of res.rows) {
      if (row.key === 'admin_password' && row.value) {
        adminPassword = String(row.value);
      } else if (row.key === 'student_password' && row.value) {
        studentPassword = String(row.value);
      } else if (row.key === 'pass_percentage' && row.value) {
        passPercentage = Number(row.value) || 50;
      }
    }

    return { adminPassword, studentPassword, passPercentage };
  } catch {
    return { adminPassword: 'abcd1234$', studentPassword: '', passPercentage: 50 };
  }
}

export async function setAdminPassword(password: string): Promise<void> {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: `INSERT INTO settings (key, value) VALUES ('admin_password', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      args: [password.trim()],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດປ່ຽນລະຫັດ Admin ໄດ້: ${msg}`);
  }
}

export async function setPassPercentage(percentage: number): Promise<void> {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: `INSERT INTO settings (key, value) VALUES ('pass_percentage', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      args: [String(percentage)],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດແກ້ໄຂເກນຄະແນນຜ່ານໄດ້: ${msg}`);
  }
}

export const DEFAULT_SECURITY_SETTINGS: SystemSecuritySettings = {
  adminPassword: 'abcd1234$',
  studentPassword: '',
  passPercentage: 50,
  examAccessCode: '',
  enableExamCode: false,
  antiCheatingCopy: true,
  detectTabSwitch: true,
  limitOneAttempt: false,
  showAnswerKeys: true,
  requireFullscreen: false,
};

export async function getSystemSettings(): Promise<SystemSecuritySettings> {
  try {
    const client = getTursoClient();
    const res = await client.execute(`SELECT key, value FROM settings;`);
    const settings: SystemSecuritySettings = { ...DEFAULT_SECURITY_SETTINGS };

    for (const row of res.rows) {
      const key = String(row.key);
      const val = String(row.value || '');
      if (key === 'admin_password' && val) settings.adminPassword = val;
      else if (key === 'student_password') settings.studentPassword = val;
      else if (key === 'pass_percentage') settings.passPercentage = Number(val) || 50;
      else if (key === 'exam_access_code') settings.examAccessCode = val;
      else if (key === 'enable_exam_code') settings.enableExamCode = val === '1' || val === 'true';
      else if (key === 'anti_cheating_copy') settings.antiCheatingCopy = val === '1' || val === 'true';
      else if (key === 'detect_tab_switch') settings.detectTabSwitch = val === '1' || val === 'true';
      else if (key === 'limit_one_attempt') settings.limitOneAttempt = val === '1' || val === 'true';
      else if (key === 'show_answer_keys') settings.showAnswerKeys = val === '1' || val === 'true';
      else if (key === 'require_fullscreen') settings.requireFullscreen = val === '1' || val === 'true';
    }

    return settings;
  } catch {
    return { ...DEFAULT_SECURITY_SETTINGS };
  }
}

export async function saveSystemSecuritySettings(settings: Partial<SystemSecuritySettings>): Promise<void> {
  try {
    const client = getTursoClient();
    const batch: { sql: string; args: (string | number)[] }[] = [];

    if (settings.adminPassword !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('admin_password', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.adminPassword.trim()],
      });
    }
    if (settings.studentPassword !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('student_password', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.studentPassword.trim()],
      });
    }
    if (settings.passPercentage !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('pass_percentage', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [String(settings.passPercentage)],
      });
    }
    if (settings.examAccessCode !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('exam_access_code', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.examAccessCode.trim()],
      });
    }
    if (settings.enableExamCode !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('enable_exam_code', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.enableExamCode ? '1' : '0'],
      });
    }
    if (settings.antiCheatingCopy !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('anti_cheating_copy', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.antiCheatingCopy ? '1' : '0'],
      });
    }
    if (settings.detectTabSwitch !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('detect_tab_switch', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.detectTabSwitch ? '1' : '0'],
      });
    }
    if (settings.limitOneAttempt !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('limit_one_attempt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.limitOneAttempt ? '1' : '0'],
      });
    }
    if (settings.showAnswerKeys !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('show_answer_keys', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.showAnswerKeys ? '1' : '0'],
      });
    }
    if (settings.requireFullscreen !== undefined) {
      batch.push({
        sql: `INSERT INTO settings (key, value) VALUES ('require_fullscreen', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        args: [settings.requireFullscreen ? '1' : '0'],
      });
    }

    if (batch.length > 0) {
      await client.batch(batch, 'write');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ບໍ່ສາມາດບັນທຶກການຕັ້ງຄ່າຄວາມປອດໄພໄດ້: ${msg}`);
  }
}

export async function getStudentPassword(): Promise<string> {
  try {
    const client = getTursoClient();
    const res = await client.execute(`SELECT value FROM settings WHERE key = 'student_password';`);
    return String(res.rows[0]?.value || '').trim();
  } catch {
    return '';
  }
}

// Student Profile Management (Cached in localStorage)
const STUDENT_PROFILE_KEY = 'emscps_student_profile';

export function getStudentProfile(): StudentProfile | null {
  try {
    const stored = localStorage.getItem(STUDENT_PROFILE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StudentProfile;
  } catch {
    return null;
  }
}

export function saveStudentProfile(profile: StudentProfile): void {
  localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(profile));
}

export function clearStudentProfile(): void {
  localStorage.removeItem(STUDENT_PROFILE_KEY);
}
