import { useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";

import { getProjectBySlug, getProjects } from "@/actions";
import { ProjectTag } from "@/lib/db/schema";
import useSWR from "swr";

type ProjectsData = Awaited<ReturnType<typeof getProjects>>;

export const useProjects = (initialData?: ProjectsData) => {
    const [tag, setTag] = useState<ProjectTag | undefined>();

    const getKey = (pageIndex: number, previousPageData: any) => {
        if (pageIndex === 0) return ["projects", 1, tag];
        if (!previousPageData?.more) return null;
        return ["projects", pageIndex + 1, tag];
    };

    const fetcher = ([key, pageNumber, tag]: any) => {
        return getProjects(pageNumber, tag);
    };

    const { data, isLoading, isValidating, size, setSize, mutate } =
        useSWRInfinite(getKey, fetcher, {
            fallbackData: initialData && !tag ? [initialData] : undefined,
            revalidateOnFocus: false,
            revalidateFirstPage: false,
        });

    const flattenedData = useMemo(() => {
        const sourceData = data || (initialData && !tag ? [initialData] : undefined);
        const projects = sourceData
            ? sourceData.flatMap((page) => page?.projects || [])
            : undefined;
        const lastPage = sourceData && sourceData.length > 0 ? sourceData[sourceData.length - 1] : null;

        return {
            projects,
            more: lastPage?.more ?? null,
        };
    }, [data, initialData, tag]);

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

export const useProjectDetails = (slug: string) => {
    const { data, isLoading } = useSWR(
        `project-details:${slug}`,
        () => getProjectBySlug(slug),
        { revalidateOnFocus: false, revalidateFirstPage: false },
    );

    return { data, isLoading };
};
