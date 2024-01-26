import { inspect } from "node:util";

import totp from "totp-generator";

const GRAPHQL_URI = "https://api.render.com/graphql";
// const GRAPHQL_URI = "https://httpbingo.org/anything";

export function RequestError() {}
RequestError.prototype = new Error();

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
    console.log("Request failure", resBody.errors, res);
    throw new RequestError(
      `Request failure: ${JSON.stringify(resBody.errors)}`
    );
  }
  return resBody;
}

// return example:
// {
//  "idToken": "rnd_rtiiInImo6QZM2NBhMFY3azK5jzo",
//  "expiresAt": "2024-02-01T13:41:16.922300094Z",
//  "user": {
//    "id": "usr-chn5id7dvk4n439pqm60",
//    "active": true,
//    "createdAt": "2023-05-24T18:36:36.299321Z",
//    "email": "billm@readme.io",
//    "featureFlags": [],
//    "githubId": "7150",
//    "gitlabId": "",
//    "googleId": "118245441453771111712",
//    "name": "",
//    "notifyOnPrUpdate": "DEFAULT",
//    "otpEnabled": true,
//    "passwordExists": true,
//    "tosAcceptedAt": "2023-05-24T18:36:36.299293Z",
//    "intercomEmailHMAC": "aab10442b78e1fb35fe2960996a271f04f660d348d3fdcf475c6be39176f11b0",
//    "__typename": "User",
//    "sudoModeExpiresAt": "2024-01-25T13:51:16.922225744Z"
//   }
// }
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

// example return:
// [{"id":"tea-chn5hr1mbg5577jbgb8g","name":"ReadMe","email":"render-owners@readme.io","__typename":"Team"}]
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

// example return:[
//      {
//        "id": "prj-cisrv7dph6et1s9p8q00",
//        "name": "readme",
//        "owner": {
//          "id": "tea-chn5hr1mbg5577jbgb8g",
//          "__typename": "Owner"
//        },
//        "environments": [
//          {
//            "id": "evm-cj618lavvtos73fcmur0",
//            "name": "Production",
//            "services": [
//              {
//                "id": "srv-cktf3gub0mos73c7cs20",
//                "state": "Running",
//                "suspenders": [],
//                "__typename": "Server"
//              },
//            ],
//            "databases": [],
//            "redises": [
//              {
//                "id": "red-cl1a7bgp2gis738mnq1g",
//                "status": "AVAILABLE",
//                "suspenders": [
//                  "a",
//                  "b",
//                  "c",
//                  "d"
//                ],
//                "__typename": "Redis"
//              },
//            ],
//            "__typename": "Environment"
//          },
//       ],
//       "__typename": "Project"
//    }
//  ]
export async function fetchProjects(token, team) {
  const body = await req(
    token,
    JSON.stringify({
      operationName: "projects",
      variables: { filter: { ownerId: team } },
      query:
        "query projects($filter: ProjectFilterInput!) {\n  projects(filter: $filter) {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    environments {\n      id\n      name\n      services {\n        id\n        state\n        suspenders\n        __typename\n      }\n      databases {\n        id\n        status\n        suspenders\n        __typename\n      }\n      redises {\n        id\n        status\n        suspenders\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n",
    })
  );
  return body.data.projects;
}

// returns data like:
//{
//      "id": "prj-cisrv7dph6et1s9p8q00",
//      "name": "readme",
//      "owner": {
//        "id": "tea-chn5hr1mbg5577jbgb8g",
//        "__typename": "Owner"
//      },
//      "environments": [
//        {
//           "id": "evm-cj618lavvtos73fcmur0",
//           "name": "Production",
//           "services": [...],
//           "databases": [...],
//           "redises": [...],
//           "envGroups": [...],
//           "__typename": "Environment",
//        }, ...],
//      "__typename": "Project"
//    }
export async function fetchProjectResources(token, projectID) {
  const body = await req(token, {
    operationName: "projectResources",
    variables: { id: projectID },
    query:
      "query projectResources($id: String!) {\n  project(id: $id) {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    environments {\n      id\n      name\n      services {\n        ...serviceFields\n        __typename\n      }\n      databases {\n        ...databaseFields\n        __typename\n      }\n      redises {\n        ...redisFields\n        __typename\n      }\n      envGroups {\n        ...envGroupFields\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment serviceFields on Service {\n  id\n  type\n  env {\n    ...envFields\n    __typename\n  }\n  repo {\n    ...repoFields\n    __typename\n  }\n  user {\n    id\n    email\n    __typename\n  }\n  owner {\n    id\n    email\n    billingStatus\n    featureFlags\n    __typename\n  }\n  name\n  slug\n  sourceBranch\n  buildCommand\n  buildFilter {\n    paths\n    ignoredPaths\n    __typename\n  }\n  buildPlan {\n    name\n    cpu\n    mem\n    __typename\n  }\n  externalImage {\n    ...externalImageFields\n    __typename\n  }\n  autoDeploy\n  userFacingType\n  userFacingTypeSlug\n  baseDir\n  dockerCommand\n  dockerfilePath\n  createdAt\n  updatedAt\n  outboundIPs\n  region {\n    id\n    description\n    __typename\n  }\n  registryCredential {\n    id\n    name\n    __typename\n  }\n  rootDir\n  shellURL\n  state\n  suspenders\n  sshAddress\n  sshServiceAvailable\n  lastDeployedAt\n  maintenanceScheduledAt\n  pendingMaintenanceBy\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envFields on Env {\n  id\n  name\n  language\n  isStatic\n  sampleBuildCommand\n  sampleStartCommand\n  __typename\n}\n\nfragment environmentFields on Environment {\n  id\n  name\n  project {\n    id\n    name\n    owner {\n      id\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment repoFields on Repo {\n  id\n  provider\n  providerId\n  name\n  ownerName\n  webURL\n  isPrivate\n  __typename\n}\n\nfragment externalImageFields on ExternalImage {\n  imageHost\n  imageName\n  imageRef\n  imageRepository\n  imageURL\n  ownerId\n  registryCredentialId\n  __typename\n}\n\nfragment databaseFields on Database {\n  id\n  createdAt\n  updatedAt\n  databaseName\n  databaseUser\n  datadogAPIKey\n  externalHostname\n  externalPort\n  expiresAt\n  highAvailability\n  isMaxPlan\n  ipAllowList {\n    cidrBlock\n    description\n    __typename\n  }\n  name\n  plan\n  region {\n    id\n    description\n    __typename\n  }\n  owner {\n    id\n    billingStatus\n    user {\n      id\n      __typename\n    }\n    featureFlags\n    __typename\n  }\n  status\n  stripeConnection\n  suspenders\n  type\n  userFacingType\n  productVersion\n  role\n  replicas {\n    name\n    id\n    __typename\n  }\n  primary {\n    name\n    id\n    __typename\n  }\n  postgresMajorVersion\n  environment {\n    ...environmentFields\n    __typename\n  }\n  pointInTimeRecoveryEligibility\n  __typename\n}\n\nfragment redisFields on Redis {\n  createdAt\n  id\n  name\n  owner {\n    id\n    __typename\n  }\n  plan\n  region {\n    id\n    description\n    __typename\n  }\n  status\n  updatedAt\n  type\n  userFacingType\n  suspenders\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envGroupFields on EnvGroup {\n  id\n  name\n  ownerId\n  createdAt\n  updatedAt\n  envVars {\n    ...envVarFields\n    __typename\n  }\n  environment {\n    ...environmentFields\n    __typename\n  }\n  __typename\n}\n\nfragment envVarFields on EnvVar {\n  id\n  isFile\n  key\n  value\n  __typename\n}\n",
  });
  return body.data.project;
}