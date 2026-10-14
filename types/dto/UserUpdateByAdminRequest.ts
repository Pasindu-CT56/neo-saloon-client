import z from "zod";

export const UserUpdatedByAdminRequestSchema = z.object({
    id : z.never().optional(),
    password : z.never().optional(),
})

export type UserUpdatedByAdminRequest = z.infer<typeof UserUpdatedByAdminRequestSchema>;