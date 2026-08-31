import { useEffect, useState } from "react";
import { meditacaoApi, type DiaAulas } from "../api/meditacaoApi";

// Cache leve (stale-while-revalidate) do catálogo de dias/vídeos — não é
// por-usuário (o catálogo é o mesmo pra todo mundo, vem do filesystem via
// aulas.catalogo.ts, não muda com frequência). Evita a tela "Carregando..."
// numa navegação repetida: pinta o catálogo da visita anterior (<2min) na
// hora, atualiza em background. Porta o padrão de
// renato_de_paula/src/pages/comunidade/AulasMeditacaoRaiz.jsx
// (lerCatalogoCache/salvarCatalogoCache).
const CHAVE_CACHE_CATALOGO = "cm_catalogo_aulas";
const TTL_CACHE_CATALOGO_MS = 2 * 60 * 1000;

function lerCatalogoCache(): DiaAulas[] | null {
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE_CATALOGO);
    if (!bruto) return null;
    const { dias, quando } = JSON.parse(bruto);
    if (!Array.isArray(dias) || typeof quando !== "number") return null;
    if (Date.now() - quando > TTL_CACHE_CATALOGO_MS) return null;
    return dias;
  } catch {
    return null;
  }
}

function salvarCatalogoCache(dias: DiaAulas[]) {
  try {
    localStorage.setItem(CHAVE_CACHE_CATALOGO, JSON.stringify({ dias, quando: Date.now() }));
  } catch {
    // localStorage indisponível — sem cache, sem drama, o fetch normal segue.
  }
}

export function useAulasCatalogo() {
  const [dias, setDias] = useState<DiaAulas[]>(() => lerCatalogoCache() || []);
  const [carregando, setCarregando] = useState(() => lerCatalogoCache() === null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const tinhaCache = lerCatalogoCache() !== null;
    meditacaoApi
      .aulasCatalogo()
      .then((r) => {
        setDias(r.dias);
        salvarCatalogoCache(r.dias);
        setErro(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar catálogo de aulas:", err);
        if (!tinhaCache) setErro(true);
      })
      .finally(() => setCarregando(false));
  }, []);

  return { dias, carregando, erro };
}
