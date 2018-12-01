Package.describe({
  summary: "Login service for Google/Facebook accounts using native Google/Facebook SDK for authorization",
  version: "0.0.1",
  name: "ajaybhatia:accounts-oauth",
  git: "https://github.com/ajaybhatia/meteor-accounts-oauth"
});

Package.onUse(function(api) {
  api.versionsFrom("METEOR@1.3");

  api.use(['oauth', 'oauth2'], ['server']);
  api.use(['underscore', 'random', 'service-configuration']);
  api.use('accounts-base', ['client', 'server']);
  api.use('http', ['server']);
  api.use('ecmascript', ['server']);

  // Export Accounts (etc) to packages using this one.
  api.imply('accounts-base', ['client', 'server']);
  api.use('accounts-oauth', ['client', 'server']);

  api.use('google-oauth@1.2.6', ['server']);
  api.use('facebook-oauth@1.5.0', ['server']);

  api.addFiles("auth.js", "server");
});
