import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { cookie } from "@elysiajs/cookie";

export const authMiddleware = new Elysia({ name: "authMiddleware" })
    .use(
        jwt({
            name: "jwt",
            secret: process.env.JWT_SECRET || "sis-secret-key-2026",
        })
    )
    .use(cookie())
    .derive(async ({ jwt, cookie: { session } }: any) => {
        if (!session?.value) {
            return { user: null };
        }

        try {
            const user = await jwt.verify(session.value);
            if (!user) {
                return { user: null };
            }
            return { user };
        } catch (error) {
            return { user: null };
        }
    })
    .macro({
        requireAuth(enabled: boolean) {
            return {
                async beforeHandle({ user, set, jwt, cookie: { session } }: any) {
                    let currentUser = user;
                    if (!currentUser && session?.value) {
                        currentUser = await jwt.verify(session.value);
                    }

                    if (enabled && !currentUser) {
                        set.status = 401;
                        return { error: "Unauthorized" };
                    }
                }
            }
        },
        requireRoles(roles: string[]) {
            return {
                async beforeHandle({ user, set, jwt, cookie: { session } }: any) {
                    let currentUser = user;
                    if (!currentUser && session?.value) {
                        currentUser = await jwt.verify(session.value);
                    }

                    if (!currentUser) {
                        set.status = 401;
                        return { error: "Unauthorized" };
                    }

                    if (!roles.includes(currentUser.role as string)) {
                        set.status = 403;
                        return { error: "Forbidden: You do not have the required permissions" };
                    }
                }
            }
        }
    });

export const createAuthMiddleware = () => new Elysia({ name: "authMiddleware-" + Date.now() })
    .use(
        jwt({
            name: "jwt",
            secret: process.env.JWT_SECRET || "sis-secret-key-2026",
        })
    )
    .use(cookie())
    .derive(async ({ jwt, cookie: { session } }: any) => {
        if (!session?.value) {
            return { user: null };
        }

        try {
            const user = await jwt.verify(session.value);
            if (!user) {
                return { user: null };
            }
            return { user };
        } catch (error) {
            return { user: null };
        }
    })
    .macro({
        requireAuth(enabled: boolean) {
            return {
                beforeHandle({ user, set }: any) {
                    if (enabled && !user) {
                        set.status = 401;
                        return { error: "Unauthorized" };
                    }
                }
            }
        },
        requireRoles(roles: string[]) {
            return {
                beforeHandle({ user, set }: any) {
                    if (!user) {
                        set.status = 401;
                        return { error: "Unauthorized" };
                    }

                    if (!roles.includes(user.role as string)) {
                        set.status = 403;
                        return { error: "Forbidden: You do not have the required permissions" };
                    }
                }
            }
        }
    });
