import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
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
        <div className="relative flex items-center bg-gray-100 rounded-md p-1 border border-gray-200 shadow-sm">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onDateChange(subDays(date, 1))}
                className="hover:bg-gray-200"
            >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
            </Button>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-6 py-2 mx-1 font-bold text-sm flex items-center gap-2 bg-transparent text-yellow-500 hover:bg-gray-200 rounded transition-colors uppercase"
            >
                {format(date, "EEEE d/MM/yyyy", { locale: es })}
            </button>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => onDateChange(addDays(date, 1))}
                className="hover:bg-gray-200"
            >
                <ChevronRight className="w-4 h-4 text-gray-600" />
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(new Date())}
                className="ml-2 text-xs font-bold text-gray-600"
            >
                HOY
            </Button>

            {isOpen && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <span className="font-bold text-sm">Selecciona fecha</span>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-black">✕</button>
                    </div>
                    <DayPicker
                        mode="single"
                        selected={date}
                        onSelect={handleSelect}
                        locale={es as any}
                        styles={{
                            head_cell: { width: '40px' },
                            cell: { width: '40px' },
                            day: { margin: 'auto' },
                            caption: { display: 'flex', justifyContent: 'space-between' }
                        }}
                        modifiersClassNames={{
                            selected: 'bg-yellow-400 text-black font-bold rounded-lg'
                        }}
                    />
                    <div className="flex justify-end mt-4">
                        <Button
                            className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
                            onClick={() => { onDateChange(new Date()); setIsOpen(false); }}
                        >
                            HOY
                        </Button>
                    </div>
                </div>
            )}

            {/* Backdrop */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            )}
        </div>
    );
}
