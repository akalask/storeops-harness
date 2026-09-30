const modules = ["activities", "programmes", "staff", "alerts", "reports"];
const forbidden = [];

for (const sourceModule of modules) {
  const otherModules = modules.filter((moduleName) => moduleName !== sourceModule);

  forbidden.push({
    name: `module-boundary-${sourceModule}`,
    comment: "Modules may not import another module's repository directly.",
    severity: "error",
    from: { path: `^src/${sourceModule}/` },
    to: { path: `^src/(?:${otherModules.join("|")})/repository\\.ts$` },
  });

  const disallowedServices = otherModules.filter((moduleName) => moduleName !== "staff");
  forbidden.push({
    name: `event-bus-only-${sourceModule}`,
    comment: "Cross-module service side effects must use EventBus; staff is the read-only exception.",
    severity: "error",
    from: { path: `^src/${sourceModule}/service\\.ts$` },
    to: { path: `^src/(?:${disallowedServices.join("|")})/service\\.ts$` },
  });
}

forbidden.push(
  {
    name: "layer-separation-routes",
    comment: "Routes call services and must not import repositories.",
    severity: "error",
    from: { path: "^src/(?:activities|programmes|staff|alerts|reports)/routes\\.ts$" },
    to: { path: "^src/(?:activities|programmes|staff|alerts|reports)/repository\\.ts$" },
  },
  {
    name: "read-only-reports",
    comment: "Reports may not import another module's repository.",
    severity: "error",
    from: { path: "^src/reports/" },
    to: { path: "^src/(?:activities|programmes|staff|alerts)/repository\\.ts$" },
  }
);

module.exports = {
  forbidden,
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};