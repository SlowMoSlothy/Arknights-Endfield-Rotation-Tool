let rotation = [null];
let selectedTeam = [null, null, null, null];
let activeSlotIndex = null;

let skillSourceSortables = [];
let slotSortables = [];
let isDraggingSkill = false;

let operatorUltimateStates = {};

let showEnemyPanel = false;
let useSupabaseOperators = true;
let builderWatermarkUrl = "https://slowmoslothy.github.io/Arknights-Endfield-Rotation-Tool/";

let operatorFilterState = {
    search: "",
    star: "all",
    operatorClass: "all",
    element: "all"
};
