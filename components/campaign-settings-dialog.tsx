'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Settings2, Trash2 } from 'lucide-react'
import { apiSend } from '@/lib/api-client'
import type { CampaignDTO } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NativeSelect } from '@/components/native-select'

export function CampaignSettingsDialog({
  campaign,
  onSaved,
  onDeleted,
  trigger = 'button',
}: {
  campaign: CampaignDTO
  onSaved: () => void
  onDeleted?: () => void
  trigger?: 'button' | 'icon'
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: campaign.name,
    agentPhone: campaign.agentPhone ?? '',
    maxAttempts: campaign.maxAttempts,
    autoAdvance: campaign.autoAdvance,
    script: campaign.script ?? '',
  })

  async function save() {
    setSaving(true)
    try {
      await apiSend(`/api/campaigns/${campaign.id}`, 'PATCH', form)
      toast.success('Ajustes guardados')
      onSaved()
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('¿Eliminar la campaña? Tu Google Sheet no se modificará.')) return
    await apiSend(`/api/campaigns/${campaign.id}`, 'DELETE')
    toast.success('Campaña eliminada')
    onDeleted?.()
  }

  return (
    <>
      {trigger === 'icon' ? (
        <Button variant="ghost" size="icon" aria-label="Ajustes de campaña" onClick={() => setOpen(true)}>
          <Settings2 className="size-4" />
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Settings2 className="size-4" aria-hidden />
          Ajustes
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustes de campaña</DialogTitle>
            <DialogDescription>Configura el marcado y el guion que verá el agente.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-name">Nombre</Label>
              <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="s-phone">Teléfono del agente</Label>
                <Input
                  id="s-phone"
                  inputMode="tel"
                  value={form.agentPhone}
                  onChange={(e) => setForm({ ...form, agentPhone: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="s-max">Intentos máximos</Label>
                <NativeSelect
                  id="s-max"
                  value={form.maxAttempts}
                  onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <Label htmlFor="s-auto">Auto-marcado</Label>
                <p className="text-xs text-muted-foreground">Marca el siguiente lead automáticamente tras guardar el resultado.</p>
              </div>
              <Switch id="s-auto" checked={form.autoAdvance} onCheckedChange={(v) => setForm({ ...form, autoAdvance: v })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-script">Guion de llamada</Label>
              <Textarea
                id="s-script"
                rows={6}
                value={form.script}
                placeholder={'Hola {nombre}, te llamo de…'}
                onChange={(e) => setForm({ ...form, script: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Usa <span className="font-mono">{'{nombre}'}</span> y <span className="font-mono">{'{empresa}'}</span> para personalizar.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {onDeleted ? (
              <Button variant="ghost" className="text-destructive" onClick={remove}>
                <Trash2 className="size-4" aria-hidden />
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
