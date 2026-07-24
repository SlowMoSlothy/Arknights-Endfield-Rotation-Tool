let rotation = [null];
let selectedTeam = [null, null, null, null];
let activeSlotIndex = null;
let operators = [];
let weapons = [];
let weaponEssenceProfiles = [];
let simulationTriggerEvents = [];
let simulationActionRules = [];
let operatorPassiveRules = [];
let operatorForms = [];
let operatorFormActionVariants = [];
let operatorLoadouts = {};

let skillSourceSortables = [];
let slotSortables = [];
let isDraggingSkill = false;

let operatorUltimateStates = {};

let showEnemyPanel = true;
let useSupabaseOperators = true;
let builderWatermarkUrl = "https://rotationforge.gg/endfield";

let operatorFilterState = {
    search: "",
    star: "all",
    operatorClass: "all",
    element: "all"
};
