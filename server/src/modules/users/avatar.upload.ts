import path from "node:path";
import fs from "node:fs";
import multer from "multer";

// Foto de perfil chega já cortada em quadrado pelo client (canvas, ver
// CropAvatarModal.tsx) — aqui só valida tipo/tamanho e salva no disco.
// Pasta cai em server/storage/uploads/** (já ignorada no git, ver .gitignore).
const PASTA_AVATARES = path.join(process.cwd(), "server", "storage", "uploads", "avatars");
fs.mkdirSync(PASTA_AVATARES, { recursive: true });

const TIPOS_ACEITOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: PASTA_AVATARES,
  filename: (req, file, cb) => {
    const usuario = (req as any).usuario;
    const ext = TIPOS_ACEITOS[file.mimetype] ?? ".jpg";
    cb(null, `${usuario.id}-${Date.now()}${ext}`);
  },
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_ACEITOS[file.mimetype]) return cb(new Error("formato inválido — use JPG, PNG ou WEBP"));
    cb(null, true);
  },
});

export function urlPublicaAvatar(nomeArquivo: string) {
  return `/uploads/avatars/${nomeArquivo}`;
}
