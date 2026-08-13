// Google Drive scraper — port of drive_scraper.py.
// Fetches PUBLIC drive folder HTML via embeddedfolderview and parses entries.

const VIDEO_EXTS = [".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".wmv", ".flv"];
const PDF_EXTS = [".pdf"];
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const DOC_EXTS = [".doc", ".docx"];
const SHEET_EXTS = [".xls", ".xlsx", ".csv"];
const ALL_EXTS = [...VIDEO_EXTS, ...PDF_EXTS, ...IMAGE_EXTS, ...DOC_EXTS, ...SHEET_EXTS, ".json", ".txt"];

function classify(name) {
  const n = (name || "").toLowerCase();
  if (VIDEO_EXTS.some(e => n.endsWith(e))) return "video";
  if (PDF_EXTS.some(e => n.endsWith(e))) return "pdf";
  if (IMAGE_EXTS.some(e => n.endsWith(e))) return "image";
  if (DOC_EXTS.some(e => n.endsWith(e))) return "doc";
  if (SHEET_EXTS.some(e => n.endsWith(e))) return "sheet";
  return "file";
}

const PT_LOWER = new Set(["a","à","e","o","os","as","de","da","do","das","dos","em","no","na","nos","nas","por","para","com","sem","sob","ou","u","que","se"]);
const PRESERVE = new Set(["PDF","VSL","MP4","PNG","JPG","PDFs","VSLs"]);

function stripExt(name) {
  const low = name.toLowerCase();
  for (const ext of ALL_EXTS) if (low.endsWith(ext)) return name.slice(0, -ext.length);
  return name;
}

const SUBS = [
  [/\bMODULO\b/gi, "Módulo"], [/\bMÓDULO\b/gi, "Módulo"],
  [/\bAULAS\b/gi, "Aulas"], [/\bAULA\b/gi, "Aula"],
  [/\bPAGINAS\b/gi, "Páginas"], [/\bPÁGINAS\b/gi, "Páginas"],
  [/\bPAGINA\b/gi, "Página"], [/\bPÁGINA\b/gi, "Página"],
  [/\bVENDAS\b/gi, "Vendas"], [/\bVENDA\b/gi, "Venda"],
  [/\bVIDEO\b/gi, "Vídeo"], [/\bVIDEOS\b/gi, "Vídeos"],
  [/\bMATERIAL\b/gi, "Material"], [/\bMATERIAIS\b/gi, "Materiais"],
  [/\bBONUS\b/gi, "Bônus"], [/\bBÔNUS\b/gi, "Bônus"],
  [/\bAPOIO\b/gi, "Apoio"],
  [/\bCRIATIVOS\b/gi, "Criativos"], [/\bCRIATIVO\b/gi, "Criativo"],
  [/\bPUBLICO\b/gi, "Público"], [/\bPUBLICOS\b/gi, "Públicos"], [/\bPÚBLICOS\b/gi, "Públicos"],
  [/\bLISTA\b/gi, "Lista"],
  [/\bATUALIZACAO\b/gi, "Atualização"], [/\bATUALIZAÇÃO\b/gi, "Atualização"],
  [/\bVENCEDORES\b/gi, "Vencedores"],
  [/\bCASEIROS\b/gi, "Caseiros"], [/\bBOLOS\b/gi, "Bolos"],
  [/\bHAMBURGAO\b/gi, "Hamburgão"], [/\bHAMBÚRGUER\b/gi, "Hambúrguer"],
  [/\bROCAMBOLE\b/gi, "Rocambole"],
  [/\bGELADINHO\b/gi, "Geladinho"], [/\bGELADINHOS\b/gi, "Geladinhos"],
  [/\bGOURMET\b/gi, "Gourmet"],
  [/\bPASCOA\b/gi, "Páscoa"], [/\bPÁSCOA\b/gi, "Páscoa"],
  [/\bRECEITAS\b/gi, "Receitas"],
  [/\bCOMPRADORES\b/gi, "Compradores"], [/\bINTERESSES\b/gi, "Interesses"],
  [/\bSTORYS\b/gi, "Stories"], [/\bSTORY\b/gi, "Story"], [/\bFEED\b/gi, "Feed"],
];

const UPPER_RUN = /[A-ZÁÉÍÓÚÀÂÊÎÔÛÃÕÇÑÜ][A-ZÁÉÍÓÚÀÂÊÎÔÛÃÕÇÑÜ]+/g;

function titleizeUpperRuns(s) {
  return s.replace(UPPER_RUN, (w) => {
    if (PRESERVE.has(w)) return w;
    const low = w.toLowerCase();
    if (PT_LOWER.has(low)) return low;
    return low.charAt(0).toUpperCase() + low.slice(1);
  });
}

export function optimizeModuleTitle(raw) {
  if (!raw) return raw;
  let s = raw.trim();
  for (const [pattern, repl] of SUBS) s = s.replace(pattern, repl);
  s = s.replace(/\b(Módulo|Aula)\s+0*(\d)\b(?!\d)/gi, (m, w, n) => `${w} 0${n}`);
  s = titleizeUpperRuns(s);
  return s.replace(/\s+/g, " ").trim();
}

export function optimizeLessonTitle(raw) {
  if (!raw) return raw;
  let s = stripExt(raw).trim();
  s = s.replace(/[\s\._-]+$/, "");
  s = s.replace(/_/g, " ");
  for (const [pattern, repl] of SUBS) s = s.replace(pattern, repl);
  s = s.replace(/\s*-\s*-+\s*/g, " \u2014 ");
  s = s.replace(/\b(Aula)\s+(\d{1,2})\b/gi, (m, w, n) => `${w} ${String(n).padStart(2, "0")}`);
  s = s.replace(/(Aula\s+\d{2})\s*-\s*/gi, "$1 \u2014 ");
  s = s.replace(/(?<=\S)\s-\s(?=\S)/g, " \u2014 ");
  s = titleizeUpperRuns(s);
  return s.replace(/\s+/g, " ").trim();
}

function htmlUnescape(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

function parseEmbedHtml(text) {
  const results = [];
  const chunks = text.split(/(?=id="entry-)/);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const mId = chunk.match(/^id="entry-([a-zA-Z0-9_-]+)"/);
    if (!mId) continue;
    const entryId = mId[1];
    const mName = chunk.match(/class="flip-entry-title"[^>]*>([^<]+)<\/div>/);
    const mHref = chunk.match(/<a\s+href="(https:\/\/drive\.google\.com\/[^"]+)"/);
    if (!mName || !mHref) continue;
    const rawName = htmlUnescape(mName[1]).trim();
    const href = mHref[1];
    if (href.includes("/drive/folders/")) {
      results.push({ kind: "folder", id: entryId, title: optimizeModuleTitle(rawName), raw_title: rawName });
    } else if (href.includes("/file/d/")) {
      results.push({ kind: "file", id: entryId, title: optimizeLessonTitle(rawName), raw_title: rawName, type: classify(rawName) });
    }
  }
  return results;
}

async function fetchFolderEntries(folderId) {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return [];
    const text = await r.text();
    return parseEmbedHtml(text);
  } catch (e) {
    console.warn(`Drive fetch error for ${folderId}:`, e.message);
    return [];
  }
}

export async function scrapeCourseStructure(rootFolderId, maxDepth = 5) {
  // Recursive walk: any folder that contains files becomes a "module".
  // Empty container folders (no direct files) are transparently unwrapped
  // by simply recursing into their subfolders. Handles courses whose
  // videos are 3-5 levels deep (e.g. ROOT/MÓDULOS/AULAS MP4/M1/*.mp4).
  const rootEntries = await fetchFolderEntries(rootFolderId);
  const rootFiles = rootEntries.filter((e) => e.kind === "file");
  const modules = [];

  async function walk(folderId, folderTitle, depth) {
    if (depth > maxDepth) return;
    const entries = await fetchFolderEntries(folderId);
    const files = entries.filter((e) => e.kind === "file");
    const subs = entries.filter((e) => e.kind === "folder");
    if (files.length > 0) {
      modules.push({
        id: folderId,
        title: folderTitle,
        description: "",
        lessons: files.map((e) => ({ id: e.id, title: e.title, type: e.type || "file" })),
      });
    }
    // Recurse into all subfolders — they may contain more modules deeper.
    // Fan-out in parallel for speed.
    await Promise.all(subs.map((s) => walk(s.id, s.title, depth + 1)));
  }

  const rootFolders = rootEntries.filter((e) => e.kind === "folder");
  await Promise.all(rootFolders.map((f) => walk(f.id, f.title, 1)));

  return {
    modules,
    root_files: rootFiles.map((e) => ({ id: e.id, title: e.title, type: e.type || "file" })),
  };
}

// Scrape one folder recursively and return ALL files flattened (no module nesting).
// Used for courses that pull auxiliary content from separate Drive folders
// (welcome video, bonus images, apostilas etc.) that should be projected onto
// a single named module.
export async function scrapeFolderFlat(folderId, maxDepth = 3) {
  const files = [];
  async function walk(fid, depth) {
    if (depth > maxDepth) return;
    const entries = await fetchFolderEntries(fid);
    for (const e of entries) {
      if (e.kind === "file") {
        files.push({ id: e.id, title: e.title, type: e.type || "file" });
      } else if (e.kind === "folder") {
        await walk(e.id, depth + 1);
      }
    }
  }
  await walk(folderId, 0);
  return files;
}
