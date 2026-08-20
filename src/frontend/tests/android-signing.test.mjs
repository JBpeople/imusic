import assert from "node:assert/strict";
import test from "node:test";

import { configureAndroidSigning } from "../scripts/configure-android-signing.mjs";

const generatedGradle = `import java.util.Properties

plugins {
    id("com.android.application")
}

android {
    buildTypes {
        getByName("debug") {
            isDebuggable = true
        }
        getByName("release") {
            isMinifyEnabled = true
        }
    }
}
`;

test("injects a PKCS12 release signing configuration", () => {
  const configured = configureAndroidSigning(generatedGradle);

  assert.match(configured, /import java\.io\.FileInputStream/);
  assert.match(configured, /create\("release"\)/);
  assert.match(configured, /storeType = "PKCS12"/);
  assert.match(
    configured,
    /signingConfig = signingConfigs\.getByName\("release"\)/,
  );
});

test("refuses to patch the same Gradle file twice", () => {
  const configured = configureAndroidSigning(generatedGradle);

  assert.throws(
    () => configureAndroidSigning(configured),
    /already configured/,
  );
});
