import prisma from "@/lib/prisma";
import { UserRegistrationRequestSchema } from "@/types/dto/UserRegistraionRequest";
import { UserSelfUpdateRequestSchema } from "@/types/dto/UserSelfUpdateRequest";
import { UserUpdatedByAdminRequestSchema } from "@/types/dto/UserUpdateByAdminRequest";
import { getUser, isPrivileged } from "@/utils/authentication";
import getPaginationInfo from "@/utils/pageInfoRetrieval";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: NextRequest) {

    const havePrivilege = await isPrivileged(request, "users:read")

    if(!havePrivilege){

        return NextResponse.json(
            {
            message : "You do not have the privilege to access this resource"
            },
            {
                status : 403
            }
        )
    }

    const params = getPaginationInfo(request)

    const userCount = await prisma.user.count()

    const totalPages = Math.ceil(userCount/params.pageSize)

    if (params.pageNumber > totalPages) {
        return NextResponse.json(
            {
                message : "Page number exceeds total pages",
                totalPages : totalPages
            },
            {
                status : 400
            }
        )
    }

    const users = await prisma.user.findMany({
        skip: (params.pageNumber - 1) * params.pageSize,
        take: params.pageSize,
        select : {
            id : true,
            email : true,
            phone : true,
            firstName : true,
            lastName : true,
            password : false,
            role : true,
            status : true,
            createdAt : true,
            lastLogin : true,
            privileges : true,

        }
    })



    return NextResponse.json(
        {
            message : "Users fetched successfully",
            data : users,
            pagination : {
                pageNumber : params.pageNumber,
                pageSize : params.pageSize,
                totalPages : totalPages,
                totalCount : userCount
            }
        }
    )
}

export async function POST(request: NextRequest) {

    //email, password, firstName, lastName, phone(optional)

    const body =  await request.json();

    //validate the request body using zod

    try{

        const parsedBody = UserRegistrationRequestSchema.parse(body)

        const existingUser =  await prisma.user.findUnique({
            where : {
                email : parsedBody.email
            }
    })

        if(existingUser!=null){
            return NextResponse.json(
                {
                message : "User with this email already exists"
                },
                {
                    status : 409
                }
            )
        }

        const passwordHash = await bcrypt.hash(body.password, 12)

        await prisma.user.create({
            data : {
                email : body.email,
                firstName : body.firstName,
                lastName : body.lastName,
                password : passwordHash,
                phone : body.phone
            }
        })

        return NextResponse.json(
            {
            message : "User created successfully"
            },
            {
                status : 201
            }
        )
    }catch(error){

        if(error instanceof z.ZodError){

            //console.log(error.issues[0]?.message ?? "Invalid input")

            return NextResponse.json(
                {
                    message : error.issues[0]?.message ?? "Invalid input"

                },
                {
                    status : 400
                }
            )

        }

        console.log(error)
        return NextResponse.json(
            {
                message : "Invalid request body"
            },
            {
                status : 400
            }
        )
    }

}

export async function PUT(request: NextRequest) {

    const id = request.nextUrl.searchParams.get("id")

    const requestedUser = await getUser(request)

    if(requestedUser==null){
        return NextResponse.json(
            {
            message : "You are not logged in. Please login to continue."
            },
            {
                status : 401
            }
        )
    }

    try{

        const body =  await request.json();

    if(requestedUser.id == id){

        // never allow users to update their own role, status, privileges

        UserSelfUpdateRequestSchema.parse(body)

        const user = await prisma.user.findUnique({
            where : {
                id : id
            }
        })

        if(user==null){
            return NextResponse.json(
                {
                message : "User not found"
                },
                {
                    status : 404
                }
            )
        }

        await prisma.user.update({

            where : {
                id : id
            },
            data : {

                email : body.email || user.email,
                firstName : body.firstName || user.firstName,
                lastName : body.lastName || user.lastName,
                phone : body.phone || user.phone,
                profileImage : body.profileImage || user.profileImage,
            }
        })

        return NextResponse.json(
            {
                message : "User updated successfully"
            },
            {
                status : 200
            }

        )
        
    }else{

        // User is trying to update someone else's account. Check if they have the privilege.

        const havePrivilege = await isPrivileged(request, "users:edit")

        if(!havePrivilege){

            return NextResponse.json(
                {
                message : "You do not have the privilege to access this resource"
                },
                {
                    status : 403
                }
            )
        }

        UserUpdatedByAdminRequestSchema.parse(body)

        const user = await prisma.user.findUnique({
            where : {
                id : id||"000000"
            }
        })

        if(user==null){
            return NextResponse.json(
                {
                message : "User not found"
                },
                {
                    status : 404
                }
            )
        }

        await prisma.user.update({

            where : {
                id : id||"000000"
            },
            data : {
                email : body.email || user.email,
                firstName : body.firstName || user.firstName,
                lastName : body.lastName || user.lastName,
                phone : body.phone || user.phone,
                profileImage : body.profileImage || user.profileImage,
                role : body.role || user.role,
                status : body.status || user.status,
                privileges : body.privileges || user.privileges
            }
        })

        return NextResponse.json(
            {
                message : "User updated successfully"
            },
            {
                status : 200
            }

        )

    }
    

    }catch(error)
    {
        if(error instanceof z.ZodError){
            return NextResponse.json(
                {
                    message : error.issues[0]?.message ?? "Invalid input"
                    
                },
                {
                    status : 400
                }
            )
        }

        console.log(error)
        return NextResponse.json(
            {
                message : "Server error"
            },
            {
                status : 500
            }
        )

    }


}