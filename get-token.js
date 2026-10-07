const { getAuth } = require("firebase-admin/auth");
const { getAdminApp } = require("./src/lib/firebase-admin");

async function run() {
  const customToken = await getAuth(getAdminApp()).createCustomToken("test-uid-123", { email: "test@example.com" });
  console.log("Custom token:", customToken);
  
  // Exchanging custom token for ID token using identitytoolkit API requires the Web API key.
}
run().catch(console.error);
