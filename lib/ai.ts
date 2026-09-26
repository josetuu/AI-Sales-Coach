import "server-only"
import { generateText, Output } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import type { Line } from "@/lib/playbook"
import { reportSchema } from "@/lib/schemas"

const transcriptSchema = z.object({
  lines: z.array(
    z.object({
      speaker: z.enum(["agent", "client"]).describe("agent = vendedor de seguros, client = cliente"),
      text: z.string(),
      seconds: z.number().describe("Segundo aproximado de inicio"),
    }),
  ),
})

export async function transcribeRecording(audio: Uint8Array, mediaType: string): Promise<Line[]> {
  const { output } = await generateText({
    model: google("gemini-flash-latest"),
    maxRetries: 5,
    output: Output.object({ schema: transcriptSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Transcribe esta llamada de ventas de seguros palabra por palabra, en el idioma original. Separa por intervenciones e identifica quién habla: 'agent' es el vendedor/agente de seguros y 'client' es el cliente o prospecto. No resumas ni inventes.",
          },
          { type: "file", data: audio, mediaType },
        ],
      },
    ],
  })
  return output.lines
    .filter((l) => l.text.trim())
    .map((l, i) => ({ id: String(i), speaker: l.speaker, text: l.text.trim(), t: Math.round(l.seconds * 1000) }))
}

export async function analyzeTranscript(lines: Line[]) {
  const transcript = lines.map((l) => `${l.speaker === "agent" ? "VENDEDOR" : "CLIENTE"}: ${l.text}`).join("\n")
  const { output } = await generateText({
    model: google("gemini-flash-latest"),
    maxRetries: 5,
    output: Output.object({ schema: reportSchema }),
    prompt: `Eres un coach senior de ventas de seguros, experto en PNL, comunicación, rapport, manejo de objeciones, negociación y cierre. Analiza a fondo esta llamada real y crea un informe de desempeño enriquecido, honesto y accionable para que el vendedor crezca. Cita momentos concretos. Puntuaciones de 0 a 100. Incluye 3-5 elementos por lista, y reescribe 2-4 frases del vendedor de forma más efectiva. En "extras" añade aportes útiles adicionales (perfil psicológico del cliente, guion de seguimiento, etc.). En "nextStep" describe el estado final del cliente y qué debe hacer el vendedor en el seguimiento, con 2-3 frases que puede decir. Responde en español.\n\nTranscripción:\n${transcript}`,
  })
  return output
}
