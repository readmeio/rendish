import { inspect } from "node:util";

import totp from "totp-generator";

// for debugging purposes, this can be useful, as it will return information
// about the request that was made:
// const GRAPHQL_URI = "https://httpbingo.org/anything";
const GRAPHQL_URI = "https://api.render.com/graphql";

export class RequestError extends Error {
  constructor(message) {
    super(message);
  }
}

async function req(token, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(GRAPHQL_URI, {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers: headers,
    body: body,
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new RequestError(
      `error with request ${inspect(body)}:\n${inspect(errorBody)}`
    );
  }
  const resBody = await res.json();
  if (resBody.errors) {
    throw new RequestError(
      `Request failure: ${JSON.stringify(resBody.errors)}`
    );
  }
  return resBody;
}

/**
 * @typedef {Object} User
 * @property {string} id
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
 * Log a given user in with their password and TOTP secret
 *
 * @param {string} user - the username to log in
 * @param {string} pass - their password
 * @param {string} totpSecret - their TOTP secret
 * @returns {Promise<Login>} the user object, their id token, and an expiry
 */
export async function login(user, pass, totpSecret) {
  const loginRes = await req(
    undefined,
    JSON.stringify({
      operationName: "signIn",
      variables: {
        email: user,
        password: pass,
      },
      query:
        "mutation signIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    ...authResultFields\n    __typename\n  }\n}\n\nfragment authResultFields on AuthResult {\n  idToken\n  expiresAt\n  user {\n    ...userFields\n    sudoModeExpiresAt\n    __typename\n  }\n  readOnly\n  __typename\n}\n\nfragment userFields on User {\n  id\n  active\n  createdAt\n  email\n  featureFlags\n  githubId\n  gitlabId\n  googleId\n  name\n  notifyOnPrUpdate\n  otpEnabled\n  passwordExists\n  tosAcceptedAt\n  intercomEmailHMAC\n  __typename\n}\n",
    })
  );
  console.log(loginRes);

  const totpRes = await req(
    loginRes.data.signIn.idToken,
    JSON.stringify({
      operationName: "verifyOneTimePassword",
      variables: {
        code: totp(totpSecret),
      },
      query:
        "mutation verifyOneTimePassword($code: String!) {\n  verifyOneTimePassword(code: $code) {\n    ...authResultFields\n    __typename\n  }\n}\n\nfragment authResultFields on AuthResult {\n  idToken\n  expiresAt\n  user {\n    ...userFields\n    sudoModeExpiresAt\n    __typename\n  }\n  readOnly\n  __typename\n}\n\nfragment userFields on User {\n  id\n  active\n  createdAt\n  email\n  featureFlags\n  githubId\n  gitlabId\n  googleId\n  name\n  notifyOnPrUpdate\n  otpEnabled\n  passwordExists\n  tosAcceptedAt\n  intercomEmailHMAC\n  __typename\n}\n",
    })
  );
  return totpRes.data.verifyOneTimePassword;
}

/**
 * @typedef {Object} Team
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} __typename
 */

/**
 * Fetch the teams for a given user
 *
 * @param {string} token
 * @param {string} user
 * @returns {Promise<Team[]>} An array of Team objects for the given user
 */
export async function fetchTeams(token, user) {
  const body = await req(
    token,
    JSON.stringify({
      operationName: "teamsForUserMinimal",
      variables: { userId: user.id },
      query:
        "query teamsForUserMinimal($userId: String!) {\n  teamsForUser(userId: $userId) {\n    id\n    name\n    email\n    __typename\n  }\n}\n",
    })
  );
  return body.data.teamsForUser;
}

/**
 * @typedef {Object} Owner
 * @property {string} id
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
 * @typedef {Object} ExternalImage
 * @property {string} imageHost
 * @property {string} imageName
 * @property {string} imageRef
 * @property {string} imageRepository
 * @property {string} imageURL
 * @property {string} ownerId
 * @property {string} registryCredentialId
 * @property {string} __typename
 */

/**
 * @typedef {Object} Region
 * @property {string} id
 * @property {string} description
 * @property {string} __typename
 */

/**
 * @typedef {Object} Server
 * @property {string} id
 * @property {string} state // "Running", what else?
 * @property {string[]} suspenders
 * @property {string} __typename
 * @property {string} type?
 * @property {Env} env?
 * @property {Any} repo? // TODO
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
 * @property {Environment} environment
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
 * @typedef {Object} Environment
 * @property {string} id
 * @property {string} name
 * @property {Owner} owner?
 * @property {Server[]} services?
 * @property {Database[]} databases?
 * @property {Redis[]} redises?
 * @property {string} __typename
 */

/**
 * @typedef {Object} Project
 * @property {string} id
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
  const body = await req(
    token,
    JSON.stringify({
      operationName: "projects",
      variables: { filter: { ownerId: teamId } },
      query:
        "query projects($filter: ProjectFilterInput!) {\n  projects(filter: $filter) {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    environments {\n      id\n      name\n      services {\n        id\n        state\n        suspenders\n        __typename\n      }\n      databases {\n        id\n        status\n        suspenders\n        __typename\n      }\n      redises {\n        id\n        status\n        suspenders\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n",
    })
  );
  return body.data.projects;
}

/**
 * Fetch the projects for a given team id
 *
 * TODO: this isn't working rn I don't know why
 *
 * @param {string} token
 * @param {string} projectId
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
 * @returns {Promise<Record<number, Server>[]>} An array of Team objects for the given user
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
