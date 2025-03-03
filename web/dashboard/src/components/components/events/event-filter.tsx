"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { addDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Component } from '@/data/components/dto';

interface EventFilterComponentProps {
  isComponentView: boolean;
  components: Component[];
}

const EventFilter: React.FC<EventFilterComponentProps> = ({isComponentView, components}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [date, setDate] = React.useState<DateRange | undefined>()
  const [component, setComponent] = React.useState<string | undefined>()
  const [user, setUser] = React.useState<string | undefined>()
  
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

    router.push(`${pathname}?tab=activity&${params.toString()}`);  
  }

  return (
    <div className="">
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
          <input onChange={(e) => setComponent(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm p-2" id="user-filter" placeholder="Component name" type="text"/>
        </div>}
        <div>
          <label className="block text-sm font-medium text-gray-700" >
          Filter by User
          </label>
          <input onChange={(e) => setUser(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2" id="user-filter" placeholder="Username" type="text"/>
        </div>
        <div className='mb-6 w-xl'>
          <Button onClick={applyFilter} className="m-6 p-2 border rounded">Apply Filter</Button>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default EventFilter;