import {z} from "zod";

export const UserRegistrationRequestSchema = z.object({
    email: z.email(),
    password: z.string(),
    firstName: z.string().max(20),
    lastName: z.string().max(20),
    privileges: z.never().optional(),
    phone: z.string().optional(),
});

export type UserRegistrationRequest = z.infer<typeof UserRegistrationRequestSchema>; 

