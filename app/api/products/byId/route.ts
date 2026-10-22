import { ProductStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { isPrivileged } from "@/utils/authentication";
import { NextRequest, NextResponse } from "next/server";
import { ca } from "zod/locales";

export async function GET(request: NextRequest){

    const id = request.nextUrl.searchParams.get("id")

    if(id === null){
        return NextResponse.json("Product ID is required", { status: 400 })
    }

    try{

        const product = await prisma.product.findUnique({
            where: {
                id: id
            }
        })

        if(product === null){
            return NextResponse.json("Product not found", { status: 404 })
        }

        if(product.status == ProductStatus.DELETED){
            return NextResponse.json("Product not found", { status: 404 })
        }

        if(product.status == ProductStatus.INACTIVE){
        
            const hasPrivileges = await isPrivileged(request , "product:read")

            if(!hasPrivileges){
                return NextResponse.json("Product not found", { status: 404 })
            }
        }

        return NextResponse.json(product, { status: 200 })

    }catch(error){
        console.error("Error fetching product by ID:", error);
        return NextResponse.json("Internal server error", { status: 500 })
    }
}