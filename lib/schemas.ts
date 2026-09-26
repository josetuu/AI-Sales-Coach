import { z } from "zod"

export const tipSchema = z.object({
  phase: z.enum(["apertura", "descubrimiento", "presentación", "objeciones", "cierre"]),
  action: z.enum(["escucha", "pregunta", "profundiza", "maneja objeción", "cierra"]),
  sentiment: z.number().describe("Temperatura del cliente de 0 (frío) a 100 (listo para comprar)"),
  intent: z.string().describe("Intención actual del cliente en pocas palabras"),
  tip: z.string().describe("Consejo breve y accionable para el vendedor ahora mismo"),
  suggestedReplies: z.array(z.string()).describe("2 o 3 respuestas naturales que el vendedor puede decir"),
  mistake: z.string().nullable().describe("Error reciente del vendedor, o null"),
})
export type Tip = z.infer<typeof tipSchema>

const item = z.object({ title: z.string(), detail: z.string() })

export const reportSchema = z.object({
  score: z.number().describe("Puntuación global 0-100"),
  summary: z.string(),
  scores: z.object({
    rapport: z.number(),
    descubrimiento: z.number(),
    objeciones: z.number(),
    cierre: z.number(),
    escucha: z.number(),
  }),
  strengths: z.array(item),
  weaknesses: z.array(item),
  improvements: z.array(item),
  tips: z.array(item),
  techniques: z.array(item),
  opportunitiesTaken: z.array(item),
  opportunitiesMissed: z.array(item),
  rewrites: z
    .array(z.object({ said: z.string(), better: z.string(), why: z.string() }))
    .describe("Frases del vendedor reescritas de forma más efectiva"),
  recommendations: z.array(item),
  extras: z.array(item),
  nextStep: tipSchema.describe("Estado final del cliente y qué hacer en el seguimiento"),
})
export type Report = z.infer<typeof reportSchema>
