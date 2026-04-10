'use client';

import { useAuth, useUser } from "@clerk/nextjs";

export const useSubscription = () => {
    const { isLoaded: isAuthLoaded } = useAuth();
    const { isLoaded: isUserLoaded } = useUser();

    const isLoaded = isAuthLoaded && isUserLoaded;

    return {
        isLoaded
    };
};
