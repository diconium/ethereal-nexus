import React, {FC} from 'react';
import r2wc from "@r2wc/react-to-web-component"
import {Calendar} from "@/components/ui/calendar.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Button} from "@/components/ui/button.tsx";
import {cn} from "@/lib/utils.ts";
import {CalendarIcon} from "lucide-react";
import {format} from "date-fns";

//version: 1.0.2
interface Props {
    // AEMType: textfield
    // AEMPlaceholder: Type your name
    // AEMDescription: Name
    title: string;
    // AEMType: textfield
    // AEMPlaceholder: Type your description
    // AEMDescription: Description
    description: string;
    datepickerColor: string,
}

const DatePicker: FC<Props> = ({title, description, datepickerColor= 'slate'}) => {
    const [date, setDate] = React.useState<Date>()

    return (
        <>
            <h1 className="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white">{title}</h1>
            <p className="mb-6 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 xl:px-48 dark:text-gray-400">{description}</p>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[280px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        modifiersClassNames={{
                            selected: 'text-lime-400',
                            today: 'text-red-500'
                        }}
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className={`bg-${datepickerColor}-200`}
                    />
                </PopoverContent>
        </Popover>
    </>
    )
};


export default DatePicker;

if (!window.customElements.get('table-component')) {
    customElements.define("table-component", r2wc(DatePicker, {
        props: {
            title: "string",
            description: "string",
            datepickerColor: "string",
        }
    }))
}