import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { COURSES_SEED, PLANS } from '@/lib/courses-seed';
import { scrapeCourseStructure, scrapeFolderFlat } from '@/lib/drive-scraper';
import { applyCourseModuleOverrides } from '@/lib/course-overrides';

const BETA_MODE = (process.env.BETA_MODE || 'true').toLowerCase() === 'true';

function _normEmail(e) { return (e || '').trim().toLowerCase(); }

// Entitlement check: paid Stripe access (access_grants), admin/teacher allowlist,
// or manual has_access flag on the user document.
async function hasActiveAccess(db, email, userDoc) {
  const em = _normEmail(email);
  if (!em) return false;
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const teacher = _normEmail(process.env.TEACHER_EMAIL || '');
  if (admins.includes(em) || (teacher && em === teacher)) return true;
  if (userDoc && userDoc.has_access === true) return true;
  const grant = await db.collection('access_grants').findOne({ email: em });
  if (grant && grant.expires_at && new Date(grant.expires_at) > new Date()) return true;
  return false;
}

let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  const db = await getDb();
  for (const c of COURSES_SEED) {
    await db.collection('courses').updateOne(
      { slug: c.slug },
      { $setOnInsert: c },
      { upsert: true }
    );
    const { modules, ...meta } = c;
    await db.collection('courses').updateOne({ slug: c.slug }, { $set: meta });
  }
  seeded = true;
  initialSyncIfNeeded().catch(err => console.warn('initial sync fail:', err.message));
}

async function initialSyncIfNeeded() {
  const db = await getDb();
  const courses = await db.collection('courses').find({}, { projection: { _id: 0 } }).limit(100).toArray();
  for (const c of courses) {
    const hasLessons = (c.modules || []).some(m => (m.lessons || []).length > 0);
    if (hasLessons) continue;
    try {
      await syncCourse(c.slug);
    } catch (e) {
      console.warn(`auto-sync fail ${c.slug}:`, e.message);
    }
  }
}

async function syncCourse(slug) {
  const db = await getDb();
  const course = await db.collection('courses').findOne({ slug }, { projection: { _id: 0 } });
  if (!course) throw new Error('Course not found');
  // Combined courses: sync each source course sequentially.
  if (Array.isArray(course.combined_from) && course.combined_from.length) {
    let modules_count = 0;
    let lessons_count = 0;
    for (const src of course.combined_from) {
      try {
        const r = await syncCourse(src);
        modules_count += r.modules_count;
        lessons_count += r.lessons_count;
      } catch (e) {
        console.warn(`sync source ${src} failed:`, e.message);
      }
    }
    await db.collection('courses').updateOne(
      { slug },
      { $set: { last_synced_at: new Date().toISOString() } }
    );
    return { slug, modules_count, lessons_count };
  }
  const modules = [];
  if (course.drive_folder_id) {
    const result = await scrapeCourseStructure(course.drive_folder_id);
    modules.push(...result.modules);
    if (result.root_files.length) {
      modules.push({
        id: `${slug}-root-files`,
        title: 'Material do Curso',
        description: 'Arquivos disponibilizados na pasta principal.',
        lessons: result.root_files,
      });
    }
  }

  // Extra drive folders: each entry is projected onto a single named module.
  // If a module with the same title already exists (from the main scrape),
  // the new lessons are appended; otherwise a new module is created.
  const extras = Array.isArray(course.extra_drive_folders) ? course.extra_drive_folders : [];
  if (extras.length) {
    const normTitle = (t) => (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    for (const cfg of extras) {
      if (!cfg?.folder_id || !cfg?.module_title) continue;
      let lessons;
      try {
        lessons = await scrapeFolderFlat(cfg.folder_id);
      } catch (e) {
        console.warn(`extra folder scrape failed ${cfg.folder_id}:`, e.message);
        continue;
      }
      if (!lessons.length) continue;
      const existing = modules.findIndex((m) => normTitle(m.title) === normTitle(cfg.module_title));
      if (existing >= 0) {
        const seen = new Set((modules[existing].lessons || []).map((l) => l.id));
        const toAppend = lessons.filter((l) => !seen.has(l.id));
        modules[existing] = {
          ...modules[existing],
          lessons: [...(modules[existing].lessons || []), ...toAppend],
        };
      } else {
        modules.push({
          id: `${slug}-extra-${cfg.folder_id}`,
          title: cfg.module_title,
          description: '',
          lessons,
        });
      }
    }
  }

  if (!modules.length) throw new Error('Could not scrape Drive folder');
  await db.collection('courses').updateOne(
    { slug },
    { $set: { modules, last_synced_at: new Date().toISOString() } }
  );
  return {
    slug,
    modules_count: modules.length,
    lessons_count: modules.reduce((n, m) => n + (m.lessons || []).length, 0),
  };
}

async function getCurrentUser(request) {
  const cookie = request.cookies.get('session_token');
  const authHeader = request.headers.get('authorization');
  let token = cookie?.value;
  if (!token && authHeader?.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection('user_sessions').findOne({ session_token: token }, { projection: { _id: 0 } });
  if (!session) return null;
  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) return null;
  return await db.collection('users').findOne({ user_id: session.user_id }, { projection: { _id: 0 } });
}

async function ensureEnrollment(userId, courseSlug) {
  const db = await getDb();
  const existing = await db.collection('enrollments').findOne({ user_id: userId, course_slug: courseSlug });
  if (existing) return;
  await db.collection('enrollments').insertOne({
    user_id: userId,
    course_slug: courseSlug,
    completed_modules: [],
    completed_lessons: [],
    progress: 0,
    completed_at: null,
    enrolled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

function json(data, init = {}) {
  return NextResponse.json(data, init);
}
function err(status, detail) {
  return NextResponse.json({ detail }, { status });
}
function courseTotalLessons(course) {
  return (course.modules || []).reduce((n, m) => n + (m.lessons || []).length, 0);
}

async function loadCourseWithModules(db, slug) {
  const course = await db.collection('courses').findOne({ slug }, { projection: { _id: 0 } });
  if (!course) return null;

  // Builds a "Apostila Oficial" module from a course's `apostilas` seed field.
  // Returns null when the course has no apostilas.
  const apostilaModule = (c, opts = {}) => {
    const list = Array.isArray(c.apostilas) ? c.apostilas : [];
    if (!list.length) return null;
    const mod = {
      id: `${c.slug}-apostila-oficial`,
      title: 'Apostila Oficial',
      description: 'Material didático em PDF cobrindo o curso passo a passo.',
      lessons: list.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type || 'pdf',
        url: a.url,
        description: a.description,
      })),
    };
    if (opts.source_slug) mod.source_slug = opts.source_slug;
    if (opts.source_title) mod.source_title = opts.source_title;
    return mod;
  };

  // Inject apostila module into raw modules BEFORE overrides so moduleOrder can position it.
  const injectApostila = (c, opts = {}) => {
    const apo = apostilaModule(c, opts);
    if (!apo) return c;
    return { ...c, modules: [...(c.modules || []), apo] };
  };

  if (Array.isArray(course.combined_from) && course.combined_from.length) {
    const rawSources = await db.collection('courses')
      .find({ slug: { $in: course.combined_from } }, { projection: { _id: 0 } })
      .toArray();
    const sources = rawSources.map((s) => applyCourseModuleOverrides(
      injectApostila(s, { source_slug: s.slug, source_title: s.title })
    ));
    const bySlug = Object.fromEntries(sources.map((s) => [s.slug, s]));

    // Dedupe rules for combined courses:
    //  1) Exact normalized title match  -> keep first
    //  2) "Intro-like" titles (boas vindas / apresentação / introdução / welcome)
    //     -> keep only the FIRST intro lesson across the entire course.
    const seenTitles = new Set();
    let introUsed = false;
    const norm = (t) => (t || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const INTRO = /(boas\s+vindas|apresenta[cç][aã]o|introdu[cç][aã]o|welcome|leia[- ]me|leia\s+antes)/i;

    const mergedModules = [];
    for (const srcSlug of course.combined_from) {
      const src = bySlug[srcSlug];
      if (!src) continue;
      for (const m of src.modules || []) {
        const moduleIsIntro = INTRO.test(m.title || '');
        const dedupedLessons = [];
        for (const l of m.lessons || []) {
          const key = norm(l.title);
          const isIntroLesson = moduleIsIntro || INTRO.test(l.title || '');
          if (isIntroLesson) {
            if (introUsed) continue;
            introUsed = true;
            seenTitles.add(key);
            dedupedLessons.push(l);
            continue;
          }
          if (key && seenTitles.has(key)) continue;
          if (key) seenTitles.add(key);
          dedupedLessons.push(l);
        }
        if (!dedupedLessons.length) continue;
        mergedModules.push({
          ...m,
          id: `${srcSlug}::${m.id}`,
          lessons: dedupedLessons,
          source_slug: m.source_slug || srcSlug,
          source_title: m.source_title || src.title,
        });
      }
    }
    course.modules = mergedModules;
  } else {
    // Standalone course — inject apostila BEFORE overrides so moduleOrder can position it.
    Object.assign(course, applyCourseModuleOverrides(injectApostila(course)));
  }

  // Course-level bonuses (works for both combos and standalone).
  // DESATIVADO: usuário pediu para NÃO exibir mais o módulo "🎁 Bônus"
  // na sidebar dos cursos. Os bônus universais permanecem na rota
  // /bonus-extra (menu "Aprender" → "Bônus"). Os bônus específicos do curso
  // (course.bonuses) continuam disponíveis nos dados do curso — apenas não
  // são renderizados como módulo separado no player.
  if (false && Array.isArray(course.bonuses) && course.bonuses.length) {
    const bonusLessons = course.bonuses.map((b) => ({
      id: b.id,
      title: b.title,
      type: b.type || 'pdf',
      url: b.url,
      description: b.description,
    }));
    const existingBonusIdx = (course.modules || []).findIndex(
      (m) => (m.title || '').includes('🎁 Bônus') || (m.title || '').toLowerCase() === 'bônus'
    );
    if (existingBonusIdx >= 0) {
      const existing = course.modules[existingBonusIdx];
      const existingIds = new Set((existing.lessons || []).map((l) => l.id));
      const toAppend = bonusLessons.filter((l) => !existingIds.has(l.id));
      course.modules[existingBonusIdx] = {
        ...existing,
        lessons: [...(existing.lessons || []), ...toAppend],
      };
    } else {
      course.modules = [
        ...(course.modules || []),
        {
          id: `${course.slug}-bonus`,
          title: '🎁 Bônus',
          description: 'Materiais bônus liberados junto com o curso.',
          lessons: bonusLessons,
        },
      ];
    }
  }

  // Course-level masterclass (works for both combos and standalone).
  // Prepends a "🎬 Masterclass" module at the START so it's the first content the student sees.
  if (Array.isArray(course.masterclass) && course.masterclass.length) {
    const masterclassLessons = course.masterclass.map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type || 'video',
      url: m.url,
      description: m.description,
    }));
    const masterclassModule = {
      id: `${course.slug}-masterclass`,
      title: '🎬 Masterclass',
      description: 'Aulas exclusivas em vídeo.',
      lessons: masterclassLessons,
    };
    course.modules = [masterclassModule, ...(course.modules || [])];
  }

  // Course-level upcoming modules ("Em Breve").
  // Each upcoming module contains a single lesson with a "coming soon" notice.
  // Rendered as type=notice by the Player.
  if (Array.isArray(course.upcoming_modules) && course.upcoming_modules.length) {
    const upcomingModules = course.upcoming_modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: 'Em breve. Aulas liberadas a partir de 03 de agosto.',
      coming_soon: true,
      lessons: [
        {
          id: `${m.id}-notice`,
          title: m.title,
          type: 'notice',
          coming_soon: true,
          release_date: '03 de agosto',
        },
      ],
    }));
    course.modules = [...(course.modules || []), ...upcomingModules];
  }

  return course;
}

async function computeJourneyState(db, user) {
  const [recipes, store, orders] = await Promise.all([
    db.collection('pi_recipes').find({ user_id: user.user_id }, { projection: { _id: 0 } }).toArray(),
    db.collection('pi_stores').findOne({ user_id: user.user_id }, { projection: { _id: 0 } }),
    db.collection('pi_orders').find({ user_id: user.user_id }, { projection: { _id: 0 } }).toArray(),
  ]);
  const journey = await db.collection('pi_journey').findOne({ user_id: user.user_id }, { projection: { _id: 0 } });
  const manual = journey?.manual || {};

  const productsInVitrine = recipes.filter((r) => r.available !== false);
  const priced = recipes.filter((r) => (Number(r.ingredient_cost) || 0) > 0);
  const withNotes = recipes.filter((r) => (r.personal_notes || '').trim().length > 0);
  const delivered = orders.filter((o) => o.status === 'delivered');
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
  const totalRevenue = delivered.reduce((s, o) => s + (Number(o.total_value) || 0), 0);

  const clientKey = (o) => `${(o.client_name || '').trim().toLowerCase()}|${(o.client_phone || '').replace(/\D/g, '')}`;
  const clientsMap = new Map();
  for (const o of delivered) {
    const k = clientKey(o);
    if (!k.trim() || k === '|') continue;
    const cur = clientsMap.get(k) || { name: o.client_name, phone: o.client_phone, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(o.total_value) || 0;
    clientsMap.set(k, cur);
  }
  const clientsCount = clientsMap.size;
  const recurringClients = [...clientsMap.values()].filter((c) => c.count >= 2);

  const weekStart = (d) => {
    const t = new Date(d);
    const day = t.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    t.setDate(t.getDate() + diff);
    t.setHours(0, 0, 0, 0);
    return t;
  };
  const weekMap = new Map();
  for (const o of delivered) {
    if (!o.delivery_date) continue;
    const ws = weekStart(o.delivery_date).toISOString().slice(0, 10);
    weekMap.set(ws, (weekMap.get(ws) || 0) + 1);
  }
  const now = new Date();
  const currentWeekStart = weekStart(now);
  const last4Weeks = [];
  for (let i = 3; i >= 0; i -= 1) {
    const ws = new Date(currentWeekStart);
    ws.setDate(ws.getDate() - i * 7);
    const key = ws.toISOString().slice(0, 10);
    last4Weeks.push({ week_start: key, orders: weekMap.get(key) || 0, ok: (weekMap.get(key) || 0) >= 3 });
  }

  const monthMap = new Map();
  for (const o of delivered) {
    if (!o.delivery_date) continue;
    const ym = o.delivery_date.slice(0, 7);
    monthMap.set(ym, (monthMap.get(ym) || 0) + (Number(o.total_value) || 0));
  }
  const monthKeys = [];
  for (let i = 2; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const last3Months = monthKeys.map((ym) => ({ ym, revenue: monthMap.get(ym) || 0, ok: (monthMap.get(ym) || 0) > 0 }));
  const consecutiveMonthsOk = last3Months.every((m) => m.ok) ? 3 : last3Months.filter((m) => m.ok).length;

  const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v)));

  const m1Steps = [
    { id: 'produto_cadastrado', label: 'Produto cadastrado', done: recipes.length >= 1, cta: { label: 'Cadastrar produto', href: '/calculadora' } },
    { id: 'preco_calculado', label: 'Preço calculado', done: priced.length >= 1, cta: { label: 'Abrir calculadora', href: '/calculadora' } },
    { id: 'vitrine_publicada', label: 'Vitrine publicada', done: !!(store && store.slug && productsInVitrine.length >= 1), cta: { label: 'Publicar vitrine', href: '/minha-vitrine' } },
    { id: 'divulgacao', label: 'Divulgação realizada', done: !!manual.divulgacao_feita, cta: { label: 'Compartilhar vitrine', href: '/minha-vitrine' }, manual_id: 'divulgacao_feita' },
    { id: 'primeiro_pedido', label: 'Primeiro pedido registrado', done: nonCancelled.length >= 1, cta: { label: 'Registrar pedido', href: '/encomendas' } },
    { id: 'primeiro_entregue', label: 'Pedido entregue', done: delivered.length >= 1, cta: { label: 'Marcar como entregue', href: '/encomendas' } },
  ];
  const m1Done = m1Steps.filter((s) => s.done).length;
  const mission1 = {
    id: 1, emoji: '🌱', title: 'Primeira Venda', objective: 'Conseguir que alguém compre.',
    progress_pct: clampPct((m1Done / m1Steps.length) * 100),
    progress_label: `${m1Done} de ${m1Steps.length} etapas`,
    completed: m1Done === m1Steps.length, steps: m1Steps,
  };

  const goal1000 = Math.min(totalRevenue, 1000);
  const mission2 = {
    id: 2, emoji: '💰', title: 'Primeiros R$ 1.000', objective: 'Provar que existe mercado.',
    progress_pct: clampPct((totalRevenue / 1000) * 100),
    progress_label: `R$ ${goal1000.toFixed(2).replace('.', ',')} / R$ 1.000,00`,
    completed: totalRevenue >= 1000,
    current_value: totalRevenue, target_value: 1000,
  };

  const mission3 = {
    id: 3, emoji: '⭐', title: '10 Clientes Felizes', objective: 'Criar uma base real de clientes.',
    progress_pct: clampPct((clientsCount / 10) * 100),
    progress_label: `${clientsCount} / 10 clientes`,
    completed: clientsCount >= 10,
    current_value: clientsCount, target_value: 10,
  };

  const m4Steps = [
    { id: 'precos_5', label: 'Calculou preços em 5 produtos', done: priced.length >= 5, current: priced.length, target: 5, cta: { label: 'Abrir calculadora', href: '/calculadora' } },
    { id: 'vitrine_5', label: 'Cadastrou 5 produtos na vitrine', done: productsInVitrine.length >= 5, current: productsInVitrine.length, target: 5, cta: { label: 'Abrir vitrine', href: '/minha-vitrine' } },
    { id: 'pedidos_10', label: 'Registrou 10 pedidos', done: nonCancelled.length >= 10, current: nonCancelled.length, target: 10, cta: { label: 'Abrir pedidos', href: '/encomendas' } },
    { id: 'anotacoes_3', label: 'Anotações em 3 receitas', done: withNotes.length >= 3, current: withNotes.length, target: 3, cta: { label: 'Abrir caderno', href: '/minhas-anotacoes' } },
    { id: 'entregues_10', label: 'Finalizou 10 entregas', done: delivered.length >= 10, current: delivered.length, target: 10, cta: { label: 'Marcar entregas', href: '/encomendas' } },
  ];
  const m4Done = m4Steps.filter((s) => s.done).length;
  const mission4 = {
    id: 4, emoji: '🗂️', title: 'Negócio Organizado', objective: 'Parar de trabalhar no improviso.',
    progress_pct: clampPct((m4Done / m4Steps.length) * 100),
    progress_label: `${m4Done} de ${m4Steps.length} metas`,
    completed: m4Done === m4Steps.length, steps: m4Steps,
  };

  const clientsReg = clientsMap.size;
  const rec = recurringClients.length;
  const m5Steps = [
    { id: 'clientes_20', label: 'Cadastrar 20 clientes', done: clientsReg >= 20, current: clientsReg, target: 20, cta: { label: 'Registrar pedidos', href: '/encomendas' } },
    { id: 'recorrentes_5', label: '5 clientes com recompra', done: rec >= 5, current: rec, target: 5, cta: null },
  ];
  const m5Done = m5Steps.filter((s) => s.done).length;
  const mission5 = {
    id: 5, emoji: '❤️', title: 'Clientes que Voltam', objective: 'Criar fidelização.',
    progress_pct: clampPct((m5Done / m5Steps.length) * 100),
    progress_label: `${rec} / 5 clientes recorrentes`,
    completed: m5Done === m5Steps.length, steps: m5Steps,
    recurring_preview: recurringClients.slice(0, 6).map((c) => ({ name: c.name, count: c.count })),
  };

  const okWeeks = last4Weeks.filter((w) => w.ok).length;
  const mission6 = {
    id: 6, emoji: '📅', title: 'Agenda Lotada', objective: 'Receber pedidos em 4 semanas seguidas.',
    progress_pct: clampPct((okWeeks / 4) * 100),
    progress_label: `${okWeeks} / 4 semanas`,
    completed: okWeeks === 4, weeks: last4Weeks,
  };

  const mission7 = {
    id: 7, emoji: '👑', title: 'Renda Consistente', objective: 'Faturar durante 3 meses seguidos.',
    progress_pct: clampPct((consecutiveMonthsOk / 3) * 100),
    progress_label: `${consecutiveMonthsOk} / 3 meses`,
    completed: consecutiveMonthsOk === 3, months: last3Months,
  };

  // Bonus mission (unlocks when missions 1-7 all completed).
  const best12Map = new Map();
  for (const o of delivered) {
    if (!o.delivery_date) continue;
    const ym = o.delivery_date.slice(0, 7);
    best12Map.set(ym, (best12Map.get(ym) || 0) + (Number(o.total_value) || 0));
  }
  const last12 = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    last12.push({ ym, revenue: best12Map.get(ym) || 0 });
  }
  const bestMonth = last12.reduce((best, m) => (m.revenue > best.revenue ? m : best), { ym: '', revenue: 0 });
  const core7 = [mission1, mission2, mission3, mission4, mission5, mission6, mission7];
  const core7Done = core7.every((m) => m.completed);
  const mission8 = {
    id: 8, emoji: '💎', title: 'Rumo aos R$ 10.000/mês',
    objective: 'Alcançar o próximo patamar. Faturar R$ 10.000 em um único mês.',
    progress_pct: clampPct((bestMonth.revenue / 10000) * 100),
    progress_label: `R$ ${bestMonth.revenue.toFixed(2).replace('.', ',')} / R$ 10.000,00`,
    completed: bestMonth.revenue >= 10000,
    current_value: bestMonth.revenue, target_value: 10000,
    best_month: bestMonth.ym || null,
    unlocked: core7Done, is_bonus: true,
  };

  const missions = [mission1, mission2, mission3, mission4, mission5, mission6, mission7, mission8];
  const currentStage = core7.find((m) => !m.completed) || (mission8.unlocked ? mission8 : core7[core7.length - 1]);
  const grandCompleted = core7Done;

  // ---- Persistence: first-completion timestamps ----
  // Persist journey_completed_at (grand achievement) and per-mission completion dates
  // the first time each flips to completed. Same idempotent pattern for both.
  const nowIso = new Date().toISOString();
  const existingMissionDates = journey?.missions_completed_at || {};
  const missionUpdates = {};
  for (const m of missions) {
    if (m.completed && !existingMissionDates[String(m.id)]) {
      missionUpdates[`missions_completed_at.${m.id}`] = nowIso;
    }
  }
  let issuedAt = journey?.journey_completed_at || null;
  const persist = {};
  if (grandCompleted && !issuedAt) {
    issuedAt = nowIso;
    persist.journey_completed_at = nowIso;
  }
  Object.assign(persist, missionUpdates);
  if (Object.keys(persist).length) {
    persist.updated_at = nowIso;
    await db.collection('pi_journey').updateOne(
      { user_id: user.user_id }, { $set: persist }, { upsert: true }
    );
  }

  const missionsCompletedAt = { ...existingMissionDates };
  for (const k of Object.keys(missionUpdates)) {
    const id = k.split('.')[1];
    missionsCompletedAt[id] = nowIso;
  }

  return {
    user: { name: user.name, email: user.email },
    dashboard: {
      total_revenue: totalRevenue,
      clients_count: clientsCount,
      delivered_count: delivered.length,
      recurring_count: rec,
    },
    current_stage_id: currentStage.id,
    grand_completed: grandCompleted,
    journey_completed_at: issuedAt,
    missions_completed_at: missionsCompletedAt,
    missions,
  };
}


async function handle(request, method, path) {
  const p = path || [];

  // Lightweight health probe: does NOT call ensureSeeded() and DOES
  // touch Mongo (ping) so ops can distinguish "process alive" from
  // "app actually healthy". Returns 503 if the DB is unreachable.
  if (method === 'GET' && p[0] === 'health') {
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      return json({ status: 'ok', db: 'ok' });
    } catch (e) {
      return json({ status: 'degraded', db: 'error', error: e.message }, { status: 503 });
    }
  }

  await ensureSeeded();
  const db = await getDb();

  if (method === 'GET' && p.length === 0) {
    return json({ message: 'Cozinha Lucrativa API', status: 'ok' });
  }

  // --- Auth ---
  if (method === 'POST' && p[0] === 'auth' && p[1] === 'session') {
    const body = await request.json().catch(() => ({}));
    const sessionId = body.session_id;
    const deviceId = (body.device_id || '').trim();
    const deviceName = (body.device_name || 'Dispositivo desconhecido').toString().slice(0, 80);
    const deviceUa  = (request.headers.get('user-agent') || '').slice(0, 300);
    if (!sessionId) return err(400, 'session_id required');
    if (!deviceId) return err(400, 'device_id required');
    const resp = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
      headers: { 'X-Session-ID': sessionId },
    });
    if (!resp.ok) return err(401, 'Invalid session_id');
    const data = await resp.json();
    const { email, name, picture, session_token } = data;
    if (!email || !session_token) return err(502, 'Bad auth response');

    let userDoc = await db.collection('users').findOne({ email }, { projection: { _id: 0 } });

    // Paid-access gate: só entra quem pagou (ou allowlist admin/professor).
    if (!BETA_MODE) {
      const allowed = await hasActiveAccess(db, email, userDoc);
      if (!allowed) {
        return NextResponse.json(
          { detail: 'Nenhuma assinatura ativa encontrada para este e-mail.', code: 'NO_ACCESS', email },
          { status: 402 },
        );
      }
    }

    let userId;
    if (userDoc) {
      userId = userDoc.user_id;
      await db.collection('users').updateOne({ user_id: userId }, { $set: { name, picture } });
    } else {
      userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      await db.collection('users').insertOne({
        user_id: userId, email, name: name || email, picture,
        created_at: new Date().toISOString(),
      });
    }

    // --- Anti-sharing: device limit (max 2 per user) ---
    const MAX_DEVICES = 2;
    const nowIso = new Date().toISOString();
    const existingDevice = await db.collection('user_devices').findOne({ user_id: userId, device_id: deviceId }, { projection: { _id: 0 } });
    if (!existingDevice) {
      const userDevices = await db.collection('user_devices').find({ user_id: userId }, { projection: { _id: 0 } }).limit(10).toArray();
      if (userDevices.length >= MAX_DEVICES) {
        return NextResponse.json({
          detail: 'Você atingiu o limite de dispositivos cadastrados.',
          code: 'DEVICE_LIMIT',
          devices: userDevices.map(d => ({
            device_id: d.device_id,
            device_name: d.device_name,
            last_seen_at: d.last_seen_at,
            created_at: d.created_at,
          })),
        }, { status: 409 });
      }
      await db.collection('user_devices').insertOne({
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName,
        device_ua: deviceUa,
        created_at: nowIso,
        last_seen_at: nowIso,
      });
    } else {
      await db.collection('user_devices').updateOne(
        { user_id: userId, device_id: deviceId },
        { $set: { device_name: deviceName, device_ua: deviceUa, last_seen_at: nowIso } },
      );
    }

    // --- One active session per user: kill all previous sessions ---
    await db.collection('user_sessions').deleteMany({ user_id: userId });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.collection('user_sessions').insertOne({
      user_id: userId,
      session_token,
      device_id: deviceId,
      expires_at: expiresAt.toISOString(),
      created_at: nowIso,
    });

    // Acesso pago libera o app inteiro (todos os cursos).
    {
      const courses = await db.collection('courses').find({}, { projection: { _id: 0, slug: 1 } }).limit(100).toArray();
      for (const c of courses) await ensureEnrollment(userId, c.slug);
    }

    const finalUser = await db.collection('users').findOne({ user_id: userId }, { projection: { _id: 0 } });
    const response = NextResponse.json({ user: { ...finalUser, has_access: true } });
    response.cookies.set('session_token', session_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  }

  // --- Devices (anti-sharing management) ---
  if (method === 'GET' && p[0] === 'devices') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const cookie = request.cookies.get('session_token');
    const currentSession = cookie?.value
      ? await db.collection('user_sessions').findOne({ session_token: cookie.value }, { projection: { _id: 0 } })
      : null;
    const currentDeviceId = currentSession?.device_id || null;
    const devices = await db.collection('user_devices')
      .find({ user_id: user.user_id }, { projection: { _id: 0 } })
      .sort({ last_seen_at: -1 })
      .limit(10)
      .toArray();
    return json(devices.map(d => ({
      device_id: d.device_id,
      device_name: d.device_name,
      device_ua: d.device_ua,
      created_at: d.created_at,
      last_seen_at: d.last_seen_at,
      is_current: d.device_id === currentDeviceId,
    })));
  }

  if (method === 'POST' && p[0] === 'devices' && p[1] === 'disconnect') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json().catch(() => ({}));
    const targetId = (body.device_id || '').trim();
    if (!targetId) return err(400, 'device_id required');
    await db.collection('user_devices').deleteOne({ user_id: user.user_id, device_id: targetId });
    // If the disconnected device has an active session, kill it too.
    await db.collection('user_sessions').deleteMany({ user_id: user.user_id, device_id: targetId });
    // If user disconnected the current device, clear the cookie.
    const cookie = request.cookies.get('session_token');
    const stillMine = cookie?.value
      ? await db.collection('user_sessions').findOne({ session_token: cookie.value })
      : null;
    const response = NextResponse.json({ ok: true, disconnected_current: !stillMine });
    if (!stillMine) {
      response.cookies.set('session_token', '', { path: '/', maxAge: 0, sameSite: 'none', secure: true });
    }
    return response;
  }

  if (method === 'GET' && p[0] === 'auth' && p[1] === 'me') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const access = BETA_MODE ? true : await hasActiveAccess(db, user.email, user);
    return json({ ...user, has_access: access });
  }

  if (method === 'POST' && p[0] === 'auth' && p[1] === 'logout') {
    const cookie = request.cookies.get('session_token');
    if (cookie?.value) {
      await db.collection('user_sessions').deleteOne({ session_token: cookie.value });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set('session_token', '', { path: '/', maxAge: 0, sameSite: 'none', secure: true });
    return response;
  }

  // --- Profile (Perfil pessoal do aluno) ---
  // pi_profiles: { user_id, city, specialty, monthly_goal, favorite_dish, motto, updated_at, created_at }
  if (method === 'GET' && p[0] === 'profile' && p[1] === 'me') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    let profile = await db.collection('pi_profiles').findOne({ user_id: user.user_id }, { projection: { _id: 0 } });
    if (!profile) {
      profile = {
        user_id: user.user_id,
        city: '',
        specialty: '',
        monthly_goal: 0,
        favorite_dish: '',
        motto: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.collection('pi_profiles').insertOne({ ...profile });
    }
    const store = await db.collection('pi_stores').findOne({ user_id: user.user_id }, { projection: { _id: 0 } });
    const isComplete = !!(profile.city && profile.specialty && (profile.monthly_goal || 0) > 0);
    return json({
      user: { name: user.name, email: user.email, picture: user.picture || null },
      profile,
      store: store ? { slug: store.slug, store_name: store.store_name, tagline: store.tagline, whatsapp: store.whatsapp } : null,
      profile_complete: isComplete,
    });
  }

  if (method === 'PUT' && p[0] === 'profile' && p[1] === 'me') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const patch = { updated_at: new Date().toISOString() };
    if (body.city !== undefined) patch.city = String(body.city).slice(0, 60);
    if (body.specialty !== undefined) patch.specialty = String(body.specialty).slice(0, 60);
    if (body.monthly_goal !== undefined) patch.monthly_goal = Math.max(0, Number(body.monthly_goal) || 0);
    if (body.favorite_dish !== undefined) patch.favorite_dish = String(body.favorite_dish).slice(0, 80);
    if (body.motto !== undefined) patch.motto = String(body.motto).slice(0, 140);
    if (body.name !== undefined) {
      const cleanName = String(body.name).trim().slice(0, 60);
      if (cleanName) await db.collection('users').updateOne({ user_id: user.user_id }, { $set: { name: cleanName } });
    }
    await db.collection('pi_profiles').updateOne(
      { user_id: user.user_id },
      { $set: patch, $setOnInsert: { user_id: user.user_id, created_at: new Date().toISOString() } },
      { upsert: true }
    );
    const profile = await db.collection('pi_profiles').findOne({ user_id: user.user_id }, { projection: { _id: 0 } });
    const updatedUser = await db.collection('users').findOne({ user_id: user.user_id }, { projection: { _id: 0 } });
    return json({ profile, user: updatedUser });
  }

  if (method === 'GET' && p[0] === 'profile' && p[1] === 'stats') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');

    const [enrollments, allCourses, orders, recipes, notes, profile] = await Promise.all([
      db.collection('enrollments').find({ user_id: user.user_id }, { projection: { _id: 0 } }).toArray(),
      db.collection('courses').find({}, { projection: { _id: 0 } }).limit(100).toArray(),
      db.collection('pi_orders').find({ user_id: user.user_id }, { projection: { _id: 0 } }).toArray(),
      db.collection('pi_recipes').find({ user_id: user.user_id }, { projection: { _id: 0, id: 1, created_at: 1, available: 1 } }).toArray(),
      db.collection('pi_notes').find({ user_id: user.user_id }, { projection: { _id: 0, id: 1, created_at: 1 } }).toArray(),
      db.collection('pi_profiles').findOne({ user_id: user.user_id }, { projection: { _id: 0 } }),
    ]);
    const journey = await db.collection('pi_journey').findOne({ user_id: user.user_id }, { projection: { _id: 0 } });

    // Cursos concluídos + aulas assistidas
    const cursosConcluidos = enrollments.filter((e) => (e.progress || 0) >= 100).length;
    const aulasAssistidas = enrollments.reduce((n, e) => n + ((e.completed_lessons || []).length), 0);
    const cursosMatriculados = enrollments.length;

    // Clientes atendidos + faturamento
    const delivered = orders.filter((o) => o.status === 'delivered');
    const clientKey = (o) => `${(o.client_name || '').trim().toLowerCase()}|${(o.client_phone || '').replace(/\D/g, '')}`;
    const clientsSet = new Set();
    for (const o of delivered) {
      const k = clientKey(o);
      if (k.trim() && k !== '|') clientsSet.add(k);
    }
    const clientesAtendidos = clientsSet.size;
    const pedidosEntregues = delivered.length;

    // Mês corrente
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthDelivered = delivered.filter((o) => (o.delivery_date || '').startsWith(monthPrefix));
    const faturamentoMes = monthDelivered.reduce((s, o) => s + (Number(o.total_value) || 0), 0);
    const monthlyGoal = Math.max(0, Number(profile?.monthly_goal) || 0);

    // Sequência de dias estudando (baseado em atualizações de enrollments com aulas concluídas)
    const activityDates = new Set();
    for (const e of enrollments) {
      if (e.updated_at && (e.completed_lessons || []).length > 0) {
        activityDates.add(e.updated_at.slice(0, 10));
      }
    }
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    let streak = 0;
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (activityDates.has(iso(d))) streak += 1;
      else if (i > 0) break;
    }

    // Chart 30 dias — pedidos entregues por dia + aulas concluídas por dia
    const chart = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = iso(d);
      const deliveredDay = delivered.filter((o) => o.delivery_date === key).length;
      const revenueDay = delivered
        .filter((o) => o.delivery_date === key)
        .reduce((s, o) => s + (Number(o.total_value) || 0), 0);
      chart.push({ date: key, entregues: deliveredDay, faturamento: revenueDay });
    }

    // Missões da Jornada — resumo
    const missionsCompletedAt = journey?.missions_completed_at || {};
    const missoesConcluidas = Object.keys(missionsCompletedAt).length;

    // Curso em andamento (mais recentemente atualizado, progresso < 100)
    const inProgress = enrollments
      .filter((e) => (e.progress || 0) < 100 && (e.completed_lessons || []).length > 0)
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
    let currentCourse = null;
    if (inProgress) {
      const c = allCourses.find((x) => x.slug === inProgress.course_slug);
      if (c) {
        currentCourse = {
          slug: c.slug,
          title: c.title,
          cover_image: c.cover_image || null,
          progress: inProgress.progress || 0,
        };
      }
    }

    return json({
      kpis: {
        cursos_concluidos: cursosConcluidos,
        cursos_matriculados: cursosMatriculados,
        aulas_assistidas: aulasAssistidas,
        clientes_atendidos: clientesAtendidos,
        pedidos_entregues: pedidosEntregues,
        streak_dias: streak,
      },
      faturamento_mes: faturamentoMes,
      meta_mensal: monthlyGoal,
      chart_30d: chart,
      missoes_concluidas: missoesConcluidas,
      missoes_total: 8,
      journey_completed_at: journey?.journey_completed_at || null,
      current_course: currentCourse,
      recipes_count: recipes.length,
      notes_count: notes.length,
      orders_count: orders.length,
    });
  }

  // --- Courses ---
  if (method === 'GET' && p[0] === 'courses' && p.length === 1) {
    const docs = await db.collection('courses').find({}, { projection: { _id: 0 } }).limit(100).toArray();
    return json(docs);
  }
  if (method === 'GET' && p[0] === 'courses' && p.length === 2) {
    const course = await loadCourseWithModules(db, p[1]);
    if (!course) return err(404, 'Course not found');
    return json(course);
  }

  // --- Plans ---
  if (method === 'GET' && p[0] === 'plans') {
    return json(PLANS);
  }

  // --- Enrollments ---
  if (method === 'GET' && p[0] === 'enrollments' && p.length === 1) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const enrolls = await db.collection('enrollments').find({ user_id: user.user_id }, { projection: { _id: 0 } }).limit(200).toArray();
    const slugs = enrolls.map(e => e.course_slug);
    const courses = await db.collection('courses').find({ slug: { $in: slugs } }, { projection: { _id: 0 } }).limit(200).toArray();
    const courseMap = Object.fromEntries(courses.map(c => [c.slug, c]));
    for (const e of enrolls) {
      const c = courseMap[e.course_slug];
      if (c) {
        e.course = {
          slug: c.slug, title: c.title, tagline: c.tagline,
          cover_image: c.cover_image, duration: c.duration,
          modules_count: (c.modules || []).length,
        };
      }
    }
    return json(enrolls);
  }

  if (method === 'GET' && p[0] === 'enrollments' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const e = await db.collection('enrollments').findOne({ user_id: user.user_id, course_slug: p[1] }, { projection: { _id: 0 } });
    if (!e) return err(404, 'Not enrolled');
    return json(e);
  }

  if (method === 'POST' && p[0] === 'enrollments' && p[1] === 'complete-lesson') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const { course_slug, lesson_id } = body;
    const course = await loadCourseWithModules(db, course_slug);
    if (!course) return err(404, 'Course not found');
    const enrollment = await db.collection('enrollments').findOne({ user_id: user.user_id, course_slug }, { projection: { _id: 0 } });
    if (!enrollment) return err(403, 'Not enrolled');
    const validIds = new Set();
    for (const m of course.modules || []) for (const ln of m.lessons || []) validIds.add(ln.id);
    if (!validIds.has(lesson_id)) return err(400, 'Invalid lesson_id');
    const completed = new Set(enrollment.completed_lessons || []);
    if (completed.has(lesson_id)) completed.delete(lesson_id); else completed.add(lesson_id);
    const totalLessons = courseTotalLessons(course);
    const progress = totalLessons ? Math.round(100 * completed.size / totalLessons) : 0;
    const completed_at = progress === 100 ? new Date().toISOString() : null;
    await db.collection('enrollments').updateOne(
      { user_id: user.user_id, course_slug },
      { $set: { completed_lessons: [...completed], progress, completed_at, updated_at: new Date().toISOString() } }
    );
    return json(await db.collection('enrollments').findOne({ user_id: user.user_id, course_slug }, { projection: { _id: 0 } }));
  }

  if (method === 'POST' && p[0] === 'enrollments' && p[1] === 'complete-module') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const { course_slug, module_id } = body;
    const course = await loadCourseWithModules(db, course_slug);
    if (!course) return err(404, 'Course not found');
    const enrollment = await db.collection('enrollments').findOne({ user_id: user.user_id, course_slug }, { projection: { _id: 0 } });
    if (!enrollment) return err(403, 'Not enrolled');
    const validIds = new Set((course.modules || []).map(m => m.id));
    if (!validIds.has(module_id)) return err(400, 'Invalid module_id');
    const completed = new Set(enrollment.completed_modules || []);
    if (completed.has(module_id)) completed.delete(module_id); else completed.add(module_id);
    const total = (course.modules || []).length;
    const progress = total ? Math.round(100 * completed.size / total) : 0;
    const completed_at = progress === 100 ? new Date().toISOString() : null;
    await db.collection('enrollments').updateOne(
      { user_id: user.user_id, course_slug },
      { $set: { completed_modules: [...completed], progress, completed_at, updated_at: new Date().toISOString() } }
    );
    return json(await db.collection('enrollments').findOne({ user_id: user.user_id, course_slug }, { projection: { _id: 0 } }));
  }

  // --- Sync (Drive scraper) ---
  if (method === 'POST' && p[0] === 'sync' && p.length === 2) {
    try {
      const result = await syncCourse(p[1]);
      return json(result);
    } catch (e) {
      return err(502, e.message);
    }
  }
  if (method === 'POST' && p[0] === 'sync-all') {
    if (process.env.NODE_ENV === 'production') return err(403, 'Admin endpoint disabled in production');
    const courses = await db.collection('courses').find({}, { projection: { _id: 0, slug: 1 } }).limit(100).toArray();
    const results = [];
    for (const c of courses) {
      try { results.push(await syncCourse(c.slug)); }
      catch (e) { results.push({ slug: c.slug, error: e.message }); }
    }
    return json({ results });
  }

  // --- Dev enroll ---
  if (method === 'POST' && p[0] === 'dev' && p[1] === 'enroll' && p.length === 3) {
    if (process.env.NODE_ENV === 'production') return err(403, 'Admin endpoint disabled in production');
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const course = await db.collection('courses').findOne({ slug: p[2] }, { projection: { _id: 0 } });
    if (!course) return err(404, 'Course not found');
    await ensureEnrollment(user.user_id, p[2]);
    // Cascade: if the course is a combo, also ensure enrollment in all sub-courses.
    if (Array.isArray(course.combined_from) && course.combined_from.length) {
      for (const sub of course.combined_from) {
        const s = await db.collection('courses').findOne({ slug: sub }, { projection: { _id: 0, slug: 1 } });
        if (s) await ensureEnrollment(user.user_id, sub);
      }
    }
    return json({ ok: true, course_slug: p[2] });
  }

  // --- Ensure combo cascade access ---
  // When the user opens the modules screen of a combo, guarantee that all
  // sub-course enrollments exist. This is a no-op if BETA_MODE already
  // enrolled them everywhere.
  if (method === 'POST' && p[0] === 'enrollments' && p[1] === 'ensure-combo' && p.length === 3) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const combo = await db.collection('courses').findOne({ slug: p[2] }, { projection: { _id: 0 } });
    if (!combo) return err(404, 'Course not found');
    const parent = await db.collection('enrollments').findOne({ user_id: user.user_id, course_slug: p[2] });
    if (!parent) return err(403, 'Combo not purchased');
    const created = [];
    if (Array.isArray(combo.combined_from) && combo.combined_from.length) {
      for (const sub of combo.combined_from) {
        const exists = await db.collection('enrollments').findOne({ user_id: user.user_id, course_slug: sub });
        if (!exists) {
          await ensureEnrollment(user.user_id, sub);
          created.push(sub);
        }
      }
    }
    return json({ ok: true, created });
  }

  // --- Certificate ---
  if (method === 'GET' && p[0] === 'certificate' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const enrollment = await db.collection('enrollments').findOne({ user_id: user.user_id, course_slug: p[1] }, { projection: { _id: 0 } });
    if (!enrollment) return err(403, 'Not enrolled');
    if ((enrollment.progress || 0) < 100) return err(400, 'Course not completed yet');
    const course = await db.collection('courses').findOne({ slug: p[1] }, { projection: { _id: 0 } });
    return json({
      student_name: user.name,
      student_email: user.email,
      course_title: course.title,
      course_slug: p[1],
      instructor: course.instructor || 'Cozinha Lucrativa',
      duration: course.duration || '',
      issued_at: enrollment.completed_at || new Date().toISOString(),
    });
  }

  // --- Precificação Inteligente (simples) ---
  // Recipe schema: {name, ingredient_cost, fixed_costs, extra_costs, prep_minutes,
  //                 desired_earning, yield_quantity, yield_unit, competitor_price}
  const buildResult = (recipe) => {
    const ingredient_cost = Number(recipe.ingredient_cost) || 0;
    const fixed_costs = Number(recipe.fixed_costs) || 0;
    const extra_costs = Number(recipe.extra_costs) || 0;
    const desired_earning = Number(recipe.desired_earning) || 0;
    const total_costs = ingredient_cost + fixed_costs + extra_costs;
    const base_price = total_costs + desired_earning;
    // Three margin options ON TOP of base price (safety buffers for market)
    // low: 0% extra (just covers costs + earning), medium: 20% extra, high: 45% extra
    const options = [
      { level: 'low', margin_extra: 0.00, label: 'Baixo' },
      { level: 'medium', margin_extra: 0.20, label: 'Médio' },
      { level: 'high', margin_extra: 0.45, label: 'Alto' },
    ].map(o => {
      const price = base_price * (1 + o.margin_extra);
      const profit = price - total_costs;
      const margin = price > 0 ? profit / price : 0;
      return {
        level: o.level,
        label: o.label,
        price,
        price_per_unit: recipe.yield_quantity ? price / recipe.yield_quantity : price,
        profit,
        margin,
      };
    });
    // Recommended = medium
    return {
      ingredient_cost, fixed_costs, extra_costs, desired_earning,
      total_costs, base_price,
      prep_minutes: Number(recipe.prep_minutes) || 0,
      options,
      recommended_level: 'medium',
    };
  };

  // Recipes CRUD
  if (method === 'GET' && p[0] === 'recipes' && p.length === 1) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const docs = await db.collection('pi_recipes')
      .find({ user_id: user.user_id }, { projection: { _id: 0 } })
      .sort({ created_at: -1 }).limit(200).toArray();
    return json(docs.map(r => ({ ...r, computed: buildResult(r) })));
  }
  if (method === 'GET' && p[0] === 'recipes' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const doc = await db.collection('pi_recipes').findOne({ id: p[1], user_id: user.user_id }, { projection: { _id: 0 } });
    if (!doc) return err(404, 'Not found');
    return json({ ...doc, computed: buildResult(doc) });
  }
  const pickFields = (b) => ({
    name: b.name !== undefined ? String(b.name).trim() : undefined,
    ingredient_cost: b.ingredient_cost !== undefined ? Number(b.ingredient_cost) || 0 : undefined,
    fixed_costs: b.fixed_costs !== undefined ? Number(b.fixed_costs) || 0 : undefined,
    extra_costs: b.extra_costs !== undefined ? Number(b.extra_costs) || 0 : undefined,
    prep_minutes: b.prep_minutes !== undefined ? Number(b.prep_minutes) || 0 : undefined,
    desired_earning: b.desired_earning !== undefined ? Number(b.desired_earning) || 0 : undefined,
    yield_quantity: b.yield_quantity !== undefined ? Number(b.yield_quantity) || 1 : undefined,
    yield_unit: b.yield_unit !== undefined ? String(b.yield_unit) : undefined,
    competitor_price: b.competitor_price !== undefined ? (b.competitor_price === null || b.competitor_price === '' ? null : Number(b.competitor_price)) : undefined,
    // Vitrine fields
    photo: b.photo !== undefined ? (b.photo || null) : undefined,
    short_description: b.short_description !== undefined ? String(b.short_description || '') : undefined,
    available: b.available !== undefined ? !!b.available : undefined,
    display_price: b.display_price !== undefined ? (b.display_price === null || b.display_price === '' ? null : Number(b.display_price)) : undefined,
    // Minhas Anotações (personal notes visible only to the owner)
    personal_notes: b.personal_notes !== undefined ? String(b.personal_notes || '') : undefined,
  });
  if (method === 'POST' && p[0] === 'recipes' && p.length === 1) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    if (!body.name) return err(400, 'name required');
    const fields = pickFields(body);
    const doc = {
      id: `rec_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: user.user_id,
      name: fields.name,
      ingredient_cost: fields.ingredient_cost || 0,
      fixed_costs: fields.fixed_costs || 0,
      extra_costs: fields.extra_costs || 0,
      prep_minutes: fields.prep_minutes || 0,
      desired_earning: fields.desired_earning || 0,
      yield_quantity: fields.yield_quantity || 1,
      yield_unit: fields.yield_unit || 'unidade',
      competitor_price: fields.competitor_price ?? null,
      photo: fields.photo || null,
      short_description: fields.short_description || '',
      available: fields.available !== undefined ? fields.available : true,
      display_price: fields.display_price ?? null,
      personal_notes: fields.personal_notes || '',
      created_at: new Date().toISOString(),
    };
    await db.collection('pi_recipes').insertOne(doc);
    const { _id, ...clean } = doc;
    return json({ ...clean, computed: buildResult(clean) });
  }
  if (method === 'PUT' && p[0] === 'recipes' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const fields = pickFields(body);
    const patch = {};
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) patch[k] = v;
    if (!Object.keys(patch).length) return err(400, 'No fields');
    await db.collection('pi_recipes').updateOne({ id: p[1], user_id: user.user_id }, { $set: patch });
    const doc = await db.collection('pi_recipes').findOne({ id: p[1], user_id: user.user_id }, { projection: { _id: 0 } });
    if (!doc) return err(404, 'Not found');
    return json({ ...doc, computed: buildResult(doc) });
  }
  if (method === 'DELETE' && p[0] === 'recipes' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    await db.collection('pi_recipes').deleteOne({ id: p[1], user_id: user.user_id });
    return json({ ok: true });
  }

  // --- Meu Caderno: quick notes com categorização automática ---
  if (method === 'GET' && p[0] === 'notes' && p.length === 1) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const docs = await db.collection('pi_notes')
      .find({ user_id: user.user_id }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(500)
      .toArray();
    return json(docs);
  }
  if (method === 'POST' && p[0] === 'notes' && p.length === 1) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const text = String(body.text || '').trim();
    if (!text) return err(400, 'text required');
    const validCats = ['receitas', 'clientes', 'fornecedores', 'ideias', 'lembretes'];
    const category = validCats.includes(body.category) ? body.category : 'ideias';
    const doc = {
      id: `nt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: user.user_id,
      text: text.slice(0, 1000),
      category,
      created_at: new Date().toISOString(),
    };
    await db.collection('pi_notes').insertOne(doc);
    const { _id, ...clean } = doc;
    return json(clean);
  }
  if (method === 'PUT' && p[0] === 'notes' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const validCats = ['receitas', 'clientes', 'fornecedores', 'ideias', 'lembretes'];
    const patch = {};
    if (typeof body.text === 'string') patch.text = body.text.trim().slice(0, 1000);
    if (validCats.includes(body.category)) patch.category = body.category;
    if (!Object.keys(patch).length) return err(400, 'nothing to update');
    await db.collection('pi_notes').updateOne(
      { id: p[1], user_id: user.user_id },
      { $set: patch }
    );
    const doc = await db.collection('pi_notes').findOne(
      { id: p[1], user_id: user.user_id },
      { projection: { _id: 0 } }
    );
    if (!doc) return err(404, 'Note not found');
    return json(doc);
  }
  if (method === 'DELETE' && p[0] === 'notes' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    await db.collection('pi_notes').deleteOne({ id: p[1], user_id: user.user_id });
    return json({ ok: true });
  }

  // Save budget (persist chosen option to history + simulation)
  if (method === 'POST' && p[0] === 'pricing' && p[1] === 'save') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const { recipe_id, level = 'medium', intended_units } = body;
    const recipe = await db.collection('pi_recipes').findOne({ id: recipe_id, user_id: user.user_id }, { projection: { _id: 0 } });
    if (!recipe) return err(404, 'Recipe not found');
    const r = buildResult(recipe);
    const chosen = r.options.find(o => o.level === level) || r.options[1];
    const units = Number(intended_units) || recipe.yield_quantity || 1;
    const estimated_revenue = chosen.price_per_unit * units;
    const cost_per_unit = recipe.yield_quantity ? r.total_costs / recipe.yield_quantity : r.total_costs;
    const estimated_profit = estimated_revenue - cost_per_unit * units;
    const record = {
      id: `pcalc_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: user.user_id,
      recipe_id, recipe_name: recipe.name,
      level: chosen.level,
      ingredient_cost: r.ingredient_cost,
      fixed_costs: r.fixed_costs,
      extra_costs: r.extra_costs,
      desired_earning: r.desired_earning,
      chosen_price: chosen.price,
      chosen_price_per_unit: chosen.price_per_unit,
      margin: chosen.margin,
      created_at: new Date().toISOString(),
    };
    await db.collection('pi_pricing_calculations').insertOne(record);
    await db.collection('pi_sales_simulations').insertOne({
      id: `psim_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: user.user_id, recipe_id, recipe_name: recipe.name,
      quantity: units, estimated_revenue, estimated_profit,
      created_at: new Date().toISOString(),
    });
    const { _id, ...clean } = record;
    return json({ ...clean, estimated_revenue, estimated_profit });
  }

  if (method === 'GET' && p[0] === 'pricing' && p[1] === 'history') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const items = await db.collection('pi_pricing_calculations')
      .find({ user_id: user.user_id }, { projection: { _id: 0 } })
      .sort({ created_at: -1 }).limit(50).toArray();
    return json(items);
  }

  if (method === 'GET' && p[0] === 'pricing' && p[1] === 'dashboard') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const sims = await db.collection('pi_sales_simulations')
      .find({ user_id: user.user_id, created_at: { $gte: monthStart } }, { projection: { _id: 0 } })
      .toArray();
    let month_revenue = 0, month_profit = 0;
    const byRecipeQty = {}, byRecipeProfit = {};
    for (const s of sims) {
      month_revenue += s.estimated_revenue || 0;
      month_profit += s.estimated_profit || 0;
      byRecipeQty[s.recipe_id] = (byRecipeQty[s.recipe_id] || 0) + (s.quantity || 0);
      byRecipeProfit[s.recipe_id] = (byRecipeProfit[s.recipe_id] || 0) + (s.estimated_profit || 0);
    }
    const nameFor = async (rid) => {
      const r = await db.collection('pi_recipes').findOne({ id: rid, user_id: user.user_id }, { projection: { _id: 0, name: 1 } });
      return r?.name || 'Receita';
    };
    let most_profitable = null, best_selling = null;
    const rids = Object.keys(byRecipeProfit);
    if (rids.length) {
      const topP = rids.sort((a, b) => byRecipeProfit[b] - byRecipeProfit[a])[0];
      const topQ = Object.keys(byRecipeQty).sort((a, b) => byRecipeQty[b] - byRecipeQty[a])[0];
      most_profitable = { recipe_id: topP, recipe_name: await nameFor(topP), profit: byRecipeProfit[topP] };
      best_selling = { recipe_id: topQ, recipe_name: await nameFor(topQ), quantity: byRecipeQty[topQ] };
    }
    return json({ month_revenue, month_profit, most_profitable, best_selling, simulations_count: sims.length });
  }

  // --- Minha Vitrine (loja pública) ---
  const slugRe = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
  const normalizeSlug = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);

  if (method === 'GET' && p[0] === 'vitrine' && p[1] === 'me') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    let store = await db.collection('pi_stores').findOne({ user_id: user.user_id }, { projection: { _id: 0 } });
    if (!store) {
      // create default store with slug from email prefix or name
      const raw = (user.name || user.email || 'loja').split('@')[0];
      let baseSlug = normalizeSlug(raw) || `loja-${user.user_id.slice(-6)}`;
      let candidate = baseSlug;
      let i = 1;
      while (await db.collection('pi_stores').findOne({ slug: candidate })) {
        i += 1;
        candidate = `${baseSlug}-${i}`;
      }
      store = {
        user_id: user.user_id,
        slug: candidate,
        store_name: `Doces da ${(user.name || 'loja').split(' ')[0]}`,
        tagline: 'Feitos sob encomenda',
        whatsapp: '',
        intro_message: '',
        created_at: new Date().toISOString(),
      };
      await db.collection('pi_stores').insertOne(store);
    }
    return json(store);
  }
  if (method === 'PUT' && p[0] === 'vitrine' && p[1] === 'me') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const patch = {};
    if (body.slug !== undefined) {
      const s = normalizeSlug(body.slug);
      if (!slugRe.test(s)) return err(400, 'Link inválido. Use letras e números (3-30 caracteres).');
      const taken = await db.collection('pi_stores').findOne({ slug: s, user_id: { $ne: user.user_id } });
      if (taken) return err(409, 'Este link já está em uso. Escolha outro.');
      patch.slug = s;
    }
    if (body.store_name !== undefined) patch.store_name = String(body.store_name).slice(0, 60);
    if (body.tagline !== undefined) patch.tagline = String(body.tagline).slice(0, 80);
    if (body.whatsapp !== undefined) patch.whatsapp = String(body.whatsapp).replace(/\D/g, '').slice(0, 20);
    if (body.intro_message !== undefined) patch.intro_message = String(body.intro_message).slice(0, 300);
    if (!Object.keys(patch).length) return err(400, 'No fields');
    await db.collection('pi_stores').updateOne({ user_id: user.user_id }, { $set: patch }, { upsert: true });
    const store = await db.collection('pi_stores').findOne({ user_id: user.user_id }, { projection: { _id: 0 } });
    return json(store);
  }

  if (method === 'GET' && p[0] === 'vitrine' && p[1] === 'check-slug' && p.length === 3) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const s = normalizeSlug(p[2]);
    if (!slugRe.test(s)) return json({ available: false, reason: 'invalid' });
    const taken = await db.collection('pi_stores').findOne({ slug: s, user_id: { $ne: user.user_id } });
    return json({ available: !taken, slug: s });
  }

  // Public storefront endpoint (no auth)
  if (method === 'GET' && p[0] === 'vitrine' && p.length === 2 && p[1] !== 'me') {
    const store = await db.collection('pi_stores').findOne({ slug: p[1] }, { projection: { _id: 0 } });
    if (!store) return err(404, 'Loja não encontrada');
    const recipes = await db.collection('pi_recipes')
      .find({ user_id: store.user_id, available: true }, { projection: { _id: 0 } })
      .sort({ created_at: -1 }).limit(200).toArray();
    const products = recipes.map((r) => {
      const priceFromMedium = () => {
        const total = (Number(r.ingredient_cost) || 0) + (Number(r.fixed_costs) || 0) + (Number(r.extra_costs) || 0);
        const base = total + (Number(r.desired_earning) || 0);
        return base * 1.20;
      };
      const price = r.display_price != null ? Number(r.display_price) : priceFromMedium();
      return {
        id: r.id,
        name: r.name,
        photo: r.photo || null,
        short_description: r.short_description || '',
        price,
        yield_quantity: r.yield_quantity,
        yield_unit: r.yield_unit,
      };
    });
    return json({
      slug: store.slug,
      store_name: store.store_name || 'Minha Vitrine',
      tagline: store.tagline || '',
      whatsapp: store.whatsapp || '',
      intro_message: store.intro_message || '',
      products,
    });
  }

  // --- Payments (BETA MODE — auto enroll) ---
  if (method === 'POST' && p[0] === 'payments' && p[1] === 'checkout') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const { course_slug, origin_url } = body;
    await ensureEnrollment(user.user_id, course_slug);
    return json({ url: `${origin_url}/payment/success?session_id=beta_${uuidv4()}`, session_id: `beta_${uuidv4()}` });
  }
  if (method === 'POST' && p[0] === 'payments' && p[1] === 'checkout-plan') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const { plan_id, course_slugs = [], origin_url } = body;
    let selected = course_slugs;
    if (plan_id === 'library') {
      const all = await db.collection('courses').find({}, { projection: { _id: 0, slug: 1 } }).toArray();
      selected = all.map(c => c.slug);
    }
    for (const s of selected) await ensureEnrollment(user.user_id, s);
    const firstSlug = selected[0];
    return json({
      url: `${origin_url}/payment/success?session_id=beta_${uuidv4()}${firstSlug ? `&s=${firstSlug}` : ''}`,
      session_id: `beta_${uuidv4()}`,
      plan_id,
    });
  }
  if (method === 'POST' && p[0] === 'payments' && p[1] === 'checkout-combo') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const { combo_id, main_slug, bonus_slug, course_slugs, origin_url } = body;
    let slugs = [];
    if (Array.isArray(course_slugs) && course_slugs.length > 0) {
      slugs = course_slugs;
    } else if (main_slug && bonus_slug) {
      slugs = [main_slug, bonus_slug];
    } else {
      return err(400, 'course_slugs or (main_slug + bonus_slug) required');
    }
    const found = await db.collection('courses').find({ slug: { $in: slugs } }, { projection: { _id: 0, slug: 1 } }).toArray();
    if (found.length !== slugs.length) return err(404, 'One or more courses not found');
    for (const s of slugs) await ensureEnrollment(user.user_id, s);
    return json({
      url: `${origin_url}/payment/success?session_id=beta_${uuidv4()}&combo=${combo_id}`,
      session_id: `beta_${uuidv4()}`,
      combo_id,
      enrolled: slugs,
    });
  }
  if (method === 'GET' && p[0] === 'payments' && p[1] === 'status' && p.length === 3) {
    return json({ session_id: p[2], payment_status: 'paid', status: 'complete', course_slug: null, course_slugs: [] });
  }

  // ============ ORDERS (Encomendas) ============
  // Collection: pi_orders
  // { id, user_id, client_name, client_phone, product_name, delivery_date (YYYY-MM-DD),
  //   delivery_time (HH:MM|''), total_value, paid_amount, notes, status, created_at, updated_at }

  const pickOrderFields = (b) => ({
    client_name: b.client_name !== undefined ? String(b.client_name).trim() : undefined,
    client_phone: b.client_phone !== undefined ? String(b.client_phone || '').replace(/\D/g, '') : undefined,
    product_name: b.product_name !== undefined ? String(b.product_name).trim() : undefined,
    delivery_date: b.delivery_date !== undefined ? String(b.delivery_date) : undefined,
    delivery_time: b.delivery_time !== undefined ? String(b.delivery_time || '') : undefined,
    total_value: b.total_value !== undefined ? Number(b.total_value) || 0 : undefined,
    paid_amount: b.paid_amount !== undefined ? Number(b.paid_amount) || 0 : undefined,
    notes: b.notes !== undefined ? String(b.notes || '') : undefined,
    status: b.status !== undefined ? String(b.status) : undefined,
  });

  const enrichOrder = (o) => {
    const total = Number(o.total_value) || 0;
    const paid = Number(o.paid_amount) || 0;
    return { ...o, pending_amount: Math.max(0, total - paid), fully_paid: paid >= total && total > 0 };
  };

  if (method === 'GET' && p[0] === 'orders' && p.length === 1) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const url = new URL(request.url);
    const q = { user_id: user.user_id };
    const status = url.searchParams.get('status');
    if (status) q.status = status;
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (from || to) {
      q.delivery_date = {};
      if (from) q.delivery_date.$gte = from;
      if (to) q.delivery_date.$lte = to;
    }
    const docs = await db.collection('pi_orders')
      .find(q, { projection: { _id: 0 } })
      .sort({ delivery_date: 1, delivery_time: 1, created_at: -1 })
      .limit(500)
      .toArray();
    return json(docs.map(enrichOrder));
  }

  if (method === 'GET' && p[0] === 'orders' && p[1] === 'stats' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const all = await db.collection('pi_orders')
      .find({ user_id: user.user_id }, { projection: { _id: 0 } })
      .limit(1000)
      .toArray();
    const today = new Date();
    const tzoffset = today.getTimezoneOffset() * 60000;
    const isoToday = new Date(today.getTime() - tzoffset).toISOString().slice(0, 10);
    const in7 = new Date(today.getTime() + 7 * 86400000 - tzoffset).toISOString().slice(0, 10);
    let total_pending = 0;
    let count_open = 0;
    let count_week = 0;
    let count_today = 0;
    let total_confirmed = 0;
    for (const o of all) {
      const t = Number(o.total_value) || 0;
      const paid = Number(o.paid_amount) || 0;
      const pending = Math.max(0, t - paid);
      if (o.status !== 'delivered' && o.status !== 'cancelled') {
        total_pending += pending;
        count_open += 1;
        if (o.delivery_date >= isoToday && o.delivery_date <= in7) count_week += 1;
        if (o.delivery_date === isoToday) count_today += 1;
      }
      if (o.status !== 'cancelled') total_confirmed += t;
    }
    return json({ total_pending, total_confirmed, count_open, count_week, count_today });
  }

  if (method === 'POST' && p[0] === 'orders' && p.length === 1) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    if (!body.client_name || !body.product_name || !body.delivery_date) {
      return err(400, 'client_name, product_name and delivery_date required');
    }
    const fields = pickOrderFields(body);
    const now = new Date().toISOString();
    const doc = {
      id: `ord_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      user_id: user.user_id,
      client_name: fields.client_name,
      client_phone: fields.client_phone || '',
      product_name: fields.product_name,
      delivery_date: fields.delivery_date,
      delivery_time: fields.delivery_time || '',
      total_value: fields.total_value || 0,
      paid_amount: fields.paid_amount || 0,
      notes: fields.notes || '',
      status: fields.status || 'pending',
      created_at: now,
      updated_at: now,
    };
    await db.collection('pi_orders').insertOne(doc);
    const { _id, ...clean } = doc;
    return json(enrichOrder(clean));
  }

  if (method === 'PUT' && p[0] === 'orders' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const fields = pickOrderFields(body);
    const patch = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) patch[k] = v;
    if (Object.keys(patch).length === 1) return err(400, 'No fields');
    await db.collection('pi_orders').updateOne({ id: p[1], user_id: user.user_id }, { $set: patch });
    const doc = await db.collection('pi_orders').findOne({ id: p[1], user_id: user.user_id }, { projection: { _id: 0 } });
    if (!doc) return err(404, 'Not found');
    return json(enrichOrder(doc));
  }

  if (method === 'DELETE' && p[0] === 'orders' && p.length === 2) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    await db.collection('pi_orders').deleteOne({ id: p[1], user_id: user.user_id });
    return json({ ok: true });
  }

  // ============ JORNADA RENDA LUCRATIVA ============
  // 7 missions/stages auto-tracked from user data (recipes, store, orders, notes).
  if (method === 'GET' && p[0] === 'journey' && p[1] === 'status') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const state = await computeJourneyState(db, user);
    return json(state);
  }

  // Per-mission certificate. `id` = 1-7 (individual missions) or 'grand' (7 missions).
  if (method === 'GET' && p[0] === 'journey' && p[1] === 'certificate' && p.length === 3) {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const state = await computeJourneyState(db, user);
    const rawId = p[2];
    if (rawId === 'grand') {
      if (!state.grand_completed) return err(400, 'Journey not completed yet');
      return json({
        student_name: user.name,
        student_email: user.email,
        mission: { id: 'grand', emoji: '👑', title: 'Empreendedora Renda Lucrativa',
          objective: 'Concluiu as 7 missões da Jornada Renda Lucrativa.' },
        issued_at: state.journey_completed_at || new Date().toISOString(),
        snapshot: state.dashboard,
      });
    }
    const missionId = parseInt(rawId, 10);
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return err(404, 'Mission not found');
    if (!mission.completed) return err(400, 'Mission not completed yet');
    return json({
      student_name: user.name,
      student_email: user.email,
      mission: {
        id: mission.id, emoji: mission.emoji,
        title: mission.title, objective: mission.objective,
        progress_label: mission.progress_label,
      },
      issued_at: state.missions_completed_at?.[String(mission.id)] || new Date().toISOString(),
      snapshot: state.dashboard,
    });
  }

  // Manually flag a journey step (for steps that can't be auto-detected, e.g. divulgação).
  if (method === 'POST' && p[0] === 'journey' && p[1] === 'mark') {
    const user = await getCurrentUser(request);
    if (!user) return err(401, 'Not authenticated');
    const body = await request.json();
    const key = String(body.key || '').trim();
    if (!key) return err(400, 'key required');
    const value = body.value === undefined ? true : !!body.value;
    await db.collection('pi_journey').updateOne(
      { user_id: user.user_id },
      { $set: { [`manual.${key}`]: value, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    return json({ ok: true, key, value });
  }

  return err(404, `Route not found: ${method} /${p.join('/')}`);
}

// --- Public: Drive image proxy (bypasses CORS for canvas cropping) ---
async function driveImageProxy(id, opts = {}) {
  if (!id) return new Response('missing id', { status: 400 });
  const candidates = [
    `https://drive.google.com/thumbnail?id=${id}&sz=w2048`,
    `https://lh3.googleusercontent.com/d/${id}=w2048`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.startsWith('image/')) {
        let buf = Buffer.from(await r.arrayBuffer());
        let outType = ct;
        // Apply optional server-side crop (percentages 0..100)
        const { cropTop, cropBottom, cropLeft, cropRight } = opts;
        const anyCrop = [cropTop, cropBottom, cropLeft, cropRight].some((v) => Number(v) > 0);
        if (anyCrop) {
          try {
            const { Jimp } = await import('jimp');
            const img = await Jimp.read(buf);
            const W = img.bitmap.width;
            const H = img.bitmap.height;
            const t = Math.floor(((Number(cropTop) || 0) / 100) * H);
            const b = Math.floor(((Number(cropBottom) || 0) / 100) * H);
            const l = Math.floor(((Number(cropLeft) || 0) / 100) * W);
            const r2 = Math.floor(((Number(cropRight) || 0) / 100) * W);
            const width = Math.max(1, W - l - r2);
            const height = Math.max(1, H - t - b);
            img.crop({ x: l, y: t, w: width, h: height });
            buf = await img.getBuffer('image/png');
            outType = 'image/png';
          } catch (e) {
            console.error('drive-image crop failed:', e && e.message);
          }
        }
        return new Response(buf, {
          status: 200,
          headers: {
            'content-type': outType,
            'cache-control': 'public, max-age=86400',
            'access-control-allow-origin': '*',
          },
        });
      }
    } catch { /* try next */ }
  }
  return new Response('image not found', { status: 404 });
}

export async function GET(request, context) {
  const params = await context.params;
  const path = params.path || [];
  if (path[0] === 'drive-image' && path[1]) {
    const u = new URL(request.url);
    return driveImageProxy(path[1], {
      cropTop: u.searchParams.get('cropTop'),
      cropBottom: u.searchParams.get('cropBottom'),
      cropLeft: u.searchParams.get('cropLeft'),
      cropRight: u.searchParams.get('cropRight'),
    });
  }
  return handle(request, 'GET', path);
}
export async function POST(request, context) {
  const params = await context.params;
  return handle(request, 'POST', params.path || []);
}
export async function PUT(request, context) {
  const params = await context.params;
  return handle(request, 'PUT', params.path || []);
}
export async function DELETE(request, context) {
  const params = await context.params;
  return handle(request, 'DELETE', params.path || []);
}
