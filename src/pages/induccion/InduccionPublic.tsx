import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Lock,
  PlayCircle,
  Printer,
  ScrollText,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import {
  evaluateModule,
  fetchParticipantProgress,
  fetchProgram,
  fetchPublicInductionFileUrl,
  registerParticipant,
  type EvaluationResult,
  type InductionItem,
  type InductionParticipant,
  type ProgramModule,
} from '../../api/induction';
import useThemeStore from '../../hooks/useThemeStore';
import logoLight from '../../assets/logo-cosortium.png';
import logoDark from '../../assets/logo-dark.png';

/**
 * Convierte una URL de YouTube/Vimeo a su formato incrustable.
 * Acepta las variantes que la gente pega normalmente (watch?v=, youtu.be,
 * /shorts/, /embed/). Si no reconoce el proveedor devuelve la URL tal cual,
 * que igual funciona si ya es un enlace de incrustación.
 */
const toEmbedUrl = (raw: string): string => {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (host.endsWith('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    if (host.endsWith('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    return raw;
  } catch {
    return raw;
  }
};

/* ── Identidad del participante ────────────────────────────────────────────
   El avance vive en el SERVIDOR: la persona se registra con nombre y correo,
   RRHH ve quién completó qué, y aquí solo quedan sus credenciales (id +
   token) para retomar. Registrarse de nuevo con el mismo correo recupera el
   avance desde cualquier equipo. */

const STORAGE_KEY = 'induccion-participante-v1';

interface Credenciales {
  id: number;
  token: string;
}

const leerCredenciales = (): Credenciales | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p.id === 'number' && typeof p.token === 'string'
      ? { id: p.id, token: p.token }
      : null;
  } catch {
    return null;
  }
};

const guardarCredenciales = (c: Credenciales | null) => {
  try {
    if (c) localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* modo privado: el avance igual queda en el servidor */
  }
};

/** El backend responde el mensaje de validación como string o arreglo. */
const mensajeDe = (error: unknown, porDefecto: string): string => {
  const m = (error as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  if (Array.isArray(m)) return m[0] ?? porDefecto;
  return m || porDefecto;
};

/** Recorre el árbol y devuelve las unidades evaluables en orden. */
const unidadesDe = (modulos: ProgramModule[]): ProgramModule[] =>
  modulos.flatMap((m) => (m.children.length ? unidadesDe(m.children) : [m]));

const iconoDeItem = (t: InductionItem['item_type']) => {
  if (t === 'document') return <FileText className="size-4" aria-hidden />;
  if (t === 'text') return <ScrollText className="size-4" aria-hidden />;
  return <PlayCircle className="size-4" aria-hidden />;
};

const desplazarArriba = () => {
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
};

/**
 * Página PÚBLICA del programa de inducción (administrativogt.com/induccion).
 *
 * Los módulos se cursan EN ORDEN: cada uno se abre al aprobar el anterior.
 * Al completar el programa se emite el diploma y todo el material queda
 * liberado para consulta.
 *
 * UI: shadcn/ui + Tailwind (scoped a esta superficie); el ERP sigue en AntD.
 */
function InduccionPublic() {
  const isDark = useThemeStore((s) => s.mode) === 'dark';
  const [programa, setPrograma] = useState<ProgramModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [participante, setParticipante] = useState<InductionParticipant | null>(null);
  const [aprobados, setAprobados] = useState<number[]>([]);
  const [vista, setVista] = useState<number | 'diploma' | null>(null);
  const [descargando, setDescargando] = useState<number | null>(null);

  /* Evaluación en curso */
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<EvaluationResult | null>(null);
  const [calificando, setCalificando] = useState(false);

  /* Los portales (toasts, diálogos) viven fuera del wrapper: la clase `dark`
     va en <html> mientras esta página esté montada para que hereden el tema.
     El ERP no consume estos tokens, así que no le afecta. */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    return () => document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    const cred = leerCredenciales();
    Promise.all([
      fetchProgram(),
      /* Si el avance no responde (token viejo, participante borrado), la
         persona simplemente vuelve a registrarse; no es un error de página. */
      cred
        ? fetchParticipantProgress(cred.id, cred.token).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([data, progreso]) => {
        setPrograma(data);
        if (progreso) {
          setParticipante(progreso);
          setAprobados(progreso.approved_module_ids);
        } else if (cred) {
          guardarCredenciales(null);
        }
        const unidades = unidadesDe(data);
        if (unidades.length) {
          const previo = progreso?.approved_module_ids ?? [];
          const pendiente = unidades.find((u) => !previo.includes(u.id));
          setVista((pendiente ?? unidades[0]).id);
        }
      })
      .catch(() => toast.error('No se pudo cargar el programa de inducción'))
      .finally(() => setLoading(false));
  }, []);

  const unidades = useMemo(() => unidadesDe(programa), [programa]);
  const completo = unidades.length > 0 && unidades.every((u) => aprobados.includes(u.id));

  /** Emitido el diploma, todo el material queda liberado para consulta. */
  const desbloqueada = useCallback(
    (id: number): boolean => {
      if (completo) return true;
      const i = unidades.findIndex((u) => u.id === id);
      if (i <= 0) return i === 0;
      return unidades.slice(0, i).every((u) => aprobados.includes(u.id));
    },
    [unidades, aprobados, completo],
  );

  /** Un módulo contenedor se abre cuando se abre su primer submódulo. */
  const contenedorAbierto = (m: ProgramModule) =>
    m.children.length ? desbloqueada(m.children[0].id) : desbloqueada(m.id);

  const unidadActual = unidades.find((u) => !aprobados.includes(u.id)) ?? null;
  const requisitoDe = (id: number) => {
    const i = unidades.findIndex((u) => u.id === id);
    return unidades.slice(0, Math.max(i, 0)).find((u) => !aprobados.includes(u.id)) ?? null;
  };

  const abrir = (id: number | 'diploma') => {
    setVista(id);
    setRespuestas({});
    setResultado(null);
    desplazarArriba();
  };

  const registrar = async (nombre: string, correo: string) => {
    const p = await registerParticipant(nombre, correo);
    guardarCredenciales({ id: p.id, token: p.token });
    setParticipante(p);
    setAprobados(p.approved_module_ids);
    const pendiente = unidades.find((u) => !p.approved_module_ids.includes(u.id));
    if (unidades.length) setVista((pendiente ?? unidades[0]).id);
    if (p.approved_module_ids.length > 0) {
      toast.success(`Bienvenido de nuevo, ${p.full_name.split(' ')[0]}`, {
        description: 'Retomamos su avance donde lo dejó.',
      });
    }
  };

  const descargar = async (item: InductionItem) => {
    setDescargando(item.id);
    try {
      const url = await fetchPublicInductionFileUrl(item.id);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('No se pudo abrir el documento');
    } finally {
      setDescargando(null);
    }
  };

  const enviarEvaluacion = async (m: ProgramModule) => {
    setCalificando(true);
    try {
      const answers = m.questions.map((q) => respuestas[q.id]);
      const res = await evaluateModule(
        m.id,
        answers,
        participante ? { id: participante.id, token: participante.token } : undefined,
      );
      setResultado(res);
      if (res.passed) {
        let aprobadosAhora = aprobados.includes(m.id) ? aprobados : [...aprobados, m.id];
        if (res.participant) {
          /* El servidor es la fuente de verdad del avance y la completación. */
          aprobadosAhora = res.participant.approved_module_ids;
          setParticipante((prev) =>
            prev
              ? {
                  ...prev,
                  approved_module_ids: res.participant!.approved_module_ids,
                  completed_at: res.participant!.completed_at,
                }
              : prev,
          );
        } else if (participante) {
          toast.warning('Aprobó, pero el avance no quedó registrado', {
            description: 'Vuelva a ingresar con su correo para que no se pierda.',
          });
        }
        setAprobados(aprobadosAhora);

        const todoListo = unidades.every((u) => aprobadosAhora.includes(u.id));
        const siguiente = unidades.find((u) => !aprobadosAhora.includes(u.id)) ?? null;
        if (todoListo) {
          toast.success('¡Programa completo!', {
            description: 'Su diploma quedó emitido.',
            action: { label: 'Ver diploma', onClick: () => abrir('diploma') },
            duration: 8000,
          });
        } else if (siguiente) {
          toast.success(`Módulo ${m.code} aprobado`, {
            description: `${res.correct} de ${res.total} correctas.`,
            action: { label: `Siguiente: ${siguiente.code}`, onClick: () => abrir(siguiente.id) },
            duration: 6000,
          });
        }
      } else {
        toast.error('Aún no aprueba este módulo', {
          description: `${res.correct} de ${res.total} correctas; necesita ${res.required}. Revise el material y vuelva a intentar.`,
        });
      }
    } catch {
      toast.error('No se pudo calificar la evaluación');
    } finally {
      setCalificando(false);
    }
  };

  /** Equipo compartido: suelta las credenciales locales; el avance queda en el servidor. */
  const cambiarPersona = () => {
    guardarCredenciales(null);
    setParticipante(null);
    setAprobados([]);
    setRespuestas({});
    setResultado(null);
  };

  const hechos = aprobados.filter((id) => unidades.some((u) => u.id === id)).length;
  const pct = unidades.length ? Math.round((hechos / unidades.length) * 100) : 0;

  return (
    <div className={cn('induccion-ui min-h-screen font-sans', isDark && 'dark')}>
      <Toaster theme={isDark ? 'dark' : 'light'} position="bottom-right" />

      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="mb-6 flex flex-wrap items-center gap-4 print:hidden">
          <img
            src={isDark ? logoDark : logoLight}
            alt="Consortium Legal"
            className="block h-10 w-auto"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Programa de Inducción</h1>
            <p className="text-sm text-muted-foreground">Consortium Legal · Guatemala</p>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-72 rounded-lg" />
            </div>
            <Skeleton className="h-96 rounded-lg" />
          </div>
        ) : !programa.length ? (
          <Card className="mx-auto max-w-md text-center">
            <CardContent className="space-y-2 p-10">
              <ScrollText className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="font-medium">Aún no hay módulos publicados</p>
              <p className="text-sm text-muted-foreground">
                El programa de inducción está en preparación; vuelva pronto.
              </p>
            </CardContent>
          </Card>
        ) : !participante ? (
          <Registro totalUnidades={unidades.length} onRegistrar={registrar} />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* ── Riel del programa ── */}
            <div className="flex flex-col gap-4 print:hidden">
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <Anillo pct={pct} completo={completo} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{participante.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {hechos} de {unidades.length} módulos
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {completo
                        ? 'Programa completo — material liberado'
                        : unidadActual
                          ? `Le toca: ${unidadActual.title}`
                          : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Contenido del programa</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  {programa.map((m) => (
                    <div key={m.id}>
                      <Fila
                        titulo={`${m.code}  ${m.title}`}
                        activo={vista === m.id}
                        abierto={contenedorAbierto(m)}
                        aprobado={
                          m.children.length
                            ? m.children.every((h) => aprobados.includes(h.id))
                            : aprobados.includes(m.id)
                        }
                        onClick={() => abrir(m.id)}
                      />
                      {m.children.map((h) => (
                        <Fila
                          key={h.id}
                          titulo={`${h.code}  ${h.title}`}
                          hijo
                          activo={vista === h.id}
                          abierto={desbloqueada(h.id)}
                          aprobado={aprobados.includes(h.id)}
                          onClick={() => abrir(h.id)}
                        />
                      ))}
                    </div>
                  ))}
                  <Fila
                    titulo="Diploma"
                    icono={<Award className="size-4 shrink-0" aria-hidden />}
                    activo={vista === 'diploma'}
                    abierto={completo}
                    aprobado={completo}
                    onClick={() => abrir('diploma')}
                  />
                </CardContent>
              </Card>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <UserRound aria-hidden />
                    No soy {participante.full_name.split(' ')[0]} — cambiar de persona
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cambiar de persona?</AlertDialogTitle>
                    <AlertDialogDescription>
                      El avance de {participante.full_name} queda guardado; se retoma
                      ingresando con su correo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={cambiarPersona}>Cambiar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* ── Contenido ── */}
            <div>
              {vista === 'diploma' ? (
                <Diploma
                  completo={completo}
                  isDark={isDark}
                  unidades={unidades}
                  nombre={participante.full_name}
                  completadoEl={participante.completed_at}
                  faltan={unidades.length - hechos}
                />
              ) : (
                (() => {
                  const m = unidades.find((u) => u.id === vista)
                    ?? programa.find((p) => p.id === vista)
                    ?? programa.flatMap((p) => p.children).find((h) => h.id === vista);
                  if (!m) return null;

                  const abierto = m.children.length ? contenedorAbierto(m) : desbloqueada(m.id);
                  if (!abierto) {
                    return (
                      <Bloqueado
                        m={m}
                        requisito={requisitoDe(m.children[0]?.id ?? m.id)}
                        onIr={abrir}
                      />
                    );
                  }
                  if (m.children.length) {
                    return (
                      <Contenedor
                        m={m}
                        aprobados={aprobados}
                        desbloqueada={desbloqueada}
                        onAbrir={abrir}
                      />
                    );
                  }
                  return (
                    <Unidad
                      m={m}
                      completo={completo}
                      aprobado={aprobados.includes(m.id)}
                      respuestas={respuestas}
                      setRespuestas={setRespuestas}
                      resultado={resultado}
                      calificando={calificando}
                      onEnviar={() => enviarEvaluacion(m)}
                      onReintentar={() => {
                        setRespuestas({});
                        setResultado(null);
                      }}
                      descargando={descargando}
                      onDescargar={descargar}
                    />
                  );
                })()
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Anillo de avance ─────────────────────────────────────────────────────── */

function Anillo({ pct, completo }: { pct: number; completo: boolean }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <svg
      width={64}
      height={64}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`Avance ${pct}%`}
      className="shrink-0"
    >
      <circle cx={32} cy={32} r={R} fill="none" strokeWidth={6} className="stroke-secondary" />
      <circle
        cx={32}
        cy={32}
        r={R}
        fill="none"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - pct / 100)}
        className={cn(
          'motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500',
          completo ? 'stroke-gold' : 'stroke-primary',
        )}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text
        x={32}
        y={37}
        textAnchor="middle"
        className="fill-foreground text-sm font-bold"
      >
        {pct}%
      </text>
    </svg>
  );
}

/* ── Riel ─────────────────────────────────────────────────────────────────── */

function Fila(props: {
  titulo: string;
  icono?: React.ReactNode;
  hijo?: boolean;
  activo: boolean;
  abierto: boolean;
  aprobado: boolean;
  onClick: () => void;
}) {
  const { titulo, icono, hijo, activo, abierto, aprobado, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? 'true' : undefined}
      className={cn(
        'flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        hijo ? 'pl-7 text-[13px]' : 'text-[13.5px] font-semibold',
        activo
          ? 'bg-accent text-accent-foreground'
          : abierto
            ? 'text-foreground hover:bg-secondary'
            : 'text-muted-foreground hover:bg-secondary',
      )}
    >
      {icono}
      <span className="min-w-0 flex-1 truncate">{titulo}</span>
      {aprobado ? (
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
      ) : !abierto ? (
        <Lock className="size-3.5 shrink-0 opacity-60" aria-label="Bloqueado" />
      ) : null}
    </button>
  );
}

/* ── Módulo bloqueado ─────────────────────────────────────────────────────── */

function Bloqueado(props: {
  m: ProgramModule;
  requisito: ProgramModule | null;
  onIr: (id: number) => void;
}) {
  const { m, requisito, onIr } = props;
  return (
    <Card className="motion-safe:animate-fade-up">
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <Lock className="size-7 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold">
          {m.code} · {m.title}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Todavía no está disponible. El programa se cursa en orden: cada módulo se abre
          cuando aprueba el anterior.
        </p>
        {requisito && (
          <div className="mt-2 flex flex-col items-center gap-3">
            <Badge variant="outline">
              Se abre al aprobar {requisito.code} · {requisito.title}
            </Badge>
            <Button onClick={() => onIr(requisito.id)}>
              Ir a {requisito.title}
              <ChevronRight aria-hidden />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Módulo contenedor (Inducciones específicas) ──────────────────────────── */

function Contenedor(props: {
  m: ProgramModule;
  aprobados: number[];
  desbloqueada: (id: number) => boolean;
  onAbrir: (id: number) => void;
}) {
  const { m, aprobados, desbloqueada, onAbrir } = props;
  const hechos = m.children.filter((h) => aprobados.includes(h.id)).length;

  return (
    <Card className="motion-safe:animate-fade-up">
      <CardHeader>
        <CardDescription>Módulo {m.code}</CardDescription>
        <CardTitle className="text-lg">{m.title}</CardTitle>
        {m.summary && <CardDescription>{m.summary}</CardDescription>}
        <CardDescription className="text-xs">
          {hechos} de {m.children.length} aprobadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {m.children.map((h) => {
            const aprobado = aprobados.includes(h.id);
            const abierto = desbloqueada(h.id);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => onAbrir(h.id)}
                className={cn(
                  'rounded-lg border bg-card p-3.5 text-left transition-colors hover:border-primary',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !abierto && 'opacity-60',
                )}
              >
                <p className="text-xs text-muted-foreground">{h.code}</p>
                <p className="my-1 font-semibold">{h.title}</p>
                {h.summary && (
                  <p className="mb-2 line-clamp-3 text-xs text-muted-foreground">{h.summary}</p>
                )}
                {aprobado ? (
                  <Badge variant="success">
                    <CheckCircle2 className="size-3" aria-hidden /> Aprobada
                  </Badge>
                ) : abierto ? (
                  <Badge variant="secondary">Pendiente</Badge>
                ) : (
                  <Badge variant="outline">
                    <Lock className="size-3" aria-hidden /> Bloqueada
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Unidad evaluable ─────────────────────────────────────────────────────── */

function Unidad(props: {
  m: ProgramModule;
  completo: boolean;
  aprobado: boolean;
  respuestas: Record<number, number>;
  setRespuestas: (r: Record<number, number>) => void;
  resultado: EvaluationResult | null;
  calificando: boolean;
  onEnviar: () => void;
  onReintentar: () => void;
  descargando: number | null;
  onDescargar: (i: InductionItem) => void;
}) {
  const {
    m, completo, aprobado, respuestas, setRespuestas, resultado, calificando,
    onEnviar, onReintentar, descargando, onDescargar,
  } = props;

  const videos = m.items.filter((i) => i.item_type === 'video' || i.item_type === 'video_url');
  const docs = m.items.filter((i) => i.item_type === 'document');
  const textos = m.items.filter((i) => i.item_type === 'text');
  const faltan = m.questions.filter((q) => respuestas[q.id] === undefined).length;
  const minimo = Math.ceil((m.questions.length * m.passing_percentage) / 100);

  return (
    <div className="flex flex-col gap-4 motion-safe:animate-fade-up">
      <Card>
        <CardHeader>
          {completo && (
            <div className="mb-2 flex items-start gap-3 rounded-md border border-success/30 bg-success/10 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <div>
                <p className="font-semibold">Consulta libre</p>
                <p className="text-muted-foreground">
                  Ya obtuvo su diploma: puede volver a cualquier módulo cuando lo necesite,
                  sin repetir la evaluación.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <CardDescription>Módulo {m.code}</CardDescription>
            {aprobado && (
              <Badge variant="success">
                <CheckCircle2 className="size-3" aria-hidden /> Aprobado
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg">{m.title}</CardTitle>
          {m.summary && <CardDescription>{m.summary}</CardDescription>}
          <CardDescription className="flex flex-wrap gap-x-4 text-xs">
            {m.duration && <span>Duración {m.duration}</span>}
            <span>{videos.length} videos</span>
            <span>{docs.length} documentos</span>
            <span>{m.questions.length} preguntas</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {textos.map((t) => (
        <Card key={t.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.body}</p>
          </CardContent>
        </Card>
      ))}

      {videos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Videos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {videos.map((v) => (
              <div key={v.id}>
                <p className="mb-2 flex items-center gap-2 font-semibold">
                  {iconoDeItem(v.item_type)} {v.title}
                </p>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                  {v.item_type === 'video_url' && v.url ? (
                    <iframe
                      src={toEmbedUrl(v.url)}
                      title={v.title}
                      className="absolute inset-0 h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : v.file_url ? (
                    <video src={v.file_url} controls className="absolute inset-0 h-full w-full" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-white">
                      Video no disponible
                    </div>
                  )}
                </div>
                {v.body && <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {docs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {docs.map((d) => (
              <Documento
                key={d.id}
                item={d}
                cargando={descargando === d.id}
                onDescargar={() => onDescargar(d)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {m.questions.length === 0 ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-semibold">Este módulo todavía no tiene evaluación</p>
              <p className="text-muted-foreground">
                En cuanto se carguen las preguntas podrá aprobarlo y continuar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-baseline justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Evaluación</CardTitle>
            <CardDescription className="text-xs">
              Se aprueba con {minimo} de {m.questions.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {m.questions.map((q, qi) => {
              const detalle = resultado?.details.find((d) => d.question_id === q.id);
              return (
                <div key={q.id}>
                  <p className="mb-3 font-semibold">
                    {String(qi + 1).padStart(2, '0')}. {q.text}
                  </p>
                  <RadioGroup
                    value={respuestas[q.id] !== undefined ? String(respuestas[q.id]) : ''}
                    disabled={!!resultado}
                    onValueChange={(v) => setRespuestas({ ...respuestas, [q.id]: Number(v) })}
                  >
                    {q.options.map((o, oi) => {
                      const esCorrecta = detalle && oi === detalle.correct_index;
                      const esElegidaMal = detalle && !detalle.ok && oi === detalle.selected;
                      return (
                        <div key={oi} className="flex items-center gap-2.5">
                          <RadioGroupItem value={String(oi)} id={`q${q.id}-o${oi}`} />
                          <Label
                            htmlFor={`q${q.id}-o${oi}`}
                            className={cn(
                              'cursor-pointer py-1 font-normal leading-snug',
                              esCorrecta && 'font-medium text-success',
                              esElegidaMal && 'text-destructive',
                            )}
                          >
                            {o}
                            {esCorrecta && <span className="text-xs"> · correcta</span>}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {detalle?.explanation && (
                    <div
                      className={cn(
                        'mt-3 rounded-md border p-3 text-sm',
                        detalle.ok
                          ? 'border-success/30 bg-success/10'
                          : 'border-gold/40 bg-gold/10',
                      )}
                    >
                      {detalle.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-4 border-t pt-4">
              {resultado ? (
                <>
                  <p
                    className={cn(
                      'text-base font-bold',
                      resultado.passed ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {resultado.correct}/{resultado.total} ·{' '}
                    {resultado.passed ? 'Aprobado' : 'No aprobado'}
                  </p>
                  <Button variant="outline" onClick={onReintentar}>
                    Volver a intentar
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {faltan > 0 ? `Faltan ${faltan} por responder` : 'Todas respondidas'}
                  </p>
                  <Button disabled={faltan > 0 || calificando} onClick={onEnviar}>
                    {calificando && <Loader2 className="animate-spin" aria-hidden />}
                    Enviar respuestas
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Documento ────────────────────────────────────────────────────────────── */

const esPdf = (i: InductionItem) => (i.file_name ?? '').toLowerCase().endsWith('.pdf');

/**
 * Un PDF se lee dentro de la página, sin descargarlo: el navegador ya trae
 * visor. La URL firmada se pide solo al abrirlo, no al cargar el módulo,
 * porque caduca y no tiene sentido emitirla para algo que quizá nadie abra.
 */
function Documento(props: {
  item: InductionItem;
  cargando: boolean;
  onDescargar: () => void;
}) {
  const { item, cargando, onDescargar } = props;
  const [url, setUrl] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);

  const leer = async () => {
    if (url) {
      setUrl(null);
      return;
    }
    setAbriendo(true);
    try {
      setUrl(await fetchPublicInductionFileUrl(item.id));
    } catch {
      toast.error('No se pudo abrir el documento');
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-3 border p-3',
          url ? 'rounded-t-lg' : 'rounded-lg',
        )}
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          {item.body && <p className="truncate text-xs text-muted-foreground">{item.body}</p>}
        </div>
        {esPdf(item) && (
          <Button size="sm" variant={url ? 'outline' : 'default'} disabled={abriendo} onClick={leer}>
            {abriendo && <Loader2 className="animate-spin" aria-hidden />}
            {url ? 'Cerrar' : 'Leer aquí'}
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={cargando} onClick={onDescargar}>
          {cargando ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          Descargar
        </Button>
      </div>
      {url && (
        <iframe
          src={url}
          title={item.title}
          className="block h-[70vh] min-h-[420px] w-full rounded-b-lg border border-t-0"
        />
      )}
    </div>
  );
}

/* ── Diploma ──────────────────────────────────────────────────────────────── */

function Diploma(props: {
  completo: boolean;
  isDark: boolean;
  unidades: ProgramModule[];
  nombre: string;
  /** Fecha real de completación registrada en el servidor. */
  completadoEl: string | null;
  faltan: number;
}) {
  const { completo, isDark, unidades, nombre, completadoEl, faltan } = props;

  if (!completo) {
    return (
      <Card className="motion-safe:animate-fade-up">
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <Award className="size-7 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold">El diploma se emite al completar el programa</h2>
          <p className="text-sm text-muted-foreground">
            {faltan === 1 ? 'Le falta 1 módulo' : `Le faltan ${faltan} módulos`} por aprobar.
          </p>
        </CardContent>
      </Card>
    );
  }

  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  /* La fecha del diploma es la registrada en el servidor al aprobar el último
     módulo; hoy solo como respaldo si aún no llegó la actualización. */
  const emitida = completadoEl ? new Date(completadoEl) : new Date();
  const fecha = `${emitida.getDate()} de ${meses[emitida.getMonth()]} de ${emitida.getFullYear()}`;

  return (
    <div className="flex flex-col gap-4 motion-safe:animate-fade-up">
      <Card className="print:border-0 print:shadow-none">
        <CardContent className="p-6">
          <div className="border-[1.5px] border-gold px-6 py-10 text-center sm:px-11">
            <img
              src={isDark ? logoDark : logoLight}
              alt="Consortium Legal"
              className="mx-auto mb-4 block h-11 w-auto"
            />
            <p className="text-[10.5px] tracking-[.3em] text-gold">
              CONSORTIUM LEGAL · GUATEMALA
            </p>
            <h2 className="mb-1 mt-4 font-serif text-3xl font-bold">Constancia de Inducción</h2>
            <p className="mb-6 text-sm text-muted-foreground">Se hace constar que</p>

            <p className="mx-auto max-w-md border-b border-muted-foreground/40 pb-2 font-serif text-2xl italic">
              {nombre}
            </p>
            <p className="mt-2 text-[10.5px] tracking-[.14em] text-muted-foreground">
              NOMBRE COMPLETO
            </p>

            <p className="mx-auto mt-6 max-w-md text-sm text-muted-foreground">
              completó el Programa de Inducción de la firma, aprobando la evaluación de
              cada módulo.
            </p>

            <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-5 gap-y-1.5 border-t pt-4 text-left">
              {unidades.map((u) => (
                <p key={u.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3.5 shrink-0 text-gold" aria-hidden />
                  {u.code} · {u.title}
                </p>
              ))}
            </div>

            <p className="mt-7 text-[10.5px] tracking-[.1em] text-muted-foreground">
              EMITIDA EL {fecha.toUpperCase()}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="print:hidden">
        <Button onClick={() => window.print()}>
          <Printer aria-hidden />
          Imprimir o guardar en PDF
        </Button>
      </div>
    </div>
  );
}

/* ── Registro del participante ────────────────────────────────────────────── */

/**
 * Puerta de entrada: el programa no se cursa anónimo. Con nombre y correo el
 * avance queda en el servidor (RRHH lo ve) y se retoma desde cualquier equipo
 * ingresando con el mismo correo.
 */
function Registro(props: {
  totalUnidades: number;
  onRegistrar: (nombre: string, correo: string) => Promise<void>;
}) {
  const { totalUnidades, onRegistrar } = props;
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const valido =
    nombre.trim().length >= 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

  const enviar = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    try {
      await onRegistrar(nombre.trim(), correo.trim());
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo registrar; intente de nuevo'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg motion-safe:animate-fade-up">
      <CardHeader>
        <CardTitle className="text-lg">Antes de comenzar</CardTitle>
        <CardDescription>
          El programa tiene {totalUnidades} módulos que se cursan en orden, cada uno con
          una evaluación corta. Regístrese para que su avance quede guardado y, al
          completarlo, reciba su constancia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reg-nombre">
            Nombre completo{' '}
            <span className="font-normal text-muted-foreground">(así saldrá en su diploma)</span>
          </Label>
          <Input
            id="reg-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            placeholder="Ej. María Fernanda López García"
            maxLength={160}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-correo">Correo electrónico</Label>
          <Input
            id="reg-correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            placeholder="nombre@consortiumlegal.com"
            maxLength={160}
          />
        </div>

        <Button className="w-full" disabled={!valido || enviando} onClick={enviar}>
          {enviando && <Loader2 className="animate-spin" aria-hidden />}
          Comenzar mi inducción
        </Button>

        <p className="text-xs text-muted-foreground">
          ¿Ya había comenzado? Ingrese con el mismo correo y retoma donde se quedó,
          incluso desde otro equipo.
        </p>
      </CardContent>
    </Card>
  );
}

export default InduccionPublic;
