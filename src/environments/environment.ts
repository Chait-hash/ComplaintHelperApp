// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.




export const environment = {
  production: false,
  clientId: "complaint-helper-client",
  clientSecretStaging: "8nAxlYiTZf88xNL8rFqXj0TSuDiWNyeV",
  keycloakUrlStaging: "http://localhost:8080/realms/complaint-helper/protocol/openid-connect/token",
  acceptRejectUrl : "http://localhost:3000/api/complaints/paraphrase/respond",
  generateComplaintURL : "http://localhost:3000/api/complaints",
  generateParaphraseWithComplaintId : "http://localhost:3000/api/complaints/paraphrase",
  editComplaintURL : "http://localhost:3000/api/complaints",

  publicUrls : "",
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
