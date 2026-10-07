const { getAuth } = require("firebase-admin/auth");
const { getAdminApp } = require("./src/lib/firebase-admin");

async function run() {
  const token = await getAuth(getAdminApp()).createCustomToken("test-uid-123", { email: "test@example.com" });
  // Cannot test this way without Web API key. Let's just create a test endpoint!
}
run();
