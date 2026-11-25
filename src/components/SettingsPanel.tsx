import { ArrowDownToLine, Copy } from '@gravity-ui/icons'
import {
  Button,
  Description,
  Label,
  ListBox,
  Select,
  Slider,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { OUTPUT_FORMAT_LIST, OUTPUT_FORMATS, type OutputFormat } from '@/lib/formats'
import { normalizeScales, outputFileName, SCALES, scaleLabel } from '@/lib/naming'
import { type ImageItem, useImages } from '@/store/images'

export function SettingsPanel({ item, onExport }: { item: ImageItem; onExport: () => void }) {
  const updateSettings = useImages((s) => s.updateSettings)
  const applySettingsToAll = useImages((s) => s.applySettingsToAll)
  const itemCount = useImages((s) => s.items.length)
  const exporting = useImages((s) => s.exporting)
  const { settings } = item
  const format = OUTPUT_FORMATS[settings.format]
  const update = (patch: Partial<ImageItem['settings']>) => updateSettings(item.id, patch)
  const showQuality = format.lossy && !settings.lossless

  return (
    <div className="flex flex-col gap-6">
      <Select
        value={settings.format}
        onChange={(value) => value && update({ format: value as OutputFormat })}
        variant="secondary"
      >
        <Label>Format</Label>
        <Select.Trigger data-testid="format-select">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {OUTPUT_FORMAT_LIST.map((f) => (
              <ListBox.Item key={f.id} id={f.id} textValue={f.label}>
                <span>{f.label}</span>
                <span className="text-muted ml-2 text-xs">{f.codec}</span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {format.supportsLossless && (
        <Switch isSelected={settings.lossless} onChange={(lossless) => update({ lossless })}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Lossless
          </Switch.Content>
        </Switch>
      )}

      {showQuality && (
        <Slider
          key={`quality-${settings.format}`}
          defaultValue={settings.quality}
          minValue={0}
          maxValue={100}
          onChangeEnd={(value) => update({ quality: value as number })}
        >
          <Label>Quality</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      )}

      {settings.format === 'png' && (
        <Slider
          defaultValue={settings.pngLevel}
          minValue={1}
          maxValue={6}
          onChangeEnd={(value) => update({ pngLevel: value as number })}
        >
          <Label>Effort</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
          <Description>Higher is smaller but slower. PNG is always lossless.</Description>
        </Slider>
      )}

      <div className="flex flex-col gap-2">
        <Label id="scales-label">Export sizes</Label>
        <ToggleButtonGroup
          aria-labelledby="scales-label"
          selectionMode="multiple"
          disallowEmptySelection
          size="sm"
          selectedKeys={settings.scales.map(String)}
          onSelectionChange={(keys) =>
            update({ scales: normalizeScales(Array.from(keys, Number)) })
          }
          className="flex-wrap"
        >
          {SCALES.map((scale) => (
            <ToggleButton key={scale} id={String(scale)}>
              {scaleLabel(scale)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <ul aria-label="Output files" className="text-muted flex flex-col gap-0.5 text-xs">
          {settings.scales.map((scale) => (
            <li key={scale} className="truncate font-mono">
              {outputFileName(item.name, format.extension, scale)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Button onPress={onExport} isPending={!!exporting} isDisabled={!!exporting}>
          <ArrowDownToLine aria-hidden="true" />
          Export this image
        </Button>
        {itemCount > 1 && (
          <Button variant="secondary" onPress={() => applySettingsToAll(item.id)}>
            <Copy aria-hidden="true" />
            Apply settings to all
          </Button>
        )}
      </div>
    </div>
  )
}
