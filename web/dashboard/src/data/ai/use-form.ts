import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldValues, useForm as useHookForm } from "react-hook-form";
import { chatSchema } from "./chat-schema";

export const useForm = <T>() => {
    return useHookForm({
        resolver: zodResolver(chatSchema),
    });
};
