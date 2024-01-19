// import mongoDb, { Collection } from "@/lib/mongodb";
// import { ObjectId } from "mongodb";
import { Project } from '@/app/api/v1/projects/model';

export const getAllProjects = async (): Promise<Project[]> => {
  // FIXME: call action
  return [];
  // return (await db
  //   .collection(Collection.PROJECTS)
  //   .aggregate([
  //     {
  //       $project: {
  //         _id: { $toString: "$_id" },
  //         name: 1,
  //         description: 1,
  //         components: 1,
  //       },
  //     },
  //   ])
  //   .toArray()) as Project[];
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  // FIXME: Call action
  // const results = (await db
  //   .collection(Collection.PROJECTS)
  //   .aggregate([{ $match: { _id: new ObjectId(id) } }])
  //   .toArray()) as Project[];
  //
  // return results?.length ? results[0] : null;
  return null;
};
