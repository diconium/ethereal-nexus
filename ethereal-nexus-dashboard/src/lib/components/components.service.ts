import mongooseDb, { Collection } from "@/lib/mongodb";
import { Component } from "@/app/api/v1/components/model";

export const getAllComponents = async (): Promise<Component[]> => {
  const db = await mongooseDb();

  return (await db
    .collection(Collection.COMPONENTS)
    .aggregate([
      {
        $project: {
          _id: { $toString: "$_id" },
          name: 1,
          title: 1,
          version: 1,
        },
      },
    ])
    .toArray()) as Component[];
};

export const getAllDistinctComponents = async () => {
  const db = await mongooseDb();

  return (await db
    .collection(Collection.COMPONENTS)
    .aggregate([
      {
        $group: {
          _id: "$name",
          name: { $first: "$name" },
        },
      },
    ])
    .toArray()) as Component[];
};


export const getComponentsByNames = async (names: string[]): Promise<Component[]> => {
    const db = await mongooseDb();

    return await db
        .collection(Collection.COMPONENTS)
        .aggregate([
            {
                $match: {
                    name: {
                        $in: names
                    }
                }
            },
            {
                $project: {
                    _id: {$toString: '$_id'},
                    name: 1,
                    title: 1,
                    version: 1,
                    dialog: 1
                }
            },
        ])
        .toArray() as Component[];
}
