"use client"

import React from 'react';

type Components = {
  component_id: string,
}

type ProjectCardProps = {
  project: {
    components: Components[],
    name: string,
    description: string,
    id: string,
    membersLength: number,
  }
}
export function ProjectCard({ project }: ProjectCardProps) {
  const { description, name , components, membersLength } = project;

  return (
    <div
      className="bg-accent dark:bg-transparent border border-gray-300 dark:border-opacity-40 rounded-lg w-full h-full p-3">
      <div className="card ">
        <div
          className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 h-36 lg:h-44 rounded-md"></div>
        <p className="text-xs mt-2">{description}</p>
        <h3 className="font-bold my-1">{name}</h3>
        <div className="border-t border-gray-200 my-4 dark:opacity-40"></div>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <p className="text-xs">Components</p>
            <p className="text-orange-500 text-base font-bold">{components.length}</p>
          </div>
          <div className="mx-4 border-r border-gray-200 h-10 dark:opacity-40"></div>
          <div className="flex flex-col items-center">
            <p className="text-xs">Project Members</p>
            <p className="text-base font-bold">{membersLength}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
