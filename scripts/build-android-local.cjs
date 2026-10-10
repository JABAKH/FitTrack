const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const sdk = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk"),
].find(
  (candidate) =>
    candidate &&
    fs.existsSync(path.join(candidate, "build-tools")) &&
    fs.existsSync(path.join(candidate, "platform-tools")),
);
if (!sdk)
  throw new Error(
    "No se encontró un Android SDK completo. Revisa Android Studio.",
  );
const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  NODE_ENV: process.env.NODE_ENV || "production",
};
if (process.platform !== "win32")
  throw new Error("Este comando local está preparado para Windows.");
if (!fs.existsSync(sdk))
  throw new Error("Falta el SDK de Android. Instálalo con Android Studio.");
// Use Windows trusted certificates without disabling HTTPS validation.
env.JAVA_TOOL_OPTIONS = [
  env.JAVA_TOOL_OPTIONS || "",
  "-Djavax.net.ssl.trustStoreType=Windows-ROOT",
  "-Djavax.net.ssl.trustStore=NONE",
].join(" ");
const credentialsFile = path.join(root, "credentials.json");
if (!fs.existsSync(credentialsFile))
  throw new Error(
    "Falta credentials.json con la firma existente. Descárgalo con npx eas-cli@latest credentials --platform android.",
  );
const signing = JSON.parse(fs.readFileSync(credentialsFile, "utf8")).android
  ?.keystore;
if (
  !signing?.keystorePath ||
  !signing.keyAlias ||
  !signing.keystorePassword ||
  !signing.keyPassword
)
  throw new Error("La firma Android está incompleta en credentials.json.");
const keystore = path.resolve(root, signing.keystorePath);
if (!fs.existsSync(keystore))
  throw new Error("No se encontró el archivo de firma Android.");
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      "La operación no terminó correctamente. Revisa el error anterior.",
    );
}
if (!process.argv.includes("--sign-only")) {
  const cli = path.join(
    path.dirname(require.resolve("expo/package.json")),
    "bin",
    "cli",
  );
  run(process.execPath, [
    cli,
    "prebuild",
    "--platform",
    "android",
    "--no-install",
  ]);
  run(
    "cmd.exe",
    [
      "/d",
      "/c",
      "gradlew.bat :app:assembleRelease --console=plain --max-workers=2 --init-script ..\\scripts\\local-native-cache.gradle",
    ],
    { cwd: path.join(root, "android") },
  );
}
const source = path.join(
  root,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);
if (!fs.existsSync(source))
  throw new Error("No existe el APK compilado. Ejecuta npm run apk:local.");
const versions = fs
  .readdirSync(path.join(sdk, "build-tools"))
  .filter((name) => /^\d+\.\d+\.\d+$/.test(name))
  .sort((a, b) => {
    const av = a.split(".").map(Number),
      bv = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if (av[i] !== bv[i]) return bv[i] - av[i];
    }
    return 0;
  });
const signer = path.join(
  sdk,
  "build-tools",
  versions[0] || "",
  "lib",
  "apksigner.jar",
);
if (!fs.existsSync(signer))
  throw new Error("Falta apksigner en Android SDK Build Tools.");
fs.mkdirSync(path.join(root, "builds"), { recursive: true });
const output = path.join(root, "builds", "FitTrack-android.apk");
const java = env.JAVA_HOME
  ? path.join(env.JAVA_HOME, "bin", "java.exe")
  : "java.exe";
const signingEnv = {
  ...env,
  FITTRACK_KEYSTORE_PASSWORD: signing.keystorePassword,
  FITTRACK_KEY_PASSWORD: signing.keyPassword,
};
run(
  java,
  [
    "-jar",
    signer,
    "sign",
    "--ks",
    keystore,
    "--ks-key-alias",
    signing.keyAlias,
    "--ks-pass",
    "env:FITTRACK_KEYSTORE_PASSWORD",
    "--key-pass",
    "env:FITTRACK_KEY_PASSWORD",
    "--out",
    output,
    source,
  ],
  { env: signingEnv },
);
run(java, ["-jar", signer, "verify", "--verbose", output]);
console.log("APK local firmado: " + output);
