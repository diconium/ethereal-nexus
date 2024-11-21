"use client"

import React from 'react';
import { type ProjectWithComponentId} from '@/data/projects/dto';

type ProjectCardProps = {
  project: ProjectWithComponentId,
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { description, name , components, members } = project;

  return (
    <div
      className="bg-accent dark:bg-transparent border border-gray-300 dark:border-opacity-40 rounded-lg w-full h-full p-4">
      <div className="card ">
        <div
          className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 h-36 lg:h-44 rounded-md"></div>
        { description && <p className="text-xs mt-2">{description}</p> }
        <h3 className="font-bold my-1">{name}</h3>
        <div className="border-t border-gray-200 my-4 dark:opacity-40"></div>
        <div className="flex items-center justify-evenly gap-4">
          <div className="flex flex-col items-center">
            <p className="text-xs">Components</p>
            <p className="text-orange-500 text-base font-bold">{components.length}</p>
          </div>
          {
            members ? (
              <>
                <div className="border-r border-gray-200 h-10 dark:opacity-40"></div>
                <div className="flex flex-col items-center">
                  <p className="text-xs">Project Members</p>
                  <p className="text-base font-bold">{members}</p>
                </div>
              </>
            ) : null
          }
        </div>
      </div>
    </div>
  );
}
