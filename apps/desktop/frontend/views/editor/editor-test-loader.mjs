// Resolve extensionless TypeScript imports used by the Editor modules under Node's type stripper.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error
    for (const suffix of ['.ts', '.tsx', '/index.ts']) {
      try {
        return await nextResolve(specifier + suffix, context)
      } catch {
        // Try the next TypeScript source extension.
      }
    }
    throw error
  }
}
