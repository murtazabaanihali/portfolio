import useSWR from "swr";
import { useEffect, useState } from "react";

import type { Project } from "@/lib/db/queries";
import { getProjects } from "@/actions";

const fetcher = (page: number, tag?: string) => getProjects(page, tag as any);

export function useProjects(initialData?: any, tag?: string) {
    const [pageNumber, setPageNumber] = useState(1);

    const { data, error, isLoading } = useSWR(
        pageNumber === 0 ? null : ["projects", pageNumber, tag],
        () => fetcher(pageNumber, tag),
        {
            fallbackData: pageNumber === 1 ? initialData : undefined,
            revalidateOnFocus: false,
        }
    );

    let accumulatedProjects: Project[] = [];
    if (initialData?.projects) accumulatedProjects = [...initialData.projects];
    if (pageNumber > 1 && data?.projects) {
        accumulatedProjects = [...accumulatedProjects, ...data.projects];
    }

    function loadMore() {
        if (!isLoading && pageNumber !== 0 && data?.more) {
            setPageNumber((prev) => prev + 1);
        } else {
            setPageNumber(0);
        }
    }

    useEffect(() => {
        setPageNumber(1);
    }, [tag]);

    return {
        _projects: accumulatedProjects,
        more: data?.more,
        isLoading,
        error,
        loadMore,
    };
};