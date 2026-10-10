import type { CustomHttpMapping } from '../../shared/electron-api-schema'

export function validateCustomHttpMapping(mapping: CustomHttpMapping): string | null {
  if (!mapping.submitPath.trim()) return 'Enter the submit path.'
  if (!mapping.requestFields.prompt.trim() || !mapping.requestFields.model.trim()) return 'Map both prompt and model request fields.'
  if (!mapping.response.outputPath.trim()) return 'Map the output URL or file field.'
  if (mapping.auth.mode === 'header' || mapping.auth.mode === 'query') {
    if (!mapping.auth.name?.trim()) return 'Enter the authentication header or query parameter name.'
  }
  if (mapping.response.mode === 'async') {
    if (!mapping.response.jobIdPath?.trim()) return 'Map the submitted job ID field.'
    if (!mapping.response.pollPath?.trim()) return 'Enter a polling path containing {jobId}.'
    if (!mapping.response.pollPath.includes('{jobId}')) return 'The polling path must include {jobId}.'
    if (!mapping.response.statusPath?.trim()) return 'Map the polled status field.'
    if (!mapping.response.completeValues?.length) return 'Enter at least one completion status.'
    if (!mapping.response.failureValues?.length) return 'Enter at least one failure status.'
  }
  return null
}
