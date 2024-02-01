import { inspect } from "node:util";

// XXX: should it be this module's job to convert timestamps from strings to
// Dates? Currently it does not, and leaves that to the caller.

// for debugging purposes, this can be useful, as it will return information
// about the request that was made:
// const GRAPHQL_URI = "https://httpbingo.org/anything";
const GRAPHQL_URI = "https://api.render.com/graphql";

export class RequestError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
  }
}

/**
 * @param {string?} token
 * @param {Object} body
 */
async function req(token, body) {
  /** @type {Record<string, string>} */
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(GRAPHQL_URI, {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers: headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new RequestError(
      `error with request ${inspect(body)}:\n${inspect(errorBody)}`
    );
  }
  const resBody = /** @type {{errors: string[], data: any}} */ (
    await res.json()
  );
  if (!resBody || resBody?.errors) {
    throw new RequestError(
      `Request failure: ${JSON.stringify(resBody.errors)}`
    );
  }
  return resBody;
}

/**
 * @typedef {`usr-${string}`} UserID
 */

/**
 * @typedef {Object} User
 * @property {UserID} id
 * @property {boolean} active?
 * @property {string} createdAt?
 * @property {string} email
 * @property {string} githubId?
 * @property {string} gitlabId?
 * @property {string} googleId?
 * @property {string} name?
 * @property {string} notifyOnPrUpdate?
 * @property {boolean} otpEnabled?
 * @property {boolean} passwordExists?
 * @property {string} tosAcceptedAt?
 * @property {string} intercomEmailHMAC?
 * @property {string} __typename
 * @property {string} sudoModeExpiresAt?
 */

/**
 * @typedef {Object} Login
 * @property {string} idToken
 * @property {string} expiresAt
 * @property {User} user
 */

/**
 * Sign a user in - does not handle TOTP
 *
 * @param {string} user
 * @param {string} pass
 * @returns {Promise<Login>} the user object, their id token, and an expiry
 */
export async function signIn(user, pass) {
  const body = await req(null, {
    operationName: "signIn",
    variables: {
      email: user,
      password: pass,
    },
    query:
      "mutation signIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    ...authResultFields\n    __typename\n  }\n}\n\nfragment authResultFields on AuthResult {\n  idToken\n  expiresAt\n  user {\n    ...userFields\n    sudoModeExpiresAt\n    __typename\n  }\n  readOnly\n  __typename\n}\n\nfragment userFields on User {\n  id\n  active\n  createdAt\n  email\n  featureFlags\n  githubId\n  gitlabId\n  googleId\n  name\n  notifyOnPrUpdate\n  otpEnabled\n  passwordExists\n  tosAcceptedAt\n  intercomEmailHMAC\n  __typename\n}\n",
  });

  return body.data.signIn;
}

/**
 * Sign a user in with TOTP
 *
 * @param {string} token - the token from signIn
 * @param {string} totpcode - the user's TOTP code
 * @returns {Promise<Login>} the user object, their id token, and an expiry
 */
export async function signInTOTP(token, totpcode) {
  const totpRes = await req(token, {
    operationName: "verifyOneTimePassword",
    variables: {
      code: totpcode,
    },
    query:
      "mutation verifyOneTimePassword($code: String!) {\n  verifyOneTimePassword(code: $code) {\n    ...authResultFields\n    __typename\n  }\n}\n\nfragment authResultFields on AuthResult {\n  idToken\n  expiresAt\n  user {\n    ...userFields\n    sudoModeExpiresAt\n    __typename\n  }\n  readOnly\n  __typename\n}\n\nfragment userFields on User {\n  id\n  active\n  createdAt\n  email\n  featureFlags\n  githubId\n  gitlabId\n  googleId\n  name\n  notifyOnPrUpdate\n  otpEnabled\n  passwordExists\n  tosAcceptedAt\n  intercomEmailHMAC\n  __typename\n}\n",
  });
  return totpRes.data.verifyOneTimePassword;
}

/**
 * @typedef {Object} Team
 * @property {TeamID} id
 * @property {string} name
 * @property {string} email
 * @property {string} __typename
 */

/**
 * Fetch the teams for a given user
 *
 * @param {string} token
 * @param {User} user
 * @returns {Promise<Team[]>} An array of Team objects for the given user
 */
export async function fetchTeams(token, user) {
  const body = await req(token, {
    operationName: "teamsForUserMinimal",
    variables: { userId: user.id },
    query:
      "query teamsForUserMinimal($userId: String!) {\n  teamsForUser(userId: $userId) {\n    id\n    name\n    email\n    __typename\n  }\n}\n",
  });
  return body.data.teamsForUser;
}

/**
 * @typedef {`tea-${string}`} TeamID
 */

/**
 * @typedef {Object} Owner
 * @property {TeamID} id
 * @property {string} __typename
 * @property {string} email?
 * @property {string} billingStatus? // "ACTIVE", what else?
 * @property {string[]} featureFlags?
 * @property {string} __typename
 */

/**
 * @typedef {Object} Env
 * @property {string} id
 * @property {string} name
 * @property {string} language
 * @property {boolean} isStatic
 * @property {string} sampleBuildCommand
 * @property {string} sampleStartCommand
 * @property {string} __typename
 */

/**
 * @typedef {Object} BuildPlan
 * @property {string} name
 * @property {string} cpu
 * @property {string} mem
 * @property {string} __typename
 */

/**
 * @typedef {`rgc-${string}`} RegistryCredentialID
 */

/**
 * @typedef {Object} ExternalImage
 * @property {string} imageHost
 * @property {string} imageName
 * @property {string} imageRef
 * @property {string} imageRepository
 * @property {string} imageURL
 * @property {string} ownerId
 * @property {RegistryCredentialID} registryCredentialId
 * @property {string} __typename
 */

/**
 * @typedef {Object} Region
 * @property {string} id
 * @property {string} description
 * @property {string} __typename
 */

/**
 * @typedef {`crn-${string}`} CronID
 */
/**
 * @typedef {Object} Cron
 * @property {CronID} id
 * @property {Env} env?
 * @property {any} repo? // TODO
 * @property {User} user
 * @property {Owner} owner
 * @property {string} name?
 * @property {string} slug?
 * @property {string} sourceBranch?
 * @property {string} buildCommand?
 * @property {string} buildFilter?
 * @property {BuildPlan} buildPlan?
 * @property {ExternalImage} externalImage?
 * @property {string} autoDeploy?
 * @property {string} userFacingType?
 * @property {string} userFacingTypeSlug?
 * @property {string} baseDir?
 * @property {string} dockerCommand?
 * @property {string} dockerfilePath?
 * @property {string} createdAt?
 * @property {string} updatedAt?
 * @property {string[]} outboundIPs?
 * @property {Region} region?
 * @property {string} registryCredential?
 * @property {string} rootDir?
 * @property {string} shellURL?
 * @property {string} state? // "Running", what else?
 * @property {string[]} suspenders?
 * @property {string} sshAddress?
 * @property {string} sshServiceAvailable? // "AVAILABLE", what else?
 * @property {string} lastDeployedAt?
 * @property {string} maintenanceScheduledAt?
 * @property {string} pendingMaintenanceBy?
 * @property {Environment} environment?
 * @property {string} __typename
 */

// The API seems to use "service" and "server" interchangeably
/**
 * @typedef {`srv-${string}`} ServerID
 */

/**
 * @typedef {Object} Server
 * @property {ServerID} id
 * @property {string} state // "Running", what else?
 * @property {string[]} suspenders
 * @property {string} __typename
 * @property {string} type?
 * @property {Env} env?
 * @property {any} repo? // TODO
 * @property {User} user
 * @property {Owner} owner
 * @property {string} name?
 * @property {string} slug?
 * @property {string} sourceBranch?
 * @property {string} buildCommand?
 * @property {string} buildFilter?
 * @property {BuildPlan} buildPlan?
 * @property {ExternalImage} externalImage?
 * @property {string} autoDeploy?
 * @property {string} userFacingType?
 * @property {string} userFacingTypeSlug?
 * @property {string} baseDir?
 * @property {string} dockerCommand?
 * @property {string} dockerfilePath?
 * @property {string} createdAt?
 * @property {string} updatedAt?
 * @property {string[]} outboundIPs?
 * @property {Region} region?
 * @property {string} registryCredential?
 * @property {string} rootDir?
 * @property {string} shellURL?
 * @property {string} state? // "Running", what else?
 * @property {string[]} suspenders?
 * @property {string} sshAddress?
 * @property {string} sshServiceAvailable? // "AVAILABLE", what else?
 * @property {string} lastDeployedAt?
 * @property {string} maintenanceScheduledAt?
 * @property {string} pendingMaintenanceBy?
 * @property {Environment} environment?
 * @property {Metrics} metrics?
 * @property {Bandwidth} bandwidthMB?
 */

/**
 * @typedef {Object} Database // TODO
 * @property {string} id
 * @property {string} __typename
 */

/**
 * @typedef {Object} Redis
 * @property {string} id
 * @property {string} status // "AVAILABLE" - what are the others?
 * @property {string[]} suspenders
 * @property {string} __typename
 */

/**
 * @typedef {`evm-${string}`} EnvironmentID
 */

/**
 * @typedef {Object} Environment
 * @property {EnvironmentID} id
 * @property {string} name
 * @property {Owner} owner?
 * @property {Array<Server|Cron>} services?
 * @property {Database[]} databases?
 * @property {Redis[]} redises?
 * @property {EnvGroup[]} envGroups?
 * @property {string} __typename
 */

/**
 * @typedef {`prj-${string}`} ProjectID
 */

/**
 * A type guard for project IDs
 *
 * @param {string|undefined} id
 * @returns {id is ProjectID}
 */
export function isProjectId(id) {
  return !!id?.startsWith("prj-");
}

/**
 * @typedef {Object} Project
 * @property {ProjectID} id
 * @property {string} name
 * @property {Owner} owner
 * @property {Environment[]} environments
 */

/**
 * Fetch the projects for a given team id
 *
 * @param {string} token
 * @param {string} teamId
 * @returns {Promise<Project[]>} An array of Team objects for the given user
 */
export async function fetchProjects(token, teamId) {
  const body = await req(token, {
    operationName: "projects",
    variables: { filter: { ownerId: teamId } },
    query:
      "query projects($filter: ProjectFilterInput!) {\n  projects(filter: $filter) {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    environments {\n      id\n      name\n      services {\n        id\n        state\n        suspenders\n        __typename\n      }\n      databases {\n        id\n        status\n        suspenders\n        __typename\n      }\n      redises {\n        id\n        status\n        suspenders\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n",
  });
  return body.data.projects;
}

/**
 * Fetch the projects for a given team id
 *
 * @param {string} token
 * @param {ProjectID} projectId
 * @returns {Promise<Project>} An array of Team objects for the given user
 */
export async function fetchProjectResources(token, projectId) {
  const body = await req(token, {
    operationName: "projectResources",
    variables: { id: projectId },
    query:
      "query projectResources($id: String!) {\n  project(id: $id) {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    environments {\n      id\n      name\n      services {\n        ...serviceFields\n        __typename\n      }\n      databases {\n        ...databaseFields\n        __typename\n      }\n      redises {\n        ...redisFields\n        __typename\n      }\n      envGroups {\n        ...envGroupFields\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment serviceFields on Service {\n  id\n  type\n  env {\n    ...envFields\n    __typename\n  }\n  repo {\n    ...repoFields\n    __typename\n  }\n  user {\n    id\n    email\n    __typename\n  }\n  owner {\n    id\n    email\n    billingStatus\n    featureFlags\n    __typename\n  }\n  name\n  slug\n  sourceBranch\n  buildCommand\n  buildFilter {\n    paths\n    ignoredPaths\n    __typename\n  }\n  buildPlan {\n    name\n    cpu\n    mem\n    __typename\n  }\n  externalImage {\n    ...externalImageFields\n    __typename\n  }\n  autoDeploy\n  userFacingType\n  userFacingTypeSlug\n  baseDir\n  dockerCommand\n  dockerfilePath\n  createdAt\n  updatedAt\n  outboundIPs\n  region {\n    id\n    description\n    __typename\n  }\n  registryCredential {\n    id\n    name\n    __typename\n  }\n  rootDir\n  shellURL\n  state\n  suspenders\n  sshAddress\n  sshServiceAvailable\n  lastDeployedAt\n  maintenanceScheduledAt\n  pendingMaintenanceBy\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envFields on Env {\n  id\n  name\n  language\n  isStatic\n  sampleBuildCommand\n  sampleStartCommand\n  __typename\n}\n\nfragment environmentFields on Environment {\n  id\n  name\n  project {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment repoFields on Repo {\n  id\n  provider\n  providerId\n  name\n  ownerName\n  webURL\n  isPrivate\n  __typename\n}\n\nfragment externalImageFields on ExternalImage {\n  imageHost\n  imageName\n  imageRef\n  imageRepository\n  imageURL\n  ownerId\n  registryCredentialId\n  __typename\n}\n\nfragment databaseFields on Database {\n  id\n  createdAt\n  updatedAt\n  databaseName\n  databaseUser\n  datadogAPIKey\n  externalHostname\n  externalPort\n  expiresAt\n  highAvailability\n  isMaxPlan\n  ipAllowList {\n    cidrBlock\n    description\n    __typename\n  }\n  name\n  plan\n  region {\n    id\n    description\n    __typename\n  }\n  owner {\n    id\n    billingStatus\n    user {\n      id\n      __typename\n    }\n    featureFlags\n    __typename\n  }\n  status\n  stripeConnection\n  suspenders\n  type\n  userFacingType\n  productVersion\n  role\n  replicas {\n    name\n    id\n    __typename\n  }\n  primary {\n    name\n    id\n    __typename\n  }\n  postgresMajorVersion\n  environment {\n    ...environmentFields\n    __typename\n  }\n  pointInTimeRecoveryEligibility\n  __typename\n}\n\nfragment redisFields on Redis {\n  createdAt\n  id\n  name\n  owner {\n    id\n    __typename\n  }\n  plan\n  region {\n    id\n    description\n    __typename\n  }\n  status\n  updatedAt\n  type\n  userFacingType\n  suspenders\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envGroupFields on EnvGroup {\n  id\n  name\n  ownerId\n  createdAt\n  updatedAt\n  envVars {\n    ...envVarFields\n    __typename\n  }\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envVarFields on EnvVar {\n  id\n  isFile\n  key\n  value\n  __typename\n}\n",
  });
  return body.data.project;
}

/**
 * Fetch all services for a given team id
 *
 * @param {string} token
 * @param {string} teamId
 * @returns {Promise<Server[]>} An array of Team objects for the given user
 */
export async function fetchServices(token, teamId) {
  const body = await req(token, {
    operationName: "servicesForOwner",
    variables: { ownerId: teamId },
    query:
      "query servicesForOwner($ownerId: String!, $includeSharedServices: Boolean, $emptyEnvironmentOnly: Boolean) {\n  servicesForOwner(\n    ownerId: $ownerId\n    includeSharedServices: $includeSharedServices\n    emptyEnvironmentOnly: $emptyEnvironmentOnly\n  ) {\n    ...serviceFields\n    __typename\n  }\n}\n\nfragment serviceFields on Service {\n  id\n  type\n  env {\n    ...envFields\n    __typename\n  }\n  repo {\n    ...repoFields\n    __typename\n  }\n  user {\n    id\n    email\n    __typename\n  }\n  owner {\n    id\n    email\n    billingStatus\n    featureFlags\n    __typename\n  }\n  name\n  slug\n  sourceBranch\n  buildCommand\n  buildFilter {\n    paths\n    ignoredPaths\n    __typename\n  }\n  buildPlan {\n    name\n    cpu\n    mem\n    __typename\n  }\n  externalImage {\n    ...externalImageFields\n    __typename\n  }\n  autoDeploy\n  userFacingType\n  userFacingTypeSlug\n  baseDir\n  dockerCommand\n  dockerfilePath\n  createdAt\n  updatedAt\n  outboundIPs\n  region {\n    id\n    description\n    __typename\n  }\n  registryCredential {\n    id\n    name\n    __typename\n  }\n  rootDir\n  shellURL\n  state\n  suspenders\n  sshAddress\n  sshServiceAvailable\n  lastDeployedAt\n  maintenanceScheduledAt\n  pendingMaintenanceBy\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envFields on Env {\n  id\n  name\n  language\n  isStatic\n  sampleBuildCommand\n  sampleStartCommand\n  __typename\n}\n\nfragment environmentFields on Environment {\n  id\n  name\n  project {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment repoFields on Repo {\n  id\n  provider\n  providerId\n  name\n  ownerName\n  webURL\n  isPrivate\n  __typename\n}\n\nfragment externalImageFields on ExternalImage {\n  imageHost\n  imageName\n  imageRef\n  imageRepository\n  imageURL\n  ownerId\n  registryCredentialId\n  __typename\n}\n",
  });
  return body.data.servicesForOwner;
}

/**
 * Fetch detailed information for a single service
 *
 * @param {string} token
 * @param {ServerID} serviceId
 * @returns {Promise<Server>}
 */
export async function fetchServer(token, serviceId) {
  const body = await req(token, {
    operationName: "server",
    variables: { id: serviceId },
    query:
      "query server($id: String!) {\n  server(id: $id) {\n    ...serverFields\n    verifiedDomains\n    isGithubRepoEmpty\n    __typename\n  }\n}\n\nfragment serverFields on Server {\n  ...serviceFields\n  autoscalingConfig {\n    enabled\n    min\n    max\n    cpuPercentage\n    cpuEnabled\n    memoryPercentage\n    memoryEnabled\n    __typename\n  }\n  deletedAt\n  deploy {\n    ...deployFields\n    __typename\n  }\n  deployKey\n  externalImage {\n    ...externalImageFields\n    __typename\n  }\n  extraInstances\n  healthCheckHost\n  healthCheckPath\n  isPrivate\n  isWorker\n  openPorts\n  maintenanceScheduledAt\n  parentServer {\n    ...serviceFields\n    __typename\n  }\n  pendingMaintenanceBy\n  plan {\n    name\n    cpu\n    mem\n    price\n    __typename\n  }\n  prPreviewsEnabled\n  preDeployCommand\n  pullRequestId\n  rootDir\n  startCommand\n  staticPublishPath\n  suspenders\n  url\n  disk {\n    ...diskFields\n    __typename\n  }\n  maintenance {\n    id\n    type\n    scheduledAt\n    pendingMaintenanceBy\n    state\n    __typename\n  }\n  __typename\n}\n\nfragment serviceFields on Service {\n  id\n  type\n  env {\n    ...envFields\n    __typename\n  }\n  repo {\n    ...repoFields\n    __typename\n  }\n  user {\n    id\n    email\n    __typename\n  }\n  owner {\n    id\n    email\n    billingStatus\n    featureFlags\n    __typename\n  }\n  name\n  slug\n  sourceBranch\n  buildCommand\n  buildFilter {\n    paths\n    ignoredPaths\n    __typename\n  }\n  buildPlan {\n    name\n    cpu\n    mem\n    __typename\n  }\n  externalImage {\n    ...externalImageFields\n    __typename\n  }\n  autoDeploy\n  userFacingType\n  userFacingTypeSlug\n  baseDir\n  dockerCommand\n  dockerfilePath\n  createdAt\n  updatedAt\n  outboundIPs\n  region {\n    id\n    description\n    __typename\n  }\n  registryCredential {\n    id\n    name\n    __typename\n  }\n  rootDir\n  shellURL\n  state\n  suspenders\n  sshAddress\n  sshServiceAvailable\n  lastDeployedAt\n  maintenanceScheduledAt\n  pendingMaintenanceBy\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envFields on Env {\n  id\n  name\n  language\n  isStatic\n  sampleBuildCommand\n  sampleStartCommand\n  __typename\n}\n\nfragment environmentFields on Environment {\n  id\n  name\n  project {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment repoFields on Repo {\n  id\n  provider\n  providerId\n  name\n  ownerName\n  webURL\n  isPrivate\n  __typename\n}\n\nfragment externalImageFields on ExternalImage {\n  imageHost\n  imageName\n  imageRef\n  imageRepository\n  imageURL\n  ownerId\n  registryCredentialId\n  __typename\n}\n\nfragment deployFields on Deploy {\n  id\n  status\n  buildId\n  commitId\n  commitShortId\n  commitMessage\n  commitURL\n  commitCreatedAt\n  finishedAt\n  finishedAtUnixNano\n  initialDeployHookFinishedAtUnixNano\n  createdAt\n  updatedAt\n  server {\n    id\n    userFacingTypeSlug\n    __typename\n  }\n  rollbackSupportStatus\n  reason {\n    ...failureReasonFields\n    __typename\n  }\n  imageSHA\n  externalImage {\n    imageRef\n    __typename\n  }\n  __typename\n}\n\nfragment failureReasonFields on FailureReason {\n  badStartCommand\n  evicted\n  evictionReason\n  nonZeroExit\n  oomKilled {\n    memoryLimit\n    __typename\n  }\n  rootDirMissing\n  timedOutSeconds\n  unhealthy\n  step\n  __typename\n}\n\nfragment diskFields on Disk {\n  id\n  name\n  mountPath\n  sizeGB\n  __typename\n}\n",
  });
  return body.data.server;
}

/**
 * @typedef {Object} EnvVar
 * @property {string} id
 * @property {boolean} isFile
 * @property {string} key
 * @property {string} value
 * @property {string} __typename
 */

/**
 * @typedef {Object} EnvGroup
 * @property {string} id
 * @property {string} name
 * @property {string} ownerId
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} environment
 * @property {EnvVar[]} envVars
 * @property {string} __typename
 */

/**
 * Fetch all environment groups for a given team id
 *
 * @param {string} token
 * @param {string} teamId
 * @returns {Promise<EnvGroup[]>} An array of Team objects for the given user
 */
export async function fetchEnvGroups(token, teamId) {
  const body = await req(token, {
    operationName: "envGroupsForOwner",
    variables: { ownerId: teamId },
    query:
      "query envGroupsForOwner($ownerId: String!) {\n  envGroupsForOwner(ownerId: $ownerId) {\n    ...envGroupFields\n    __typename\n  }\n}\n\nfragment envGroupFields on EnvGroup {\n  id\n  name\n  ownerId\n  createdAt\n  updatedAt\n  envVars {\n    ...envVarFields\n    __typename\n  }\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envVarFields on EnvVar {\n  id\n  isFile\n  key\n  value\n  __typename\n}\n\nfragment environmentFields on Environment {\n  id\n  name\n  project {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n",
  });
  return body.data.envGroupsForOwner;
}

/**
 * Fetch an environment group by ID
 *
 * @param {string} token
 * @param {string} envGroupId
 * @returns {Promise<EnvGroup>} An array of Team objects for the given user
 */
export async function fetchEnvGroup(token, envGroupId) {
  const body = await req(token, {
    operationName: "envGroup",
    variables: { id: envGroupId },
    query:
      "query envGroup($id: String!) {\n  envGroup(id: $id) {\n    ...envGroupFields\n    __typename\n  }\n}\n\nfragment envGroupFields on EnvGroup {\n  id\n  name\n  ownerId\n  createdAt\n  updatedAt\n  envVars {\n    ...envVarFields\n    __typename\n  }\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envVarFields on EnvVar {\n  id\n  isFile\n  key\n  value\n  __typename\n}\n\nfragment environmentFields on Environment {\n  id\n  name\n  project {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n",
  });
  return body.data.envGroup;
}

/**
 * Fetch the services that are attached to a given environment group
 *
 * @param {string} token
 * @param {string} envGroupId
 * @returns {Promise<Server[]>} An array of services attached to the given environment group
 */
export async function fetchEnvGroupServices(token, envGroupId) {
  const body = await req(token, {
    operationName: "servicesForEnvGroup",
    variables: { envGroupId: envGroupId },
    query:
      "query servicesForEnvGroup($envGroupId: String!) {\n  servicesForEnvGroup(envGroupId: $envGroupId) {\n    id\n    type\n    userFacingType\n    userFacingTypeSlug\n    name\n    slug\n    sourceBranch\n    env {\n      ...envFields\n      __typename\n    }\n    repo {\n      ...repoFields\n      __typename\n    }\n    updatedAt\n    user {\n      id\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment envFields on Env {\n  id\n  name\n  language\n  isStatic\n  sampleBuildCommand\n  sampleStartCommand\n  __typename\n}\n\nfragment repoFields on Repo {\n  id\n  provider\n  providerId\n  name\n  ownerName\n  webURL\n  isPrivate\n  __typename\n}\n",
  });

  return body.data.servicesForEnvGroup;
}

/**
 * @typedef {Object} LogLabel
 * @property {string} label
 * @property {string} value
 * @property {string} __typename
 */

/**
 * @typedef {Object} LogWithLabels
 * @property {string} id
 * @property {string} timestamp
 * @property {string} text
 * @property {string} __typename
 */

/**
 * @typedef {Object} LogResult
 * @property {LogWithLabels[]} logs
 * @property {string} nextEndTime
 * @property {string} nextStartTime
 * @property {boolean} hasMore
 * @property {string} __typename
 */

/**
 * Fetch logs for a given service in a given team
 *
 * TODO: make region, time range, pageSize, etc into params
 *
 * @param {string} token
 * @param {string} teamId
 * @param {ServerID} serviceId
 * @returns {Promise<LogResult>} An array of services attached to the given environment group
 */
export async function fetchLogs(token, teamId, serviceId) {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const body = await req(token, {
    operationName: "logs",
    variables: {
      query: {
        start: fourHoursAgo.toISOString(),
        end: now.toISOString(),
        filters: [
          {
            field: "SERVICE",
            values: [serviceId],
            operator: "INCLUDES",
          },
        ],
        ownerId: teamId,
        pageSize: 50,
        region: "oregon",
        direction: "BACKWARD",
      },
    },
    query:
      "query logs($query: LogQueryInput!) {\n  logs(query: $query) {\n    logs {\n      ...logWithLabelsFields\n      __typename\n    }\n    nextEndTime\n    nextStartTime\n    hasMore\n    __typename\n  }\n}\n\nfragment logWithLabelsFields on LogWithLabels {\n  id\n  labels {\n    label\n    value\n    __typename\n  }\n  timestamp\n  text\n  __typename\n}\n",
  });

  return body.data.logs;
}

/**
 * @typedef {Object} SampleValue
 * @property {string} time
 * @property {number} memory
 * @property {number} cpu
 * @property {string} __typename
 */

/**
 * @typedef {Object} Metrics
 * @property {SampleValue[]} samples
 * @property {string} __typename
 */

/**
 * Fetch metrics for a given service
 *
 * @param {string} token
 * @param {ServerID} serviceId
 * @param {number} historyMinutes
 * @param {number} step
 * @returns {Promise<Server>} A server instance with the `metrics` field
 *                            populated
 */
export async function serviceMetrics(
  token,
  serviceId,
  historyMinutes = 720,
  step = 60
) {
  const body = await req(token, {
    operationName: "serviceMetrics",
    variables: {
      serviceId,
      historyMinutes,
      step,
    },
    query:
      "query serviceMetrics($serviceId: String!, $historyMinutes: Int!, $step: Int!) {\n  service(id: $serviceId) {\n    env {\n      id\n      language\n      name\n      __typename\n    }\n    metrics(historyMinutes: $historyMinutes, step: $step) {\n      samples {\n        time\n        memory\n        cpu\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n",
  });

  return body.data.service;
}

/**
 * @typedef {Object} BandwidthPoint
 * @property {string} time
 * @property {number} bandwidthMB
 * @property {string} __typename
 */

/**
 * @typedef {Object} Bandwidth
 * @property {number} totalMB
 * @property {BandwidthPoint[]} points
 * @property {string} __typename
 */

/**
 * Fetch bandwidth for a given service
 *
 * @param {string} token
 * @param {ServerID} serviceId
 * @returns {Promise<Server>} A server instance with the `bandwidthMB` field
 *                            populated
 */
export async function serverBandwidth(token, serviceId) {
  const body = await req(token, {
    operationName: "serverBandwidth",
    variables: {
      serverId: serviceId,
    },
    query:
      "query serverBandwidth($serverId: String!) {\n  server(id: $serverId) {\n    id\n    bandwidthMB {\n      totalMB\n      points {\n        time\n        bandwidthMB\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n",
  });

  return body.data.server;
}
