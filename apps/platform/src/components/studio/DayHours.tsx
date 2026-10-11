import { inputClass } from './Field'

/**
 * One weekday: name and a big open/working switch on the first line, start and end times below at full width
 * (time inputs get cramped and truncated on phones when squeezed into one row).
 */
export const DayHoursRow = ({
  day,
  label,
  open,
  start,
  end,
  names,
  openLabel = 'Open',
}: {
  day: string
  label: string
  open: boolean
  start: string
  end: string
  names: { open: string; start: string; end: string }
  openLabel?: string
}) => (
  <fieldset className='group rounded-btn border border-line p-3' data-day={day}>
    <legend className='sr-only'>{label}</legend>
    <div className='flex items-center justify-between gap-3'>
      <span className='font-medium'>{label}</span>
      <label className='flex min-h-11 cursor-pointer items-center gap-3 text-sm'>
        <span className='text-muted group-has-[input[data-open]:checked]:text-ink'>{openLabel}</span>
        <input className='peer sr-only' data-open defaultChecked={open} name={names.open} type='checkbox' />
        <span
          aria-hidden
          className='relative h-7 w-12 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5'
        />
      </label>
    </div>
    <div className='mt-2 grid grid-cols-2 gap-2 group-has-[input[data-open]:not(:checked)]:hidden'>
      <label className='block text-xs text-muted'>
        From
        <input aria-label={`${label} from`} className={`${inputClass} mt-1`} defaultValue={start} name={names.start} type='time' />
      </label>
      <label className='block text-xs text-muted'>
        To
        <input aria-label={`${label} to`} className={`${inputClass} mt-1`} defaultValue={end} name={names.end} type='time' />
      </label>
    </div>
    <p className='mt-1 hidden text-xs text-muted group-has-[input[data-open]:not(:checked)]:block'>Closed</p>
  </fieldset>
)
