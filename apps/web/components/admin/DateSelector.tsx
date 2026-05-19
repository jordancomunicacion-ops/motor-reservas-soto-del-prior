import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { es as esCalendar } from 'react-day-picker/locale';
import 'react-day-picker/dist/style.css';
import { Button } from '@/components/ui/button';

interface DatePickerProps {
    date: Date;
    onDateChange: (date: Date) => void;
}

export function DateSelector({ date, onDateChange }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (newDate: Date | undefined) => {
        if (newDate) {
            onDateChange(newDate);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDateChange(subDays(date, 1))}
                aria-label="Día anterior"
            >
                <ChevronLeft className="size-3.5" />
            </Button>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 h-8 inline-flex items-center text-sm font-medium text-foreground hover:bg-accent/60 rounded transition-colors capitalize tabular-nums"
            >
                {format(date, "EEEE d/MM/yyyy", { locale: es })}
            </button>

            <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDateChange(addDays(date, 1))}
                aria-label="Día siguiente"
            >
                <ChevronRight className="size-3.5" />
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(new Date())}
                className="ml-1 h-8 text-xs"
            >
                Hoy
            </Button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-popover text-popover-foreground rounded-md shadow-lg border border-border p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-sm font-medium">Selecciona fecha</span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Cerrar"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                        <DayPicker
                            mode="single"
                            selected={date}
                            onSelect={handleSelect}
                            locale={esCalendar}
                            styles={{
                                head_cell: { width: '36px' },
                                cell: { width: '36px' },
                                day: { margin: 'auto' },
                            }}
                            modifiersClassNames={{
                                selected: 'bg-primary text-primary-foreground rounded-md',
                                today: 'border border-primary/40',
                            }}
                        />
                        <div className="flex justify-end mt-3">
                            <Button
                                size="sm"
                                onClick={() => { onDateChange(new Date()); setIsOpen(false); }}
                            >
                                Hoy
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
