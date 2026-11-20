let plannerCoreDataRequest = null;
let simulationDataRequest = null;
let simulationDataLoadStatus = "idle";
let builderStartupStartedAt = 0;
const builderStartupMetrics = { coreDataMs: 0, simulationDataMs: 0 };

function builderStartupNow() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function startBuilderStartupMeasurement() {
    builderStartupStartedAt = builderStartupNow();
    if (typeof performance !== "undefined" && typeof performance.mark === "function") performance.mark("rotationforge.builder.start");
}

function finishBuilderStartupMeasurement(ready) {
    const now = builderStartupNow();
    const metrics = {
        ...builderStartupMetrics,
        initializationMs: Math.max(0, Math.round(now - builderStartupStartedAt)),
        navigationToReadyMs: typeof performance !== "undefined" && typeof performance.now === "function" ? Math.round(now) : null,
        status: ready ? "ready" : "failed",
        mode: typeof uiSettings !== "undefined" ? uiSettings.timelineMode : "slot"
    };
    window.rotationForgeStartupMetrics = metrics;
    if (typeof performance !== "undefined" && typeof performance.measure === "function" && typeof performance.mark === "function") {
        performance.mark("rotationforge.builder.ready");
        performance.measure("rotationforge.builder.initialization", "rotationforge.builder.start", "rotationforge.builder.ready");
    }
    console.info("RF_STARTUP", JSON.stringify(metrics));
}

async function runBuilderDataLoads(loaders) {
    // Wait for every started request before surfacing an unexpected failure or allowing a retry.
    const results = await Promise.allSettled(loaders.map(load => Promise.resolve().then(load)));
    const failures = results.filter(result => result.status === "rejected");
    failures.forEach(result => console.error("Builder data loading failed:", result.reason));
    if (failures.length) throw failures[0].reason;
}

function hydratePlannerCoreData() {
    if (plannerCoreDataRequest) return plannerCoreDataRequest;
    const startedAt = builderStartupNow();
    plannerCoreDataRequest = runBuilderDataLoads([
        () => typeof hydrateDebuffRegistryFromSupabase === "function" && hydrateDebuffRegistryFromSupabase(),
        () => typeof hydrateBuffRegistryFromSupabase === "function" && hydrateBuffRegistryFromSupabase(),
        () => typeof hydrateReactionRulesFromSupabase === "function" && hydrateReactionRulesFromSupabase(),
        () => typeof hydrateEffectGroupsFromSupabase === "function" && hydrateEffectGroupsFromSupabase(),
        () => typeof hydrateOperatorFormsFromSupabase === "function" && hydrateOperatorFormsFromSupabase(),
        // Equipment catalogs must be available before normalizing existing saved loadouts.
        () => typeof hydrateGearFromSupabase === "function" && hydrateGearFromSupabase(),
        () => typeof hydrateOperatorsFromSupabase === "function" && hydrateOperatorsFromSupabase(),
        () => typeof hydrateEnemyDatabaseFromSupabase === "function" && hydrateEnemyDatabaseFromSupabase()
    ]).then(() => {
        builderStartupMetrics.coreDataMs = Math.round(builderStartupNow() - startedAt);
    }).catch(error => {
        plannerCoreDataRequest = null;
        throw error;
    });
    return plannerCoreDataRequest;
}

function getSimulationDataLoadStatus() {
    return simulationDataLoadStatus;
}

function ensureSimulationDataLoaded() {
    if (simulationDataLoadStatus === "ready") return Promise.resolve(true);
    if (simulationDataRequest) return simulationDataRequest;
    simulationDataLoadStatus = "loading";
    if (typeof updateSettingsUi === "function") updateSettingsUi();
    const startedAt = builderStartupNow();
    simulationDataRequest = runBuilderDataLoads([
        () => typeof hydrateInflictionMechanicsFromSupabase === "function" && hydrateInflictionMechanicsFromSupabase(),
        () => typeof hydrateSimulationTriggerEventsFromSupabase === "function" && hydrateSimulationTriggerEventsFromSupabase(),
        () => typeof hydrateSimulationActionRulesFromSupabase === "function" && hydrateSimulationActionRulesFromSupabase(),
        () => typeof hydrateOperatorPassiveRulesFromSupabase === "function" && hydrateOperatorPassiveRulesFromSupabase()
    ]).then(() => {
        simulationDataLoadStatus = "ready";
        builderStartupMetrics.simulationDataMs = Math.round(builderStartupNow() - startedAt);
        if (window.rotationForgeStartupMetrics) window.rotationForgeStartupMetrics.simulationDataMs = builderStartupMetrics.simulationDataMs;
        console.info("RF_SIMULATION_DATA", JSON.stringify({ loadMs: builderStartupMetrics.simulationDataMs }));
        return true;
    }).catch(error => {
        simulationDataLoadStatus = "error";
        throw error;
    }).finally(() => {
        simulationDataRequest = null;
        if (typeof updateSettingsUi === "function") updateSettingsUi();
    });
    return simulationDataRequest;
}
