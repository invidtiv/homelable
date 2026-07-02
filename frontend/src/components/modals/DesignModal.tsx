import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DESIGN_ICONS, DEFAULT_DESIGN_ICON } from '@/utils/designIcons'
import type { FloorMapConfig } from '@/types'

export interface DesignFormData {
  name: string
  icon: string
  /**
   * Floor plan for THIS canvas. Only present when the floor-plan section is
   * shown (edit mode on the active canvas). `null` means "remove the floor
   * plan"; `undefined` means "leave it untouched".
   */
  floorMap?: FloorMapConfig | null
}

interface DesignModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: DesignFormData) => void
  initial?: DesignFormData
  title?: string
  submitLabel?: string
  /** Show the floor-plan section (only meaningful when editing the active canvas). */
  showFloorMap?: boolean
  /** Current floor plan of the canvas being edited (position preserved on save). */
  initialFloorMap?: FloorMapConfig | null
  /**
   * Upload a selected image and resolve to its server URL. Required whenever
   * the floor-plan section is shown — images are stored server-side, never as
   * base64. Rejects on failure (caller surfaces the error).
   */
  onUploadImage?: (file: File) => Promise<string>
}

export function DesignModal({
  open,
  onClose,
  onSubmit,
  initial,
  title = 'New Canvas',
  submitLabel = 'Create',
  showFloorMap = false,
  initialFloorMap = null,
  onUploadImage,
}: DesignModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? DEFAULT_DESIGN_ICON)

  // Floor plan state (only used when showFloorMap)
  const [imageData, setImageData] = useState(initialFloorMap?.imageData ?? '')
  const [width, setWidth] = useState(initialFloorMap?.width ?? 800)
  const [height, setHeight] = useState(initialFloorMap?.height ?? 600)
  const [opacity, setOpacity] = useState(initialFloorMap?.opacity ?? 0.8)
  const [locked, setLocked] = useState(initialFloorMap?.locked ?? false)
  const [enabled, setEnabled] = useState(initialFloorMap?.enabled ?? true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''  // allow re-selecting the same file after a failure
    if (!file || !onUploadImage) return
    setUploading(true)
    try {
      const url = await onUploadImage(file)
      setImageData(url)
      // Read natural dimensions from the served image (non-blocking).
      const img = new Image()
      img.onload = () => {
        setWidth(img.naturalWidth)
        setHeight(img.naturalHeight)
      }
      img.src = url
    } catch {
      // Caller surfaces the error toast; leave existing state untouched.
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const data: DesignFormData = { name: trimmed, icon }
    if (showFloorMap) {
      data.floorMap = imageData
        ? {
            imageData,
            // Preserve position from the existing config; new plans start at 0,0.
            posX: initialFloorMap?.posX ?? 0,
            posY: initialFloorMap?.posY ?? 0,
            width,
            height,
            opacity,
            locked,
            enabled,
          }
        : null
    }
    onSubmit(data)
  }

  const hasImage = !!imageData

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="design-name">Name</Label>
            <Input
              id="design-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="e.g. Home Network, Rack Power"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {DESIGN_ICONS.map((entry) => {
                const Icon = entry.icon
                const selected = entry.key === icon
                return (
                  <button
                    key={entry.key}
                    type="button"
                    aria-label={entry.label}
                    aria-pressed={selected}
                    title={entry.label}
                    onClick={() => setIcon(entry.key)}
                    className={`flex items-center justify-center aspect-square rounded-md border transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#00d4ff] bg-[#00d4ff]/10 text-[#00d4ff]'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-[#30363d]'
                    }`}
                  >
                    <Icon size={16} />
                  </button>
                )
              })}
            </div>
          </div>

          {showFloorMap && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label>Floor Plan</Label>
              {!hasImage ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#30363d] rounded-lg p-6 cursor-pointer hover:border-[#00d4ff]/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
                  <span className="text-muted-foreground text-sm">{uploading ? 'Uploading…' : 'Click to select a floor plan image'}</span>
                  <span className="text-muted-foreground/50 text-xs">PNG, JPEG or WebP · max 10 MB</span>
                </div>
              ) : (
                <>
                  <div className="relative rounded-lg overflow-hidden border border-[#30363d]" style={{ maxHeight: 160 }}>
                    <img src={imageData} alt="Floor plan preview" className="w-full h-full object-contain" style={{ opacity }} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" className="cursor-pointer" disabled={uploading} onClick={() => fileRef.current?.click()}>
                      {uploading ? 'Uploading…' : 'Replace Image'}
                    </Button>
                    <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => setImageData('')}>
                      Remove
                    </Button>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Width (px)</Label>
                      <Input type="number" value={width} onChange={(e) => setWidth(Math.max(80, Number(e.target.value)))} className="bg-[#21262d] border-[#30363d] text-xs h-8" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Height (px)</Label>
                      <Input type="number" value={height} onChange={(e) => setHeight(Math.max(80, Number(e.target.value)))} className="bg-[#21262d] border-[#30363d] text-xs h-8" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Opacity: {Math.round(opacity * 100)}%</Label>
                    <input
                      type="range" min="0.05" max="1" step="0.05" value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-[#00d4ff]"
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} className="accent-[#00d4ff] w-3.5 h-3.5" />
                      <span className="text-xs text-muted-foreground">Lock position & size</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-[#00d4ff] w-3.5 h-3.5" />
                      <span className="text-xs text-muted-foreground">Show on canvas</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
