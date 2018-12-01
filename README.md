# accounts--oauth

A login handler for clients wishing to use a platform's native google and facebook sdk for sign on. Removes the requirement of the browser. Use in combination with `accounts-google`, `accounts-facebook` or independently.

## Configuration

The only change you'll have to make on the service is when you set your `ServiceConfiguration`. You'll have to add a `validClientIds` array. This is used because the client id may be different between your web app and your other clients (such as an iOS app). Here's an example:

```javascript
/*
  Settings would look like this
  {
    "google": {
      "client_secret": "MY_WEB_APP_SECRET",
      "client_id": "MY_WEB_APP_CLIENT_ID",
      "validClientIds": [
        "MY_WEB_APP_CLIENT_ID",
        "MY_IOS_APP_CLIENT_ID"
      ]
    },
    "facebook": {
      "client_secret": "MY_WEB_APP_SECRET",
      "client_id": "MY_WEB_APP_CLIENT_ID",
      "validClientIds": [
        "MY_WEB_APP_CLIENT_ID",
        "MY_IOS_APP_CLIENT_ID"
      ]
    }
  }
*/
const google_settings = Meteor.settings.google;
const facebook_settings = Meteor.settings.facebook;

if (google_settings) {
  ServiceConfiguration.configurations.remove({
    service: 'google'
  });

  ServiceConfiguration.configurations.insert({
    service: 'google',
    clientId: google_settings.client_id,
    secret: google_settings.client_secret,
    validClientIds: Meteor.google_settings.google.validClientIds
  });
}

if (facebook_settings) {
  ServiceConfiguration.configurations.remove({
    service: 'facebook'
  });

  ServiceConfiguration.configurations.insert({
    service: 'facebook',
    clientId: facebook_settings.client_id,
    secret: facebook_settings.client_secret,
    validClientIds: Meteor.facebook_settings.google.validClientIds
  });
}
```

## Usage from Client

Call the `login` method from ddp client with the following parameters:

```javascript
  { google: serviceData }
  or
  { facebook: serviceData }
```

Where `serviceData` is the data returned by the sdk you are using for Google/Facebook authentication.

__Example:__ `DDP.call('login', [{ google: serviceData }])`

## Usage with Full Meteor Client

If you have access to a full Meteor client implementation, possibly through something like [`meteor-client-bundler`](https://github.com/Urigo/meteor-client-bundler), then you'll want your client-side call to look something like this:

````javascript
Accounts.callLoginMethod({
  methodArguments: [{ google: user }],
  userCallback: error => {
    if (error) {
      console.debug(error)
    }
  }
})
````

See [here](http://rurri.com/articles/Creating-a-custom-authentication-service-in-Meteor.html) for more information about this undocumented Meteor feature. The advantage is that this will set up your client-side authentication properly, so that (for example) `Meteor.user()` returns the current user correctly. Which is important if you are relying on that reactive data source to trigger other changes.
