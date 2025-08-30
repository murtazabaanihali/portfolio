import { useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";

import { getProjects } from "@/actions";
import { ProjectTag } from "@/lib/db/schema";

export const useProjects = (
    firstPage?: Awaited<ReturnType<typeof getProjects>>
) => {
    const [tag, setTag] = useState<ProjectTag | undefined>();

    const getKey = (pageIndex: number, previousPageData: any) => {
        if (pageIndex === 0) return ["projects", 1, tag];
        if (!previousPageData?.more) return null;
        return ["projects", pageIndex + 1, tag];
    };

    const fetcher = ([key, pageNumber, tag]: any) => {
        return getProjects(pageNumber, tag);
    };

    const { data, isLoading, isValidating, size, setSize } =
        useSWRInfinite(getKey, fetcher, {
            revalidateOnFocus: false,
            revalidateFirstPage: false,
            fallbackData: firstPage ? [firstPage] : undefined,
        });

    const flattenedData = useMemo(() => {
        const projects = data
            ? data.flatMap((page) => page?.projects || [])
            : undefined;
        const lastPage = data && data.length > 0 ? data[data.length - 1] : null;

        return {
            projects,
            more: lastPage?.more ?? null,
        };
    }, [data]);

    const loadMore = () => {
        if (!flattenedData?.more || size === 0) return;
        setSize((prev) => prev + 1);
    };

    const onTag = (tag?: ProjectTag) => {
        setTag(tag);
        setSize(1);
    };

    return {
        data: flattenedData,
        isLoading,
        isValidating,
        loadMore,
        onTag,
        tag,
    };
};
