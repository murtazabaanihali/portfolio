"use client";

import useSWR, { type Fetcher, type Key, type SWRConfiguration } from "swr";
import useSWRInfinite, { type SWRInfiniteFetcher, type SWRInfiniteKeyLoader } from "swr/infinite";

const defaults = { revalidateOnFocus: false };

export function useAppSWR<Data, K extends Key>(
    key: K,
    fetcher: Fetcher<Data, K>,
    options?: SWRConfiguration<Data, Error, Fetcher<Data, K>>,
) {
    return useSWR<Data, Error, K>(key, fetcher, { ...defaults, ...options });
}

export function useAppSWRInfinite<Data, K extends SWRInfiniteKeyLoader<Data>>(
    getKey: K,
    fetcher: SWRInfiniteFetcher<Data, K>,
) {
    return useSWRInfinite<Data, Error, K>(getKey, fetcher, {
        ...defaults,
        revalidateFirstPage: false,
    });
}
