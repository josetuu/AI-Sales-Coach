export type Speaker = "agent" | "client"

export type Line = { id: string; speaker: Speaker; text: string; t: number }

export type SignalKind = "objection" | "buying" | "risk" | "emotion"

export type Signal = {
  id: string
  kind: SignalKind
  label: string
  quote: string
  suggestion: string
  t: number
}

type Rule = { kind: SignalKind; label: string; patterns: RegExp[]; suggestion: string }

const RULES: Rule[] = [
  {
    kind: "objection",
    label: "Precio",
    patterns: [/caro/i, /precio/i, /no (me )?alcanza/i, /presupuesto/i, /muy alto/i, /cuánto (me )?cuesta/i],
    suggestion:
      "Aísla la objeción: “Aparte del precio, ¿hay algo más que te frene?” Luego reencuadra en costo diario y en lo que protege.",
  },
  {
    kind: "objection",
    label: "Lo tengo que pensar",
    patterns: [/pensarlo/i, /lo (voy a|tengo que) pensar/i, /déjame pensar/i, /más adelante/i],
    suggestion:
      "Descubre la duda real: “Claro. Para ayudarte a pensarlo, ¿qué parte te genera más dudas: la cobertura, el precio o el momento?”",
  },
  {
    kind: "objection",
    label: "Consultar con pareja",
    patterns: [/esposa|esposo|pareja|mi marido|mi mujer/i, /consultar(lo)? con/i],
    suggestion:
      "Incluye al decisor: “Perfecto, ¿qué crees que te preguntaría? Podemos agendar 10 minutos con ambos mañana.”",
  },
  {
    kind: "objection",
    label: "Ya tiene seguro",
    patterns: [/ya tengo (un )?seguro/i, /ya estoy (asegurado|cubierto)/i, /otra compañía/i],
    suggestion:
      "No compitas, compara: “Genial que estés protegido. ¿Cuándo fue la última vez que revisaste si tu póliza cubre X?”",
  },
  {
    kind: "objection",
    label: "Desconfianza",
    patterns: [/no confío/i, /estafa/i, /no (me )?pagan/i, /letra pequeña/i, /seguro que no/i],
    suggestion:
      "Valida y aporta prueba social: “Entiendo, muchos clientes sentían lo mismo. Te cuento cómo funcionó el reclamo de…”",
  },
  {
    kind: "objection",
    label: "No tengo tiempo",
    patterns: [/no tengo tiempo/i, /estoy ocupad/i, /llámame (luego|después)/i],
    suggestion: "Pide micro-permiso: “Te entiendo, ¿me regalas 2 minutos para ver si tiene sentido seguir hablando?”",
  },
  {
    kind: "buying",
    label: "Señal de compra",
    patterns: [/cómo (sería|funciona) el pago/i, /cuándo empieza/i, /qué necesito/i, /me interesa/i, /suena bien/i, /cómo (lo )?contrato/i],
    suggestion: "¡Momento de cerrar! Usa cierre de alternativa: “¿Prefieres que la cobertura empiece el 1 o el 15?”",
  },
  {
    kind: "emotion",
    label: "Motivación emocional",
    patterns: [/mis hijos/i, /mi familia/i, /me preocupa/i, /miedo/i, /accidente/i, /si me pasa algo/i],
    suggestion:
      "Profundiza la emoción: “Cuéntame más, ¿qué es lo que más te preocupa de eso?” Escucha y parafrasea antes de proponer.",
  },
]

export function detectSignals(line: Line): Signal[] {
  if (line.speaker !== "client") return []
  return RULES.filter((r) => r.patterns.some((p) => p.test(line.text))).map((r) => ({
    id: `${line.id}-${r.label}`,
    kind: r.kind,
    label: r.label,
    quote: line.text,
    suggestion: r.suggestion,
    t: line.t,
  }))
}

export function talkRatio(lines: Line[]) {
  let agent = 0
  let client = 0
  for (const l of lines) {
    const w = l.text.split(/\s+/).length
    if (l.speaker === "agent") agent += w
    else client += w
  }
  const total = agent + client || 1
  return { agent: Math.round((agent / total) * 100), client: Math.round((client / total) * 100) }
}

export function questionCount(lines: Line[]) {
  return lines.filter((l) => l.speaker === "agent" && /\?|¿/.test(l.text)).length
}

export const TECHNIQUES = [
  {
    area: "PNL",
    name: "Rapport por espejo verbal",
    how: "Repite 2-3 palabras clave exactas del cliente y adapta tu ritmo al suyo.",
    example: "Cliente: “Me preocupa mucho el futuro de mis hijos.” Tú: “El futuro de tus hijos… cuéntame más.”",
  },
  {
    area: "PNL",
    name: "Presuposiciones",
    how: "Habla como si la decisión ya estuviera tomada, sin presionar.",
    example: "“Cuando tengas tu póliza activa, lo primero que notarás es…”",
  },
  {
    area: "Comunicación",
    name: "Escucha activa + parafraseo",
    how: "Resume lo que dijo el cliente antes de responder. Valida emoción y contenido.",
    example: "“Si entiendo bien, lo que buscas es tranquilidad sin pagar de más, ¿correcto?”",
  },
  {
    area: "Descubrimiento",
    name: "Preguntas SPIN",
    how: "Situación → Problema → Implicación → Necesidad de beneficio.",
    example: "“¿Qué pasaría con los gastos de la casa si mañana no pudieras trabajar por 6 meses?”",
  },
  {
    area: "Objeciones",
    name: "Método Feel-Felt-Found",
    how: "Entiendo cómo te sientes, otros se sintieron igual, y descubrieron que…",
    example: "“Entiendo que lo veas caro; varios clientes lo sentían así y descubrieron que es menos que un café al día.”",
  },
  {
    area: "Objeciones",
    name: "Aislar la objeción",
    how: "Confirma que es la única barrera antes de resolverla.",
    example: "“Si resolvemos el tema del precio, ¿hay algo más que te impediría avanzar hoy?”",
  },
  {
    area: "Negociación",
    name: "Anclaje",
    how: "Presenta primero la opción más completa para que las siguientes parezcan accesibles.",
    example: "“El plan Premium cubre todo por $80; muchos eligen el Plus de $55 que cubre lo esencial.”",
  },
  {
    area: "Cierre",
    name: "Cierre de alternativa",
    how: "Ofrece dos opciones positivas en lugar de sí/no.",
    example: "“¿Lo dejamos con pago mensual o anual con descuento?”",
  },
  {
    area: "Seguros",
    name: "Historia del reclamo",
    how: "Cuenta un caso real (anónimo) donde la póliza salvó a una familia. Lo emocional vende.",
    example: "“Un cliente de 38 años tuvo un accidente el mes 3; la póliza cubrió su hipoteca un año entero.”",
  },
]

export const DEMO_SCRIPT: [Speaker, string][] = [
  ["agent", "Hola María, soy Carlos de Seguros Vida Plena, ¿cómo estás hoy?"],
  ["client", "Bien, gracias, aunque estoy un poco ocupada."],
  ["agent", "Te entiendo, seré breve. Te llamo por el seguro de vida que cotizaste la semana pasada."],
  ["client", "Sí, lo vi, pero la verdad me pareció muy caro."],
  ["agent", "El plan cuesta 45 dólares al mes y cubre hasta 200 mil."],
  ["client", "Es que ya tengo un seguro por el trabajo."],
  ["agent", "¿Y sabes cuánto te cubre ese seguro si dejas el trabajo?"],
  ["client", "No, la verdad no sé. Me preocupa porque tengo dos hijos pequeños."],
  ["agent", "Claro, por eso este plan es ideal, tiene muchas coberturas y beneficios."],
  ["client", "Suena bien, pero lo tengo que pensar y consultarlo con mi esposo."],
  ["agent", "Perfecto, te llamo la próxima semana entonces."],
]
