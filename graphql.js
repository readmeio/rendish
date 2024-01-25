import totp from "totp-generator";

const GRAPHQL_URI = "https://api.render.com/graphql";
// const GRAPHQL_URI = "https://httpbingo.org/anything";

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
    throw new Error(`error with request ${body}:\n${errorBody}`);
  }
  const resBody = await res.json();
  if (resBody.errors) {
    console.log("Request failure", resBody.errors, res);
    throw new Error(`Request failure: ${JSON.stringify(resBody.errors)}`);
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
  console.log("fuck you:", body.data);
  return body.data.teamsForUser;
}
