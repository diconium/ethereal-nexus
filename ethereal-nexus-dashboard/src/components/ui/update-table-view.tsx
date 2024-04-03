"use client"

import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/projects/table/columns';
import React, { useEffect, useState } from 'react';
import { useViewMode } from '@/components/components/projects/ProjectsViewProvider';
import { ProjectMemberList } from '@/components/projects/members-table/member-list';
import { getMembersByResourceId } from '@/data/member/actions';
import { getUsers } from '@/data/users/actions';
import { auth } from '@/auth';
import { getProjectById } from '@/data/projects/actions';

export function UpdateTableView({ projects}) {
  const { viewMode } = useViewMode();

  return (
    <>
      {viewMode === 'list' ? (

          projects.success ?
            <DataTable
              colWidth
              entity={'projects'}
              columns={columns}
              data={projects.data}
              isShowViewOpt={false}
            /> :
            projects.error.message

        ) :
        <div className="bg-white border border-gray-300 rounded-lg max-w-xs w-full h-70 p-3">
          {projects.success ? (
            projects.data.map((project) => (
              <div key={project.id} className="card">
                <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 max-w-xs h-36 rounded-md"></div>
                <span className="text-xs">{project.description}</span>
                <h3 className="font-bold">{project.name}</h3>
                <div className="border-t border-gray-200 my-2 opacity-40"></div>
                <div className="flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="text-xs">Components</div>
                    <div className="text-orange-500 text-base font-bold">{project.components.length}</div>
                  </div>
                  <div className="mx-4 border-r border-gray-200 h-10 opacity-40"></div>
                  <div className="flex flex-col items-center">
                    <div className="text-xs">Project Members</div>
                    <div className="text-orange-500 text-base font-bold">{project.membersLength}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>{projects.error.message}</p>
          )}
        </div>

      }
    </>
  );
}

