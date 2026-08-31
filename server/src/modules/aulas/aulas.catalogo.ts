import fs from "node:fs";
import path from "node:path";

// Mapeamento fixo arquivo -> título, portado 1:1 de
// renato_de_paula/src/lib/titulosAulasRaiz.js (mesmo curso, mesmos vídeos).
// Dia 0 é o módulo de boas-vindas; dias 1..15 são a trilha principal.
export const TITULOS_AULAS_RAIZ: Record<string, string> = {
  "dia0.1.mp4": "Boas Vindas",
  "dia0.2.mp4": "Estrutura do Curso + Motivacional",
  "dia0.3.mp4": "Introdução (não pule!)",

  "dia1.1.mp4": "1a Meditação do dia",
  "dia1.2.mp4": "1o Mito: Meditação é pra relaxar?",
  "dia1.4.mp4": "2a Meditação do dia",

  "dia2.1.mp4": "1a Meditação (5 min)",
  "dia2.2.mp4": "2o Mito: É necessário parar de pensar?",
  "dia2.3.mp4": "2a Meditação (5 min)",

  "dia3.1.mp4": "1a Meditação do dia",
  "dia3.2.mp4": "3o Mito: O que é o ambiente perfeito para meditar?",
  "dia3.3.mp4": "2a Meditação (5 min)",

  "dia4.1.mp4": "1a Meditação (10 min)",
  "dia4.2.mp4": "4o Mito: É preciso me MANTER concentrado?",
  "dia4.3.mp4": "2a Meditação (10 min)",

  "dia5.1.mp4": "1a Meditação (10 min)",
  "dia5.2.mp4": "5o Mito: Tudo que me faz concentrar é meditação?",
  "dia5.3.mp4": "2a Meditação (10 min)",

  "dia6.1.mp4": "1a Meditação (10 min)",
  "dia6.2.mp4": "O exercício fundamental da meditação",
  "dia6.3.mp4": "2a Meditação (10 min)",

  "dia7.1.mp4": "1a Meditação (15 min)",
  "dia7.2.mp4": "Como lidar com o pensamento 'reentrante'(ruminativo)",
  "dia7.3.mp4": "2a Meditação (15 min)",

  "dia8.1.mp4": "1a Meditação (15 min)",
  "dia8.2.mp4": "Segredos do AMBIENTE meditativo",
  "dia8.3.mp4": "2a Meditação (15 min)",

  "dia9.1.mp4": "1a Meditação (15 min)",
  "dia9.2.mp4": "O que é a concentração verdadeira?",
  "dia9.3.mp4": "2a Meditação (15 min)",

  "dia10.1.mp4": "1a Meditação (20 min)",
  "dia10.2.mp4": "O poder do estímulo de baixa intensidade",
  "dia10.3.mp4": "2a Meditação (20 min)",

  "dia11.1.mp4": "1a Meditação (20 min)",
  "dia11.2.mp4": "Refinando a técnica",
  "dia11.3.mp4": "2a Meditação (20 min)",

  "dia12.1.mp4": "1a Meditação (20 min)",
  "dia12.2.mp4": "O tempo em meditação",
  "dia12.3.mp4": "2a Meditação (20 min)",

  "dia13.1.mp4": "1a Meditação (25 min)",
  "dia13.2.mp4": "Postura e posição",
  "dia13.3.mp4": "2a Meditação (25 min)",

  "dia14.1.mp4": "1a Meditação (25 min)",
  "dia14.2.mp4": "Onde meditar/onde não meditar",
  "dia14.3.mp4": "2a Meditação (25min)",

  "dia15.1.mp4": "1a Meditação (25 min)",
  "dia15.2.mp4": "Ciclos da mente + dias insuportáveis",
  "dia15.3.mp4": "2a Meditação (25 min)",
};

// Arquivos que somem do catálogo mesmo que o .mp4 continue no disco — mesma
// lista de renato_de_paula/src/lib/titulosAulasRaiz.js (dia1.3 virou dia1.4).
export const ARQUIVOS_OCULTOS_AULAS_RAIZ = new Set<string>(["dia1.3.mp4"]);

const NOME_ARQUIVO_RE = /^dia(\d+)\.(\d+)\.mp4$/i;

export interface VideoAula {
  arquivo: string;
  titulo: string;
  url: string;
}

export interface DiaAulas {
  dia: number;
  titulo: string;
  videos: VideoAula[];
}

// Pasta com os .mp4 reais — mesma variável de ambiente do projeto irmão
// (CURSO_RAIZ_DIR lá, aqui CURSO_MEDITACAO_DIR), fica na raiz do site na
// Hostinger (mesma altura de public_html), fora do repo (sobe por FTP).
// Fallback de dev aponta pra uma pasta local `curso-meditacao-raiz` na raiz
// do projeto — não precisa existir pra UI funcionar (ver montarCatalogo).
export function pastaCursoMeditacao(): string {
  return process.env.CURSO_MEDITACAO_DIR || path.join(process.cwd(), "curso-meditacao-raiz");
}

// Monta { dias: [{ dia, titulo, videos: [{arquivo,titulo,url}] }] } a partir
// do filesystem (mesmo padrão do server/index.js do projeto irmão via
// fs.readdirSync). Se a pasta ainda não existir neste ambiente (dev sem os
// vídeos reais), cai pro catálogo "virtual": todos os arquivos do mapa de
// títulos acima, como se estivessem no disco — dá pra testar dia/dropdown/
// cadeados sem precisar dos .mp4 de verdade; a URL só vai 404 até os
// arquivos reais serem enviados por FTP.
export function montarCatalogo(): DiaAulas[] {
  const pasta = pastaCursoMeditacao();
  let candidatos: string[];
  try {
    candidatos = fs.readdirSync(pasta).filter((f) => f.toLowerCase().endsWith(".mp4"));
  } catch {
    candidatos = Object.keys(TITULOS_AULAS_RAIZ);
  }

  const porDia = new Map<number, { arquivo: string; titulo: string; url: string; posicao: number }[]>();

  for (const arquivo of candidatos) {
    if (ARQUIVOS_OCULTOS_AULAS_RAIZ.has(arquivo)) continue;
    const titulo = TITULOS_AULAS_RAIZ[arquivo];
    if (!titulo) continue; // arquivo sem título fixo conhecido — ignora
    const m = NOME_ARQUIVO_RE.exec(arquivo);
    if (!m) continue;
    const dia = Number(m[1]);
    const posicao = Number(m[2]);
    const lista = porDia.get(dia) ?? [];
    lista.push({ arquivo, titulo, url: `/curso-meditacao-raiz/${arquivo}`, posicao });
    porDia.set(dia, lista);
  }

  return [...porDia.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dia, videos]) => {
      const ordenados = videos
        .sort((a, b) => a.posicao - b.posicao)
        .map(({ arquivo, titulo, url }) => ({ arquivo, titulo, url }));
      // Título do dia = título do 1º vídeo do dia (mesmo padrão do projeto irmão).
      return { dia, titulo: ordenados[0]?.titulo ?? `Dia ${dia}`, videos: ordenados };
    });
}
