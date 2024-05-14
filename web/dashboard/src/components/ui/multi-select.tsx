import {ChevronsUpDown, TrashIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandEmpty,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {useState} from "react";

export default function MultiSelect({
                                        allOptions,
                                        label,
                                        placeholder,
                                        valueProp = "value",
                                        viewValueProp = "label",
                                        notFoundLabel = "No options found",
                                        addLabel = "Add option",
                                        initialSelectedOptions = [],
                                        onChange,
                                    }) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState("");
    const [selectedComponents, setSelectedComponents] = useState<any[]>(initialSelectedOptions);

    const onAdd = (item) => {
        const newValue = [...selectedComponents, item.name];
        setSelectedComponents(newValue);
        setCurrent("");
        onChange && onChange(newValue);
    };

    const onRemove = (item) => {
        const newValue = selectedComponents.filter((i) => i !== item.name);
        setSelectedComponents(newValue);
        onChange && onChange(newValue);
    };

    const renderOption = (option) => {
        const isSelected = selectedComponents.includes(option[valueProp]);
        return (
            !isSelected && (
                <CommandItem
                    key={option[valueProp]}
                    onSelect={(currentValue) => {
                        setCurrent(currentValue);
                        setOpen(false);
                    }}
                >
                    {option[viewValueProp]}
                </CommandItem>
            )
        );
    };

    return (
        <div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <div className="mt-2">
                {allOptions.map((item) => (
                    <div
                        key={item.name}
                        className=" flex items-center space-x-4 rounded-md border p-4 mt-2 mb-2"
                    >
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">{item.name}</p>
                        </div>
{
                        <div className="flex items-center space-x-2">
                            <Switch checked={selectedComponents.some(selectedComponent => selectedComponent === item.name)}
                                    onCheckedChange={checked => checked ? onAdd(item) : onRemove(item)}/>
                        </div>}
                    </div>
                ))}
            </div>
        </div>
    );
}
