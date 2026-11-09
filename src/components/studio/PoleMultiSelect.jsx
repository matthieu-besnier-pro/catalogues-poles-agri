import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// `value` is an array of pole ids; empty = toutes les filiales.
export default function PoleMultiSelect({ poles, value, onChange, disabled, className }) {
  const toggle = (poleId) => {
    const next = value.includes(poleId) ? value.filter((id) => id !== poleId) : [...value, poleId];
    onChange(next);
  };

  const label = !value.length
    ? 'Toutes les filiales'
    : value.length === 1
      ? poles.find((pole) => pole.id === value[0])?.name || '1 filiale'
      : `${value.length} filiales`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="outline" className={className || 'h-9 justify-between gap-2 rounded-full px-4 text-sm font-normal'}>
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {poles.map((pole) => (
          <DropdownMenuCheckboxItem
            key={pole.id}
            checked={value.includes(pole.id)}
            onCheckedChange={() => toggle(pole.id)}
            onSelect={(event) => event.preventDefault()}
          >
            {pole.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
