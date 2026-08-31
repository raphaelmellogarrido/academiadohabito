// progress{userId,habitId,sequencia,jornada} do desenho de dados (ver
// docs/HABIT_LOGIC.md) — aqui em memória (Map), mesmo formato lógico que uma
// tabela `progress` teria: 1 linha por (userId,habitId), sequência derivada
// do histórico de check-ins e jornada = aulas assistidas / total.
const FUSO_BRASIL = "America/Sao_Paulo";
export const TOTAL_AULAS = 48;
const LABEL_DIA_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

interface ProgressoHabito {
  historico: Set<string>; // datas ISO (YYYY-MM-DD, fuso BRT) em que houve check-in
  aulasAssistidas: number;
}

const PROGRESS = new Map<string, ProgressoHabito>();

function chave(userId: string, habitId: string) {
  return `${userId}:${habitId}`;
}

function getOrInit(userId: string, habitId: string): ProgressoHabito {
  const k = chave(userId, habitId);
  let p = PROGRESS.get(k);
  if (!p) {
    p = { historico: new Set(), aulasAssistidas: 0 };
    PROGRESS.set(k, p);
  }
  return p;
}

// "Hoje" travado em Brasília (não no fuso do servidor) — mesmo raciocínio do
// app antigo (renato_de_paula/useMeditacaoHoje.js): garante que a virada do
// dia bate sempre no mesmo instante pra todo mundo, servidor incluso.
export function hojeBrasilISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_BRASIL }).format(new Date());
}

function dataDeIso(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function calcularStreak(historico: Set<string>): number {
  const hoje = dataDeIso(hojeBrasilISO());
  const cursor = new Date(hoje);
  if (!historico.has(isoLocal(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (historico.has(isoLocal(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 7 bolinhas em janela ROLANTE dos últimos 7 dias (hoje e os 6 anteriores) —
// não fica presa à semana de calendário (Dom-Sáb), senão o streak "some" toda
// vez que vira domingo mesmo sem a pessoa ter faltado nenhum dia. Só apaga
// bolinha quando o streak realmente quebra (gap > 1 dia); preenchida por
// POSIÇÃO relativa a hoje dentro do streak atual, não por presença isolada
// no histórico (mesmo algoritmo do app antigo — ver useSequenciaMeditacao.js
// na raiz do repo irmão).
function calcularBolinhas(historico: Set<string>, streak: number) {
  const hoje = dataDeIso(hojeBrasilISO());
  const offsetAncora = historico.has(isoLocal(hoje)) ? 0 : 1;

  return Array.from({ length: 7 }, (_, i) => {
    const diasAtras = 6 - i;
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - diasAtras);
    const concluido = diasAtras >= offsetAncora && diasAtras < offsetAncora + streak;
    return { iso: isoLocal(data), label: LABEL_DIA_SEMANA[data.getDay()], concluido, hoje: diasAtras === 0 };
  });
}

export function getSequencia(userId: string, habitId: string) {
  const p = getOrInit(userId, habitId);
  const streak = calcularStreak(p.historico);
  return { streak, bolinhas: calcularBolinhas(p.historico, streak) };
}

export function getJornada(userId: string, habitId: string) {
  const p = getOrInit(userId, habitId);
  const totalAssistidos = Math.min(p.aulasAssistidas, TOTAL_AULAS);
  const percentual = Math.round((totalAssistidos / TOTAL_AULAS) * 100);
  const marcouHoje = p.historico.has(hojeBrasilISO());
  const jornadaCompleta = totalAssistidos >= TOTAL_AULAS;
  let mensagem: string;
  if (jornadaCompleta) mensagem = "Jornada completa! Continue mantendo a prática diária. ✨";
  else if (marcouHoje) mensagem = "Próxima aula libera à meia-noite ✨";
  else if (totalAssistidos === 0) mensagem = "🪷 Sua jornada começa agora";
  else mensagem = `🪷 Faltam ${TOTAL_AULAS - totalAssistidos} aulas pra sua transformação`;

  return { totalAssistidos, totalAulas: TOTAL_AULAS, percentual, jornadaCompleta, mensagem };
}

export function marcarMeditouHoje(userId: string, habitId: string) {
  const p = getOrInit(userId, habitId);
  const hoje = hojeBrasilISO();
  const jaMarcado = p.historico.has(hoje);
  if (!jaMarcado) {
    p.historico.add(hoje);
    p.aulasAssistidas = Math.min(p.aulasAssistidas + 1, TOTAL_AULAS);
  }
  return { jaMarcado, sequencia: getSequencia(userId, habitId), jornada: getJornada(userId, habitId) };
}

export function jaMarcouHoje(userId: string, habitId: string) {
  return getOrInit(userId, habitId).historico.has(hojeBrasilISO());
}

// "Meditando junto" — pulso agregado de TODOS os usuários (não por pessoa).
// hojeCheckins/partilhasHoje reiniciam sozinhos à meia-noite BRT (comparam
// contra hojeBrasilISO() a cada request, não guardam contador próprio);
// totalPresenca é soma de todo o histórico, de todos os tempos — nunca reseta.
export function getMeditandoJuntoPulso(habitId: string) {
  const hoje = hojeBrasilISO();
  let hojeCheckins = 0;
  let totalPresenca = 0;
  for (const [k, p] of PROGRESS) {
    if (!k.endsWith(`:${habitId}`)) continue;
    if (p.historico.has(hoje)) hojeCheckins += 1;
    totalPresenca += p.historico.size;
  }
  return { hojeCheckins, totalPresenca };
}
