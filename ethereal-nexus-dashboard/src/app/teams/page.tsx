import React from "react";
import { TeamsDataTable } from "@/components/teams/teams-data-table/data-table";

export default async function Teams() {
  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">Manage your teams here!</p>
        </div>
      </div>
      <TeamsDataTable />
    </div>
  );
}
