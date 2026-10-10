import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/contexts/ProjectContext";

import { unwrapApiResult, type ApiResult } from "../lib/unwrapApiResult";
import { useExploreRuntime } from "../runtime/ExploreRuntime";
import { assetQueryKeys } from "./assetQueryKeys";
import { invalidateAffectedGenerationQueries } from "./generationQueryKeys";

export function useCreateFeatureGeneration<TBody, TData>(
  create: (
    api: ReturnType<typeof useExploreRuntime>["api"],
    body: TBody,
  ) => Promise<ApiResult<TData>>,
) {
  const { api } = useExploreRuntime();
  const { generationProjectId } = useProjects();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: TBody) => {
      if (!generationProjectId) throw new Error('Choose a project before generating.');
      const request = generationProjectId && body && typeof body === 'object'
        ? { ...body, projectId: generationProjectId } as TBody
        : body;
      return unwrapApiResult(await create(api, request));
    },
    onSuccess: () => {
      invalidateAffectedGenerationQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: assetQueryKeys.all });
    },
  });
}
