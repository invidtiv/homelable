import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TextPosition } from '@/types'

export interface GroupRectFormData {
  label: string
  font: string
  text_color: string
  text_position: TextPosition
  border_color: string
  background_color: string
  z_order: number
}

const DEFAULT_FORM: GroupRectFormData = {
  label: '',
  font: 'inter',
  text_color: '#e6edf3',
  text_position: 'top-left',
  border_color: '#00d4ff',
  background_color: '#00d4ff0d',
  z_order: 1,
}

const FONTS = [
  { value: 'inter', label: 'Inter (sans-serif)' },
  { value: 'mono', label: 'JetBrains Mono' },
  { value: 'serif', label: 'Serif' },
]

const TEXT_POSITIONS: { value: TextPosition; label: string }[] = [
  { value: 'top-left',      label: '↖' },
  { value: 'top-center',    label: '↑' },
  { value: 'top-right',     label: '↗' },
  { value: 'middle-left',   label: '←' },
  { value: 'center',        label: '·' },
  { value: 'middle-right',  label: '→' },
  { value: 'bottom-left',   label: '↙' },
  { value: 'bottom-center', label: '↓' },
  { value: 'bottom-right',  label: '↘' },
]

interface GroupRectModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: GroupRectFormData) => void
  onDelete?: () => void
  initial?: Partial<GroupRectFormData>
  title?: string
}

export function GroupRectModal({ open, onClose, onSubmit, onDelete, initial, title = 'Add Rectangle' }: GroupRectModalProps) {
  const [form, setForm] = useState<GroupRectFormData>({ ...DEFAULT_FORM, ...initial })

  const set = <K extends keyof GroupRectFormData>(key: K, value: GroupRectFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
    onClose()
  }

  const colorFields = [
    { key: 'text_color' as const, label: 'Text' },
    { key: 'border_color' as const, label: 'Border' },
    { key: 'background_color' as const, label: 'Background' },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#161b22] border-[#30363d] text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Label</Label>
            <Input
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              placeholder="Zone name…"
              className="bg-[#21262d] border-[#30363d] text-sm h-8"
            />
          </div>

          {/* Font */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Font</Label>
            <Select value={form.font} onValueChange={(v: string) => set('font', v)}>
              <SelectTrigger className="bg-[#21262d] border-[#30363d] text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#21262d] border-[#30363d]">
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-sm">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text position 3×3 grid */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Text Position</Label>
            <div className="grid grid-cols-3 gap-1">
              {TEXT_POSITIONS.map(({ value, label }) => {
                const isSelected = form.text_position === value
                return (
                  <button
                    key={value}
                    type="button"
                    title={value}
                    onClick={() => set('text_position', value)}
                    className="h-8 rounded text-base transition-colors"
                    style={{
                      background: isSelected ? '#00d4ff22' : '#21262d',
                      border: `1px solid ${isSelected ? '#00d4ff88' : '#30363d'}`,
                      color: isSelected ? '#00d4ff' : '#8b949e',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Colors */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Colors</Label>
            <div className="grid grid-cols-3 gap-2">
              {colorFields.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1 items-center">
                  <label
                    className="relative w-full h-7 rounded-md border cursor-pointer overflow-hidden"
                    style={{ borderColor: '#30363d' }}
                  >
                    <input
                      type="color"
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full rounded-sm" style={{ background: form[key] }} />
                  </label>
                  <span className="text-[9px] text-muted-foreground/60">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Z-order */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Z-Order (1 = furthest back)</Label>
            <Select value={String(form.z_order)} onValueChange={(v: string) => set('z_order', Number(v))}>
              <SelectTrigger className="bg-[#21262d] border-[#30363d] text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#21262d] border-[#30363d]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-sm font-mono">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between gap-2 pt-1">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[#f85149] hover:text-[#f85149] hover:bg-[#f85149]/10"
                onClick={() => { onDelete(); onClose() }}
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#00d4ff] text-[#0d1117] hover:bg-[#00d4ff]/90">
                {title === 'Add Rectangle' ? 'Add' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
