"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

interface User {
    id: string;
    email: string;
    role: "admin" | "encoder";
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const queryClient = useQueryClient();

    const fetchUser = async () => {
        try {
            const data = await authApi.me();

            if (data && !data.error) {
                setUser(data);

                const currentPath = window.location.pathname;
                if (currentPath === "/login") {
                    router.push("/dashboard");
                }
                return data;
            } else {
                setUser(null);
                const currentPath = window.location.pathname;
                if (currentPath.startsWith("/dashboard")) {
                    router.push("/login");
                }
                return null;
            }
        } catch (error) {
            setUser(null);
            const currentPath = window.location.pathname;
            if (currentPath.startsWith("/dashboard")) {
                router.push("/login");
            }
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Only run on mount
    useEffect(() => {
        fetchUser();
    }, []);

    // Also handle redirection if user state changes
    useEffect(() => {
        if (!loading) {
            if (!user && pathname.startsWith("/dashboard")) {
                router.push("/login");
            } else if (user && pathname === "/login") {
                router.push("/dashboard");
            }
        }
    }, [user, loading, pathname, router]);

    const logout = async () => {
        await authApi.logout();
        queryClient.clear(); // Clear all cached data
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAuthenticated: !!user,
            logout,
            refreshUser: fetchUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
