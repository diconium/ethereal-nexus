"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { format } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Check } from "lucide-react"
import { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ProjectComponent } from '@/data/projects/dto';
import { MemberWithPublicUser } from '@/data/member/dto';
import { Checkbox } from '@/components/ui/checkbox';

interface EventFilterComponentProps {
  isComponentView: boolean;
  components: ProjectComponent[];
  members: MemberWithPublicUser[];
}

const EventFilter: React.FC<EventFilterComponentProps> = ({isComponentView, components, members}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isComponentDialogOpen, setIsComponentDialogOpen] = React.useState<boolean>();
  const [isUsersDialogOpen, setIsUserDialogOpen] = React.useState<boolean>();
  const [date, setDate] = React.useState<DateRange | undefined>()
  const [component, setComponent] = React.useState<string | undefined>()
  const [user, setUser] = React.useState<string | undefined>()
  const [onlyActive, setOnlyActive] = React.useState<boolean>(false)

  useEffect(() => {
    applyFilter();
  }, [component, date, user, onlyActive]);
  
  const applyFilter = () => {
    
    const params = new URLSearchParams();
    
    if(date && date.from) {
      params.set("initialDateFilter", format(date.from, "MM-dd-yyyy 00:00:00"));
    }

    if(date && date.to) {
      params.set("finalDateFilter", format(date.to, "MM-dd-yyyy 23:59:59"));
    } 

    if(component) {
      params.set("componentFilter", component);
    } 

    if(user) {
      params.set("userFilter", user);
    } 

    if(onlyActive) {
      params.set("onlyActive", onlyActive.toString());
    } 

    router.push(`${pathname}?tab=activity&${params.toString()}`);  

  }

  return (
    <div className="mb-4">
      <div className="max-w-4xl">
      <div className="" id="filter-section">
        <div className="flex flex-col md:flex-row md:space-x-4">
          <div className="mb-4 md:mb-0">
            <label className="block text-sm font-medium text-gray-700">
              Filter by Date
            </label>
            <div className={cn("grid gap-2 mt-1")}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span className='pl-2'>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {!isComponentView && <div className="mb-4 md:mb-0">
            <label className="block text-sm font-medium text-gray-700">
            Filter by Component
            </label>
            <Popover open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[200px] justify-between mt-1"
                >
                  {component
                    ? components.find((item) => item.id === component)?.name
                    : "Select component..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {components.map((mapComponent) => (
                        <CommandItem
                          key={mapComponent.id}
                          value={mapComponent.id}
                          onSelect={(currentValue) => {
                            setComponent(currentValue === component ? "" : currentValue);
                            setIsComponentDialogOpen(false);
                          }}
                        >
                          {mapComponent.name}
                          <Check
                            className={cn(
                              "ml-auto",
                              component === mapComponent.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>}
          <div>
            <label className="block text-sm font-medium text-gray-700" >
            Filter by User
            </label>
            <Popover open={isUsersDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[200px] justify-between mt-1"
                >
                  {user
                    ? members.find((item) => item.user.id === user)?.user.name
                    : "Select user..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {members.map((member) => (
                        <CommandItem
                          key={member.user.id}
                          value={member.user.id}
                          onSelect={(currentValue) => {
                            setUser(currentValue === member.id ? "" : currentValue);
                            setIsUserDialogOpen(false);
                          }}
                        >
                          {member.user.name}
                          <Check
                            className={cn(
                              "ml-auto",
                              user === member.user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {!isComponentView && <div>
            <label className="block text-sm font-medium text-gray-700 items-center" >
              Filter by Status
            </label>
            <div className='flex items-center'>
              <Checkbox className="mt-2" checked={onlyActive} id="active" onCheckedChange={(checked : boolean) => setOnlyActive(checked)}/>
              <label className="cursor-pointer text-sm mt-2 ml-2">
                Active only
              </label>
            </div>
          </div>}
        </div>
      </div>
      </div>
    </div>
  );
};

export default EventFilter;