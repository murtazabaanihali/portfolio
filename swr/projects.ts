"use client";

import { useState } from "react";
import { getProjectBySlug, getProjects } from "@/actions";
import type { ProjectTag } from "@/lib/db/schema";
import { useAppSWR, useAppSWRInfinite } from "./index";

type Page = Awaited<ReturnType<typeof getProjects>>;

export function useProjects() {
    const [tag, onTag] = useState<ProjectTag>();
    const getKey = (index: number, previous: Page | null) =>
        index && !previous?.more ? null : ["projects", index + 1, tag] as const;
    const { data, error, isLoading, isValidating, size, setSize } =
        useAppSWRInfinite<Page, typeof getKey>(getKey, ([, page, filter]) => getProjects(page, filter));
    const more = data?.at(-1)?.more;
    return {
        data: { projects: data?.flatMap(page => page.projects), more },
        isLoading, isValidating, isLoadingMore: !!data && size > data.length && !error, error, tag, onTag,
        loadMore: () => { if (more && !isValidating) void setSize(size => size + 1); },
    };
}

export function useProjectDetails(slug: string) {
    return useAppSWR(["project", slug] as const, ([, id]) => getProjectBySlug(id));
}
