import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const signingConfig = `
    // ANDROID_RELEASE_SIGNING: injected by scripts/configure-android-signing.mjs
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            keystoreProperties.load(FileInputStream(keystorePropertiesFile))

            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
            storeType = "PKCS12"
        }
    }
`;

export function configureAndroidSigning(input) {
  let gradle = input;

  if (
    gradle.includes('create("release")') ||
    gradle.includes("ANDROID_RELEASE_SIGNING")
  ) {
    throw new Error("Android release signing is already configured");
  }

  if (!gradle.includes("import java.io.FileInputStream")) {
    gradle = `import java.io.FileInputStream\n${gradle}`;
  }

  const buildTypesMarker = "\n    buildTypes {";
  if (!gradle.includes(buildTypesMarker)) {
    throw new Error("Could not find Android buildTypes block");
  }

  gradle = gradle.replace(
    buildTypesMarker,
    `${signingConfig}${buildTypesMarker}`,
  );

  const releaseMarker = 'getByName("release") {';
  if (!gradle.includes(releaseMarker)) {
    throw new Error("Could not find Android release build type");
  }

  return gradle.replace(
    releaseMarker,
    `${releaseMarker}\n                signingConfig = signingConfigs.getByName("release")`,
  );
}

const isDirectRun =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const gradlePath = resolve(
    process.cwd(),
    "src-tauri/gen/android/app/build.gradle.kts",
  );
  const gradle = await readFile(gradlePath, "utf8");

  await writeFile(gradlePath, configureAndroidSigning(gradle), "utf8");
}
