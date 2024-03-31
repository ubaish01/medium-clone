import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Hono } from 'hono';
import { verify } from 'hono/jwt'
import { createBlogInput, updateBlogInput } from '@ubaish/common-app'

type Variables = {
    userId: string,
    prisma: any
}

// Create the main Hono app
export const bookRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string,
    },
    Variables: Variables
}>();

bookRouter.use("*", async (c, next) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    c.set('prisma', prisma);
    await next();

})

bookRouter.use("*", async (c, next) => {
    const jwt = c.req.header("Authorization");
    if (!jwt) {
        c.status(401)
        return c.json({ error: "Unauthorized" });
    }

    const token = jwt.split(" ")[1];

    const payload = await verify(token, c.env.JWT_SECRET);

    if (!payload) {
        c.status(401)
        return c.json({ error: "Unauthorized" });
    }

    c.set("userId", payload.id);

    await next();
})



// ROUTES STARTING FROM HERE....

//CREATE
bookRouter.post('/', async (c) => {
    const userId = c.get('userId');
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const body = await c.req.json();

    const {success} = createBlogInput.safeParse(body);
    if (!success) {
        return c.json({
            success: true,
            message: "Input not valid"
        })
    }

    const newPost = await prisma.post.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: userId
        }
    })

    c.status(201);;
    c.json({
        message: "post created successfully",
        post: newPost
    })

    return c.json({
        success: true,
        message: "post created successfully",
        post: newPost
    })
})

//UPDATE
bookRouter.put('/', async (c) => {
    const body = await c.req.json();
    const prisma = c.get("prisma");
    const userId = c.get("userId");

    const {success} = updateBlogInput.safeParse(body);
    if (!success) {
        return c.json({
            success: true,
            message: "Input not valid"
        })
    }

    const updatedPost = await prisma.post.update({
        where: {
            id: body.id,
            authorId: userId
        },
        data: {
            title: body.title,
            content: body.content
        }
    })
    return c.json({
        success: true,
        message: "Post updated successfully",
        post: updatedPost
    })
})

// FETCH ONE 
bookRouter.get('/blog/:id', async (c) => {
    const id = c.req.param('id')
    const prisma = c.get('prisma');
    const post = await prisma.post.findFirst({
        where: {
            id
        }
    })

    const response = {
        success: true,
        post
    }

    return c.json(response);
})

// FETCH ALL 
bookRouter.get('/bulk', async (c) => {
    const prisma = c.get('prisma');
    const books = await prisma.post.findMany({});
    return c.json({ success: true, books })

})
