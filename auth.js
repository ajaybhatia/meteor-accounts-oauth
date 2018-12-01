// For Google
// See discussion here for example https://github.com/martijnwalraven/meteor-ios/issues/10
// would call from a remote client like so
// ddpClient.call("login", [{ google: { RES_FROM_GOOGLE_SIGN_IN } }])

Accounts.registerLoginHandler('google', (serviceData) => {
  let loginRequest = serviceData['google'];

  if (!loginRequest) {
    return undefined;
  }

  const serviceConfig = ServiceConfiguration.configurations.findOne({service: 'google'});
  if (!serviceConfig)
    throw new ServiceConfiguration.ConfigError();

  const expiresAt = (+new Date) + (1000 * parseInt(loginRequest.accessTokenExpirationDate, 10));
  const accessToken = loginRequest.accessToken;
  const idToken = loginRequest.idToken;

  if (!idToken) {
    throw new Meteor.Error(401, 'Google login without idToken')
  }

  let validToken = validIdToken(idToken, serviceConfig);

  if (!validToken) {
    throw new Meteor.Error(500, 'Failed to link Google', accessToken)
  }

  const scopes = getScopes(accessToken);
  const identity = getGoogleIdentity(accessToken);

  serviceData = {
    accessToken: accessToken,
    expiresAt: expiresAt,
    idToken: idToken,
    scope: scopes,
  }

  const fields = _.pick(identity, Google.whitelistedFields);
  _.extend(serviceData, fields);

  if (loginRequest.serverAuthCode) {
    let authCodes = exchangeAuthCode(loginRequest.serverAuthCode, serviceConfig);

    if (authCodes) {
      serviceData.accessToken = authCodes.access_token;
      serviceData.expiresAt = (+new Date) + (1000 * parseInt(authCodes.expires_in, 10));
      serviceData.idToken = authCodes.id_token;

      if (authCodes.refresh_token)
        serviceData.refreshToken = authCodes.refresh_token;
    }
  }

  const existingUser = Meteor.users.findOne({ 'services.google.id': validToken.sub });

  let userId;
  if (existingUser) {
    userId = existingUser._id;

    let prefixedServiceData = {};
    _.each(serviceData, (val, key) => {
      prefixedServiceData[`services.google.${key}`] = val;
    });

    Meteor.users.update({ _id: userId }, {
      $set: prefixedServiceData,
      $addToSet: { emails: { address: serviceData.email, verified: serviceData.verified_email } }
    });
  } else {
    userId = Meteor.users.insert({
      services: {
        google: serviceData
      },
      profile: { name: serviceData.name },
      emails: [{
        address: serviceData.email,
        verified: serviceData.verified_email
      }]
    });
  }

  return { userId: userId };
});

// https://developers.google.com/identity/sign-in/ios/backend-auth
const validIdToken = (idToken, config) => {
  try {
    let res = HTTP.get(
      "https://www.googleapis.com/oauth2/v3/tokeninfo",
      {params: {id_token: idToken}});

    if (res && res.statusCode === 200) {
      if (_.contains(config.validClientIds, res.data.aud)) {
        return res.data;
      } else {
        return null;
      }
    } else {
      return null;
    }
  } catch (err) {
    console.log('err', err);
    return null;
  }
};

const getGoogleIdentity = (accessToken) => {
  try {
    return HTTP.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {params: {access_token: accessToken}}).data;
  } catch (err) {
    throw _.extend(new Error("Failed to fetch identity from Google. " + err.message),
                   {response: err.response});
  }
};

const getScopes = (accessToken) => {
  try {
    return HTTP.get(
      "https://www.googleapis.com/oauth2/v1/tokeninfo",
      {params: {access_token: accessToken}}).data.scope.split(' ');
  } catch (err) {
    throw _.extend(new Error("Failed to fetch tokeninfo from Google. " + err.message),
                   {response: err.response});
  }
};

const exchangeAuthCode = (authCode, config) => {
  let response;
  try {
    response = HTTP.post(
      "https://www.googleapis.com/oauth2/v4/token", {params: {
        code: authCode,
        client_id: config.clientId,
        client_secret: OAuth.openSecret(config.secret),
        grant_type: 'authorization_code'
      }});
  } catch (err) {
    // throw _.extend(new Error("Failed to exchange Google auth code for refresh token. " + err.message),
    //                {response: err.response});
    return null;
  }

  return response.data;
}

// For Facebook
Accounts.registerLoginHandler('facebook', (params) => {
  const data = params.facebook;

  // If this isn't facebook login then we don't care about it. No need to proceed.
  if (!data) {
    return undefined;
  }

  // The fields we care about (same as Meteor's)
  const whitelisted = ['id', 'email', 'name', 'first_name',
   'last_name', 'link', 'gender', 'locale', 'age_range'];

  // Get our user's identifying information. This also checks if the accessToken
  // is valid. If not it will error out.
  const identity = getFacebookIdentity(data.accessToken, whitelisted);

  // Build our actual data object.
  const serviceData = {
    accessToken: data.accessToken,
    expiresAt: (+new Date) + (1000 * data.expirationTime)
  };
  const fields = Object.assign({}, serviceData, identity);

  // Search for an existing user with that facebook id
  const existingUser = Meteor.users.findOne({ 'services.facebook.id': identity.id });

  let userId;
  if (existingUser) {
    userId = existingUser._id;

    // Update our data to be in line with the latest from Facebook
    const prefixedData = {};
    _.each(fields, (val, key) => {
      prefixedData[`services.facebook.${key}`] = val;
    });

    Meteor.users.update({ _id: userId }, {
      $set: prefixedData,
      $addToSet: { emails: { address: identity.email, verified: true } }
    });

  } else {
    // Create our user
    userId = Meteor.users.insert({
      services: {
        facebook: fields
      },
      profile: { name: identity.name },
      emails: [{
        address: identity.email,
        verified: true
      }]
    });
  }

  return { userId: userId };
});

// Gets the identity of our user and by extension checks if
// our access token is valid.
const getFacebookIdentity = (accessToken, fields) => {
  try {
    return HTTP.get("https://graph.facebook.com/v2.4/me", {
      params: {
        access_token: accessToken,
        fields: fields.join(",")
      }
    }).data;
  } catch (err) {
    throw _.extend(new Error("Failed to fetch identity from Facebook. " + err.message),
                   {response: err.response});
  }
};
