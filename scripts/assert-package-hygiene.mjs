import { lstat, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FORBIDDEN_ASSET_NAME = /^(?:Cloud[A-Za-z0-9]*|ComfyCloud[A-Za-z0-9]*|comfy-(?:cloud|logo)|OAuth[A-Za-z0-9]*|onboardingCloudRoutes|cloudFeedbackTopbarButton|useCloudAuthPage|useSubscriptionDialog|vendor-firebase|firebaseIdentity|SignInContent|SignUpForm|UserPanel|UserSelectView|CreditsPanel|Subscription(?:Required|Inactive|Transition|Cancellation)[A-Za-z0-9]*|CancelSubscriptionDialogContent|SubscribeToRun|ApiNodesSignInContent|CurrentUserPopoverWorkspace|WorkspaceSwitcherPopover|(?:partner|api|cloud|account)[-_]?(?:nodes[-_]?)?(?:sign[-_]?in|login)|(?:Create|Delete|Edit|Leave|TeamWorkspaces|SetMemberCreditLimit|InviteMember|InviteMemberUpsell|RevokeInvite|RemoveMember|ChangeMemberRole|DowngradeRemoveMembers)DialogContent)(?:[-.])/i
const FORBIDDEN_DESTINATIONS = [
  /(?:https?|wss?):\/\/(?:[a-z0-9-]+\.)*comfy\.org\b/gi,
  /https?:\/\/[^\s"'`]*\.firebaseapp\.com\b/gi,
  /https?:\/\/[^\s"'`]*\.firebaseio\.com\b/gi,
  /https?:\/\/(?:identitytoolkit|securetoken)\.googleapis\.com\b/gi
]
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.txt'
])

async function walkFiles(root) {
  const files = []
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) pending.push(absolutePath)
      else if (entry.isFile()) files.push(absolutePath)
      else if (entry.isSymbolicLink()) {
        const target = await lstat(absolutePath)
        if (target.isFile()) files.push(absolutePath)
      }
    }
  }
  return files
}

export async function inspectWorkflowFrontend(rootPath) {
  const root = path.resolve(rootPath)
  const files = (await walkFiles(root)).sort()
  const relative = (file) => path.relative(root, file).replaceAll('\\', '/')
  const sourceMaps = files.filter((file) => file.toLowerCase().endsWith('.map'))
  const forbiddenAssets = files.filter((file) =>
    FORBIDDEN_ASSET_NAME.test(path.basename(file))
  )
  const forbiddenDestinations = []
  const sourceMapReferences = []
  let hasBridge = false

  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue
    const content = await readFile(file, 'utf8')
    if (content.includes('hyper-studio:request-workflow')) hasBridge = true
    if (/sourceMappingURL\s*=/.test(content)) {
      sourceMapReferences.push(relative(file))
    }
    for (const pattern of FORBIDDEN_DESTINATIONS) {
      for (const match of content.matchAll(pattern)) {
        forbiddenDestinations.push({
          file: relative(file),
          destination: match[0]
        })
      }
    }
  }

  const result = {
    root,
    fileCount: files.length,
    hasBuildManifest: files.some(
      (file) => relative(file) === 'build-manifest.json'
    ),
    hasBridge,
    sourceMaps: sourceMaps.map(relative),
    sourceMapReferences,
    forbiddenAssets: forbiddenAssets.map(relative),
    forbiddenDestinations
  }
  result.ok =
    result.hasBuildManifest &&
    result.hasBridge &&
    result.sourceMaps.length === 0 &&
    result.sourceMapReferences.length === 0 &&
    result.forbiddenAssets.length === 0 &&
    result.forbiddenDestinations.length === 0
  return result
}

async function main(args) {
  if (args.length === 0) {
    throw new Error(
      'Usage: node scripts/assert-package-hygiene.mjs <workflow-frontend-root> [...]'
    )
  }

  let failed = false
  for (const root of args) {
    const result = await inspectWorkflowFrontend(root)
    const summary = {
      root: result.root,
      fileCount: result.fileCount,
      hasBuildManifest: result.hasBuildManifest,
      hasBridge: result.hasBridge,
      sourceMapCount: result.sourceMaps.length,
      sourceMapReferenceCount: result.sourceMapReferences.length,
      forbiddenAssetCount: result.forbiddenAssets.length,
      forbiddenDestinationCount: result.forbiddenDestinations.length
    }
    console.log(JSON.stringify(summary))
    if (!result.ok) {
      failed = true
      console.error(
        JSON.stringify(
          {
            root: result.root,
            sourceMaps: result.sourceMaps.slice(0, 20),
            sourceMapReferences: result.sourceMapReferences.slice(0, 20),
            forbiddenAssets: result.forbiddenAssets.slice(0, 20),
            forbiddenDestinations: result.forbiddenDestinations.slice(0, 20)
          },
          null,
          2
        )
      )
    }
  }
  if (failed) process.exitCode = 1
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
